import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Ambulance, LocateFixed, Phone, RefreshCw, Siren } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import SmallMap, { type MapMarker } from "@/components/ui/smallMap";
import { BottomNav } from "@/components/BottomNav";
import { PlaceCard } from "@/components/PlaceCard";
import { api, errorMessage } from "@/lib/api";
import { useCurrentLocation } from "@/lib/location";
import type { NearbyHospitals } from "@/types/api";

type Filter = "all" | "government" | "private";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "government", label: "Government" },
  { key: "private", label: "Private" },
  { key: "all", label: "All" },
];

const Emergency: React.FC = () => {
  const navigate = useNavigate();
  const { location, retry } = useCurrentLocation();
  const [filter, setFilter] = useState<Filter>("all");
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [sliderKm, setSliderKm] = useState([10]);
  const [radiusKm, setRadiusKm] = useState(10); // applied when the slider is released
  const [data, setData] = useState<NearbyHospitals | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const coords = location.status === "ready" ? location.coords : null;

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .nearbyHospitals({ ...coords, radiusKm, type: filter, emergencyOnly })
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [coords, radiusKm, filter, emergencyOnly, reloadKey]);

  const markers = useMemo<MapMarker[]>(
    () =>
      (data?.hospitals ?? []).map((h) => ({ id: h.id, lat: h.location.lat, lng: h.location.lng, label: h.name, tone: h.ownership })),
    [data],
  );

  return (
    <div className="whole-container pb-28!">
      <h1 className="text-xl font-semibold">Hospitals near you</h1>
      <p className="text-sm text-muted-foreground">Live government and private hospitals around you</p>

      {/* Emergency actions */}
      <div className="mt-4 rounded-2xl p-4 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50">
        <p className="font-semibold flex items-center gap-2">
          <Siren size={18} className="text-red-600" /> Medical emergency?
        </p>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <a href="tel:108" className="h-11 rounded-xl bg-red-600 text-white! font-semibold flex items-center justify-center gap-2">
            <Phone size={16} /> Call 108
          </a>
          <button
            type="button"
            onClick={() => navigate("/AmbulanceBooking")}
            className="h-11 rounded-xl bg-white dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Ambulance size={16} /> Book ambulance
          </button>
        </div>
      </div>

      {location.status === "locating" && (
        <div className="mt-10 flex flex-col items-center gap-3 text-muted-foreground">
          <Spinner className="size-10 text-brand" />
          <p className="text-sm">Finding your location...</p>
        </div>
      )}

      {location.status === "error" && (
        <div className="mt-6 rounded-2xl p-4 bg-muted text-center">
          <LocateFixed className="mx-auto text-brand" />
          <p className="text-sm mt-2">{location.message}</p>
          <button type="button" onClick={retry} className="mt-3 px-4 h-10 rounded-xl bg-brand text-white text-sm font-semibold cursor-pointer">
            Try again
          </button>
        </div>
      )}

      {coords && (
        <>
          <div className="mt-4">
            <SmallMap center={coords} markers={markers} onSelect={(id) => navigate(`/hospital/${id}`)} />
            {location.status === "ready" && location.source === "home" && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Showing hospitals near your saved home address. Turn on location for your current position.
              </p>
            )}
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-3 gap-1 p-1 rounded-xl bg-muted">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`h-9 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                  filter === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {label}
                {data && <span className="ml-1 text-xs opacity-70">{data.counts[key]}</span>}
              </button>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer w-fit">
            <input type="checkbox" checked={emergencyOnly} onChange={(e) => setEmergencyOnly(e.target.checked)} className="size-4 accent-red-600" />
            Only hospitals listed with 24/7 emergency
          </label>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Distance</span>
              <span className="text-brand font-semibold">within {sliderKm[0]} km</span>
            </div>
            <Slider value={sliderKm} onValueChange={setSliderKm} onValueCommit={(v) => setRadiusKm(v[0])} min={1} max={50} step={1} />
          </div>

          {/* Results */}
          <div className="mt-5 flex flex-col gap-3">
            {loading && !data && (
              <div className="py-8 flex justify-center">
                <Spinner className="size-10 text-brand" />
              </div>
            )}
            {error && (
              <div className="rounded-2xl p-4 bg-muted text-center">
                <p className="text-sm">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="mt-3 inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-brand text-white text-sm font-semibold cursor-pointer"
                >
                  <RefreshCw size={15} /> Try again
                </button>
              </div>
            )}
            {data && !error && (
              <>
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  {loading && <Spinner className="size-3.5" />}
                  {data.hospitals.length
                    ? `Nearest ${data.hospitals.length} of ${data.counts[filter]} hospitals within ${data.radiusKm} km`
                    : `No hospitals found within ${data.radiusKm} km. Try a larger distance.`}
                </p>
                {data.hospitals.map((h) => (
                  <PlaceCard key={h.id} place={h} />
                ))}
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  Live data from{" "}
                  <a href={data.source.url} target="_blank" rel="noreferrer" className="underline">
                    {data.source.attribution}
                  </a>
                  . Please call before visiting.
                </p>
              </>
            )}
          </div>

          <Link to="/suggestion" className="mt-5 block text-center text-sm text-brand font-medium">
            See doctors for your health conditions →
          </Link>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default Emergency;
