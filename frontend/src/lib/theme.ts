import { useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

// Keep in sync with the pre-paint script in index.html
const STORAGE_KEY = "ms360.theme";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // Storage blocked (private mode); fall through to the default
  }
  return "light";
}

function applyTheme(preference: ThemePreference) {
  const dark = preference === "dark" || (preference === "system" && darkQuery.matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0f1419" : "#ffffff");
}

export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Not persisted, but still applied for this visit
  }
  applyTheme(preference);
}

/** Apply the saved theme and follow OS changes while "system" is selected. */
export function initTheme() {
  applyTheme(getThemePreference());
  darkQuery.addEventListener("change", () => {
    if (getThemePreference() === "system") applyTheme("system");
  });
}

export function useThemePreference() {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference);

  useEffect(() => {
    setThemePreference(preference);
  }, [preference]);

  return [preference, setPreference] as const;
}
