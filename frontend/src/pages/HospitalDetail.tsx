import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Accessibility, ArrowLeft, BedDouble, Clock, Globe, Mail, MapPin, Navigation, Phone, Siren, Stethoscope, Building2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import SmallMap from "@/components/ui/smallMap";
import { BottomNav } from "@/components/BottomNav";
import { EmergencyBadge, OwnershipBadge } from "@/components/PlaceCard";
import { telHref } from "@/lib/utils";
import { api, errorMessage } from "@/lib/api";
import { useCurrentLocation } from "@/lib/location";
import type { HospitalDetailResult } from "@/types/api";

/** "multi speciality" / "cardiac_surgery" -> "Multi speciality" / "Cardiac surgery" */
const prettify = (value: string) => {
  const text = value.trim().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const KIND_LABEL = { hospital: "Hospital", clinic: "Clinic", doctor: "Doctor's clinic", dentist: "Dental clinic" };

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <span className="text-brand mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium wrap-break-word">{children}</div>
      </div>
    </div>
  );
}

const HospitalDetail: React.FC = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { location } = useCurrentLocation();
  const [data, setData] = useState<HospitalDetailResult | null>(null);
  const [error, setError] = useState("");

  // Wait for the location fix (or its failure) so the distance can be shown
  const from = location.status === "ready" ? location.coords : null;
  const located = location.status !== "locating";

  useEffect(() => {
    if (!located) return;
    let cancelled = false;
    api
      .hospital(id, from)
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [id, from, located]);

  const back = (
    <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-brand cursor-pointer">
      <ArrowLeft size={16} /> Back
    </button>
  );

  if (!data) {
    return (
      <div className="whole-container">
        {back}
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          {error ? <p className="form-error">{error}</p> : <Spinner className="size-12 text-brand" />}
        </div>
        <BottomNav />
      </div>
    );
  }

  const h = data.hospital;
  const phones = h.phone ? h.phone.split(/[;,/]/).map((p) => p.trim()).filter(Boolean) : [];

  return (
    <div className="whole-container pb-28!">
      {back}

      <div className="mt-4 flex gap-3">
        <span className="w-14 h-14 shrink-0 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">
          {h.kind === "hospital" ? <Building2 size={26} /> : <Stethoscope size={26} />}
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold leading-tight">{h.name}</h1>
          {h.localName && <p className="text-sm text-muted-foreground">{h.localName}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted">{KIND_LABEL[h.kind]}</span>
            {h.kind === "hospital" && <OwnershipBadge place={h} />}
            {h.emergency && <EmergencyBadge />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-5">
        {phones.length ? (
          <a href={telHref(phones[0])} className="h-11 rounded-xl bg-brand text-white! font-semibold flex items-center justify-center gap-2">
            <Phone size={16} /> Call
          </a>
        ) : (
          <a href="tel:108" className="h-11 rounded-xl bg-red-600 text-white! font-semibold flex items-center justify-center gap-2">
            <Siren size={16} /> Call 108
          </a>
        )}
        <a
          href={h.directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="h-11 rounded-xl bg-brand-soft text-brand! font-semibold flex items-center justify-center gap-2"
        >
          <Navigation size={16} /> Directions
        </a>
      </div>

      <SmallMap center={h.location} className="mt-4" />

      <div className="mt-4 rounded-2xl bg-card border border-border p-4 divide-y divide-border">
        <InfoRow icon={<MapPin size={18} />} label={h.distanceKm !== null ? `Address · ${h.distanceKm} km away` : "Address"}>
          {h.address || [h.district, h.state, h.pincode].filter(Boolean).join(", ") || "Not listed"}
        </InfoRow>
        {phones.length > 0 && (
          <InfoRow icon={<Phone size={18} />} label="Phone">
            <div className="flex flex-col">
              {phones.map((p) => (
                <a key={p} href={telHref(p)} className="text-brand!">{p}</a>
              ))}
            </div>
          </InfoRow>
        )}
        {h.emergencyPhone && (
          <InfoRow icon={<Siren size={18} />} label="Emergency phone">
            <a href={telHref(h.emergencyPhone)} className="text-brand!">{h.emergencyPhone}</a>
          </InfoRow>
        )}
        {h.openingHours && (
          <InfoRow icon={<Clock size={18} />} label="Opening hours">
            {h.openingHours === "24/7" ? "Open 24 hours" : h.openingHours}
          </InfoRow>
        )}
        {h.beds !== null && (
          <InfoRow icon={<BedDouble size={18} />} label="Beds">{h.beds}</InfoRow>
        )}
        {h.specialities.length > 0 && (
          <InfoRow icon={<Stethoscope size={18} />} label="Specialities">
            <div className="flex flex-wrap gap-1.5 mt-1">
              {h.specialities.map((s) => (
                <span key={s} className="text-xs px-2 py-1 rounded-lg bg-brand-soft text-brand">{prettify(s)}</span>
              ))}
            </div>
          </InfoRow>
        )}
        {h.wheelchair && (
          <InfoRow icon={<Accessibility size={18} />} label="Wheelchair access">
            {h.wheelchair === "yes" ? "Yes" : h.wheelchair === "no" ? "No" : prettify(h.wheelchair)}
          </InfoRow>
        )}
        {h.website && (
          <InfoRow icon={<Globe size={18} />} label="Website">
            <a href={h.website.startsWith("http") ? h.website : `https://${h.website}`} target="_blank" rel="noreferrer" className="text-brand!">
              {h.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          </InfoRow>
        )}
        {h.email && (
          <InfoRow icon={<Mail size={18} />} label="Email">
            <a href={`mailto:${h.email}`} className="text-brand!">{h.email}</a>
          </InfoRow>
        )}
        {h.operator && <InfoRow icon={<Building2 size={18} />} label="Run by">{h.operator}</InfoRow>}
      </div>

      {h.description && <p className="mt-4 text-sm text-muted-foreground">{h.description}</p>}

      <p className="text-[11px] text-muted-foreground text-center mt-5">
        {h.ownershipSource === "assumed" && "Ownership is not listed for this hospital. "}
        Details from{" "}
        <a href={h.osmUrl} target="_blank" rel="noreferrer" className="underline">{data.source.attribution}</a>. Please call to
        confirm before visiting.
      </p>

      <BottomNav />
    </div>
  );
};

export default HospitalDetail;
