import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { IoMdFingerPrint } from "react-icons/io";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/utils";
import { useThemePreference } from "@/lib/theme";
import type { ThemePreference } from "@/lib/theme";

import "../App.css";

const THEMES: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

const Settings = () => {
  const navigate = useNavigate();
  const { user, aadhaar, signOut } = useAuth();
  const [theme, setTheme] = useThemePreference();

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="whole-container">
      <div className="flex items-center gap-2 pb-5">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted cursor-pointer"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-semibold text-lg">Settings</h1>
      </div>

      {user && (
        <section className="bg-card border border-border rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-brand-soft text-brand font-semibold flex items-center justify-center">
            {initials(user.fullName)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold truncate">{user.fullName}</span>
            <span className="text-sm text-muted-foreground truncate">{user.phone ?? user.email}</span>
          </div>
        </section>
      )}

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">Appearance</h2>
      <section className="bg-card border border-border rounded-2xl p-4 mb-6">
        <p className="font-medium mb-3">Theme</p>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-xl">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={theme === value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                theme === value ? "bg-card text-brand font-semibold shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      </section>

      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">Security</h2>
      <section className="bg-card border border-border rounded-2xl mb-6">
        <Link to="/aadhaar" className="flex items-center gap-3 p-4 text-foreground!">
          <span className="text-2xl text-brand"><IoMdFingerPrint /></span>
          <span className="flex-1 font-medium">Aadhaar verification</span>
          {aadhaar?.isVerified ? (
            <Badge className="bg-green-600 text-white rounded-full">Verified</Badge>
          ) : (
            <Badge className="bg-amber-500 text-white rounded-full">Not verified</Badge>
          )}
          <ChevronRight size={18} className="text-muted-foreground" />
        </Link>
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-border bg-card text-destructive font-semibold cursor-pointer"
      >
        <LogOut size={18} /> Logout
      </button>

      <p className="text-center text-xs text-muted-foreground mt-6">MedShift360</p>
    </div>
  );
};

export default Settings;
