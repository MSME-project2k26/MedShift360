import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Smartphone } from "lucide-react";

// Tablets and desktops. Landscape phones are wide but short, so they still get the app.
const LARGE_SCREEN = "(min-width: 768px) and (min-height: 600px)";

/** The app is designed for phones only; larger screens get a notice instead. */
export function MobileOnly({ children }: { children: ReactNode }) {
  const [isLarge, setIsLarge] = useState(() => window.matchMedia(LARGE_SCREEN).matches);

  useEffect(() => {
    const query = window.matchMedia(LARGE_SCREEN);
    const onChange = () => setIsLarge(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  if (!isLarge) return <>{children}</>;

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-background">
      <div className="max-w-sm text-center flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] flex items-center justify-center">
          <Smartphone size={40} />
        </div>
        <h1 className="text-2xl font-semibold">Open MedShift360 on your phone</h1>
        <p className="text-muted-foreground">
          This app is designed for mobile screens only. Please open it on your phone, or make this
          window narrower (under 768px) to continue.
        </p>
      </div>
    </div>
  );
}
