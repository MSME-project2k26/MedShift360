import { Link } from "react-router-dom";
import { Landmark, Building2, MapPin, Navigation, Phone, Siren, Stethoscope } from "lucide-react";
import type { Place } from "@/types/api";
import { cn, telHref } from "@/lib/utils";

/** "Government" / "Private" chip. Ownership not tagged in the map data reads as "Likely private". */
export function OwnershipBadge({ place }: { place: Place }) {
  const government = place.ownership === "government";
  const Icon = government ? Landmark : Building2;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full",
        government
          ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-400"
          : "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
      )}
    >
      <Icon size={12} />
      {government ? "Government" : place.ownershipSource === "assumed" ? "Likely private" : "Private"}
    </span>
  );
}

export function EmergencyBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400">
      <Siren size={12} /> 24/7 Emergency
    </span>
  );
}

/** Card for a hospital or clinic: distance, name, badges, address and Call / Directions buttons. */
export function PlaceCard({ place, note }: { place: Place; note?: string }) {
  const isHospital = place.kind === "hospital";
  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <Link to={`/hospital/${place.id}`} className="flex gap-3 text-foreground!">
        <span className="w-11 h-11 shrink-0 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
          {isHospital ? <Building2 size={20} /> : <Stethoscope size={20} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight">{place.name}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {place.distanceKm !== null && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand">
                {place.distanceKm} km
              </span>
            )}
            {isHospital && <OwnershipBadge place={place} />}
            {place.emergency && <EmergencyBadge />}
          </div>
          {place.address && (
            <p className="text-xs text-muted-foreground mt-2 flex gap-1">
              <MapPin size={13} className="shrink-0 mt-px" />
              <span className="line-clamp-2">{place.address}</span>
            </p>
          )}
          {note && <p className="text-xs text-muted-foreground mt-1">{note}</p>}
        </div>
      </Link>
      <div className="grid grid-cols-2 gap-2 mt-3">
        {place.phone ? (
          <a
            href={telHref(place.phone)}
            className="h-10 rounded-xl bg-brand text-white! text-sm font-semibold flex items-center justify-center gap-1.5"
          >
            <Phone size={15} /> Call
          </a>
        ) : (
          <span className="h-10 rounded-xl bg-muted text-muted-foreground text-xs flex items-center justify-center text-center px-2">
            Phone not listed
          </span>
        )}
        <a
          href={place.directionsUrl}
          target="_blank"
          rel="noreferrer"
          className="h-10 rounded-xl bg-brand-soft text-brand! text-sm font-semibold flex items-center justify-center gap-1.5"
        >
          <Navigation size={15} /> Directions
        </a>
      </div>
    </div>
  );
}
