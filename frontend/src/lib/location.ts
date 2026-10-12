import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LatLng } from "@/types/api";

export type LocationSource = "device" | "home";

export type LocationState =
  | { status: "locating" }
  | { status: "ready"; coords: LatLng; source: LocationSource }
  | { status: "error"; message: string };

const CACHE_KEY = "ms360.lastLocation";
// Reuse a fix for a few minutes so moving between pages does not wait for GPS again
const FRESH_MS = 5 * 60 * 1000;

interface CachedLocation {
  coords: LatLng;
  source: LocationSource;
  at: number;
}

function readCache(): CachedLocation | null {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null") as CachedLocation | null;
    return cached && Date.now() - cached.at < FRESH_MS ? cached : null;
  } catch {
    return null;
  }
}

function writeCache(coords: LatLng, source: LocationSource) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ coords, source, at: Date.now() }));
  } catch {
    // Storage unavailable (private mode); the location is simply not reused
  }
}

function devicePosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  });
}

/** The saved home location from the profile, if the patient added one. */
async function homeLocation(): Promise<LatLng | null> {
  try {
    const { profile } = await api.getProfile();
    if (profile.homeLatitude === null || profile.homeLongitude === null) return null;
    return { lat: Number(profile.homeLatitude), lng: Number(profile.homeLongitude) };
  } catch {
    return null;
  }
}

/**
 * The patient's current location: the phone's GPS first, then the home location saved in the profile.
 * `retry` asks again (for example after the patient turns location on).
 */
export function useCurrentLocation() {
  const [state, setState] = useState<LocationState>(() => {
    const cached = readCache();
    return cached ? { status: "ready", coords: cached.coords, source: cached.source } : { status: "locating" };
  });

  const locate = useCallback(async () => {
    setState({ status: "locating" });
    try {
      const coords = await devicePosition();
      writeCache(coords, "device");
      setState({ status: "ready", coords, source: "device" });
      return;
    } catch {
      // Permission denied, no GPS, or not a secure (https) page; fall back to home
    }
    const home = await homeLocation();
    if (home) {
      writeCache(home, "home");
      setState({ status: "ready", coords: home, source: "home" });
    } else {
      setState({
        status: "error",
        message: "Turn on location access for this site to find hospitals near you, then try again.",
      });
    }
  }, []);

  useEffect(() => {
    if (!readCache()) void locate();
  }, [locate]);

  return { location: state, retry: locate };
}
