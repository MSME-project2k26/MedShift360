import { NavLink } from "react-router-dom";
import { IoHome, IoDocumentText } from "react-icons/io5";
import { FaCapsules, FaHospital } from "react-icons/fa";

const ITEMS = [
  { to: "/home", label: "Home", icon: IoHome },
  { to: "/hospital", label: "Hospitals", icon: FaHospital },
  { to: "/pharmacy", label: "Pharmacy", icon: FaCapsules },
  { to: "/insurance", label: "Insurance", icon: IoDocumentText },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-card/95 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-[480px] mx-auto grid grid-cols-4">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? "text-brand!" : "text-muted-foreground!"
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
