import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";
import type { LatLng } from "@/types/api";

export interface MapMarker extends LatLng {
  id: string;
  label: string;
  tone: "government" | "private";
}

// Circle markers need no image files (Leaflet's default pin images break under Vite)
const TONES = {
  user: { color: "#ffffff", fillColor: "#13a4ec", radius: 8, weight: 3 },
  government: { color: "#ffffff", fillColor: "#16a34a", radius: 7, weight: 2 },
  private: { color: "#ffffff", fillColor: "#7c3aed", radius: 7, weight: 2 },
};

interface SmallMapProps {
  center: LatLng;
  markers?: MapMarker[];
  onSelect?: (id: string) => void;
  className?: string;
}

/** Map of the patient's location (blue) and nearby hospitals (green = government, purple = private). */
export default function SmallMap({ center, markers = [], onSelect, className }: SmallMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: true });
    map.attributionControl.setPrefix(false);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;
    layerRef.current = L.layerGroup().addTo(map);
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    for (const m of markers) {
      L.circleMarker([m.lat, m.lng], { ...TONES[m.tone], fillOpacity: 1 })
        .bindTooltip(m.label)
        .on("click", () => onSelectRef.current?.(m.id))
        .addTo(layer);
    }
    L.circleMarker([center.lat, center.lng], { ...TONES.user, fillOpacity: 1 }).bindTooltip("You are here").addTo(layer);

    const points = [center, ...markers.slice(0, 10)].map((p) => L.latLng(p.lat, p.lng));
    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [24, 24], maxZoom: 15 });
    else map.setView([center.lat, center.lng], 14);
  }, [center, markers]);

  return (
    <div className={cn("w-full h-44 rounded-2xl overflow-hidden border border-border z-0", className)}>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
