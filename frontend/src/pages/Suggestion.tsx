import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, HeartPulse, Info, LocateFixed, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { BottomNav } from "@/components/BottomNav";
import { PlaceCard } from "@/components/PlaceCard";
import { api, errorMessage } from "@/lib/api";
import { useCurrentLocation } from "@/lib/location";
import type { DoctorSuggestions, MatchedBy } from "@/types/api";

const MATCH_NOTE: Record<MatchedBy, string> = {
  speciality_tag: "Listed with this speciality",
  name: "Specialist clinic",
  multi_speciality: "Multi-speciality hospital",
  general: "General clinic",
};

/** Doctors, clinics and hospitals near the patient for the conditions in their profile. */
const Suggestion: React.FC = () => {
  const navigate = useNavigate();
  const { location, retry } = useCurrentLocation();
  const [data, setData] = useState<DoctorSuggestions | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const from = location.status === "ready" ? location.coords : null;
  const located = location.status !== "locating";

  useEffect(() => {
    if (!located) return;
    let cancelled = false;
    setError("");
    // Without a device location the backend falls back to the saved home location
    api
      .suggestedDoctors(from, 10)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [from, located, reloadKey]);

  return (
    <div className="whole-container pb-28!">
      <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-brand cursor-pointer">
        <ArrowLeft size={16} /> Back
      </button>
      <h1 className="text-xl font-semibold mt-3">Suggested doctors</h1>
      <p className="text-sm text-muted-foreground">Specialists near you for your health conditions</p>

      {!data && !error && (
        <div className="mt-16 flex flex-col items-center gap-3 text-muted-foreground">
          <Spinner className="size-10 text-brand" />
          <p className="text-sm">{located ? "Finding doctors near you..." : "Finding your location..."}</p>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-2xl p-4 bg-muted text-center">
          <LocateFixed className="mx-auto text-brand" />
          <p className="text-sm mt-2">{error}</p>
          <button
            type="button"
            onClick={() => (location.status === "error" ? retry() : setReloadKey((k) => k + 1))}
            className="mt-3 inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-brand text-white text-sm font-semibold cursor-pointer"
          >
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Conditions the suggestions are based on */}
          <div className="mt-4 rounded-2xl p-4 bg-brand-soft">
            <p className="text-sm font-semibold flex items-center gap-2">
              <HeartPulse size={16} className="text-brand" /> Your health conditions
            </p>
            {data.conditions.length ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {data.conditions.map((c) => (
                  <span key={c} className="text-xs px-2 py-1 rounded-lg bg-card">{c}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                None added yet. <Link to="/profile" className="text-brand!">Add them in your profile</Link> for specialist suggestions.
              </p>
            )}
            {data.location.source === "home" && (
              <p className="text-xs text-muted-foreground mt-2">Near your saved home address.</p>
            )}
          </div>

          {data.suggestions.map((s) => (
            <section key={s.specialty.key} className="mt-7">
              <h2 className="font-semibold">{s.specialty.doctorTitle}</h2>
              <p className="text-sm text-muted-foreground">{s.reason}</p>

              <div className="mt-3 flex flex-col gap-3">
                {s.doctors.map((d) => (
                  <PlaceCard key={d.id} place={d} note={MATCH_NOTE[d.matchedBy]} />
                ))}
                {s.doctors.length === 0 && (
                  <p className="text-sm text-muted-foreground rounded-2xl bg-muted p-3">
                    No {s.specialty.label.toLowerCase()} clinic is listed within {data.radiusKm} km. The hospitals below can help.
                  </p>
                )}
              </div>

              {s.hospitals.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">Hospitals</p>
                  <div className="flex flex-col gap-3">
                    {s.hospitals.map((h) => (
                      <PlaceCard key={h.id} place={h} note={MATCH_NOTE[h.matchedBy]} />
                    ))}
                  </div>
                </>
              )}
            </section>
          ))}

          <p className="mt-7 text-xs text-muted-foreground flex gap-2">
            <Info size={14} className="shrink-0 mt-0.5" /> {data.disclaimer}
          </p>
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            Live data from{" "}
            <a href={data.source.url} target="_blank" rel="noreferrer" className="underline">{data.source.attribution}</a>
          </p>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default Suggestion;
