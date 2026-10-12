import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Siren, Sparkles, MapPin, ChevronRight, CalendarDays, X, Stethoscope, Building2 } from "lucide-react";
import { FaCapsules, FaHospital } from "react-icons/fa";
import { IoDocumentText } from "react-icons/io5";
import { RiRobot2Line } from "react-icons/ri";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomNav } from "@/components/BottomNav";
import { OwnershipBadge } from "@/components/PlaceCard";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCurrentLocation } from "@/lib/location";
import { initials } from "@/lib/utils";
import type { Place } from "@/types/api";

/** A suggested clinic with the kind of doctor it was picked for */
type SuggestedDoctor = Place & { doctorTitle: string };

/** e.g. "28 Sept 2026" for the date `days` days before today */
function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

// Sample appointments until the bookings API exists. Dates are relative to
// today so the section always looks recent. Newest first.
const recentActivity = [
  { id: 3, hospital: "MGM Hospital", visit: "Thyroid Checkup", date: daysAgo(2) },
  { id: 2, hospital: "Apollo Hospital", visit: "Cardiac Checkup", date: daysAgo(6) },
  { id: 1, hospital: "MGM Hospital", visit: "General Checkup", date: daysAgo(13) },
];

const quickActions = [
  { to: "/hospital", label: "Hospitals", icon: FaHospital },
  { to: "/pharmacy", label: "Pharmacy", icon: FaCapsules },
  { to: "/insurance", label: "Insurance", icon: IoDocumentText },
  { to: "/AiAssistant", label: "AI Help", icon: RiRobot2Line },
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function SectionHeader({ title, to }: { title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mt-7 mb-3">
      <h2 className="font-semibold text-base">{title}</h2>
      {to && (
        <Link to={to} className="text-sm text-brand flex items-center">
          See all <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}

function SectionStatus({ loading, text }: { loading: boolean; text: string }) {
  return (
    <p className="text-sm text-muted-foreground flex items-center gap-2">
      {loading && <Spinner className="size-4 text-brand" />}
      {text}
    </p>
  );
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { location } = useCurrentLocation();
  const [hospitals, setHospitals] = useState<Place[] | null>(null);
  const [doctors, setDoctors] = useState<SuggestedDoctor[] | null>(null);

  const from = location.status === "ready" ? location.coords : null;
  const located = location.status !== "locating";

  // Live nearby hospitals and doctors for the patient's conditions; failures just leave the section empty
  useEffect(() => {
    if (!located) return;
    let cancelled = false;
    if (from) {
      api
        .nearbyHospitals({ ...from, radiusKm: 10, limit: 10 })
        .then((r) => !cancelled && setHospitals(r.hospitals))
        .catch(() => !cancelled && setHospitals([]));
    } else {
      setHospitals([]);
    }
    api
      .suggestedDoctors(from, 10)
      .then((r) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const list: SuggestedDoctor[] = [];
        for (const s of r.suggestions) {
          for (const d of s.doctors.slice(0, 3)) {
            if (!seen.has(d.id)) list.push({ ...d, doctorTitle: s.specialty.doctorTitle });
            seen.add(d.id);
          }
        }
        setDoctors(list);
      })
      .catch(() => !cancelled && setDoctors([]));
    return () => {
      cancelled = true;
    };
  }, [from, located]);

  useEffect(() => {
    if (open) {
      // Redirect after 5 seconds
      const timer = setTimeout(() => {
        navigate("/AmbulanceBooking");
      }, 5000);

      // Cleanup if dialog is closed before timeout
      return () => clearTimeout(timer);
    }
  }, [open, navigate]);

  const q = query.trim().toLowerCase();
  const matchedHospitals = (hospitals ?? []).filter(
    (h) => !q || `${h.name} ${h.address ?? ""} ${h.ownership}`.toLowerCase().includes(q),
  );
  const matchedDoctors = (doctors ?? []).filter(
    (d) => !q || `${d.name} ${d.doctorTitle} ${d.address ?? ""}`.toLowerCase().includes(q),
  );
  const firstName = user?.fullName.split(" ")[0] ?? "";

  return (
    <div className="whole-container pb-28!">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="text-xl font-semibold">{firstName || "Welcome"}</h1>
        </div>
        <Link
          to="/profile"
          aria-label="Profile"
          className="w-11 h-11 rounded-full bg-brand-soft text-brand! font-semibold flex items-center justify-center"
        >
          {user ? initials(user.fullName) : null}
        </Link>
      </div>

      {/* Search */}
      <label className="mt-5 flex items-center gap-2 h-12 px-4 rounded-xl bg-muted text-muted-foreground focus-within:ring-2 focus-within:ring-brand">
        <Search size={18} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search hospitals, doctors..."
          className="flex-1 bg-transparent outline-none border-0! shadow-none! text-foreground placeholder:text-muted-foreground text-[15px] [&::-webkit-search-cancel-button]:appearance-none"
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="cursor-pointer">
            <X size={18} />
          </button>
        )}
      </label>

      {!q && (
        <>
          {/* Emergency */}
          <div className="mt-5 rounded-2xl p-4 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/50 flex items-center gap-4">
            <div className="w-12 h-12 shrink-0 rounded-full bg-red-600 text-white flex items-center justify-center">
              <Siren size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">Medical emergency?</p>
              <p className="text-sm text-muted-foreground">Get the nearest ambulance now</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold cursor-pointer active:scale-95 transition-transform"
            >
              SOS
            </button>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {quickActions.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="flex flex-col items-center gap-2 text-foreground!">
                <span className="w-14 h-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">
                  <Icon size={22} />
                </span>
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
          </div>

          {/* AI assistant */}
          <Link
            to="/AiAssistant"
            className="mt-6 rounded-2xl p-4 flex items-center gap-4 text-white! bg-linear-to-br from-brand to-brand-strong"
          >
            <div className="flex-1">
              <p className="font-semibold flex items-center gap-2"><Sparkles size={16} /> Stay healthy with AI</p>
              <p className="text-sm text-white/80 mt-1">Get personalised health suggestions</p>
            </div>
            <span className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ChevronRight size={20} />
            </span>
          </Link>

          {/* Recent activity */}
          <SectionHeader title="Recent Activity" />
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-1">
            {recentActivity.map((item) => (
              <div key={item.id} className="snap-start shrink-0 w-60 rounded-2xl p-4 bg-card border border-border">
                <p className="font-semibold">{item.hospital}</p>
                <p className="text-sm text-muted-foreground">{item.visit}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg bg-brand-soft text-brand">
                  <CalendarDays size={14} /> {item.date}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hospitals */}
      <SectionHeader title={q ? `Hospitals (${matchedHospitals.length})` : "Hospitals Near You"} to="/hospital" />
      {hospitals === null ? (
        <SectionStatus loading text="Finding hospitals near you..." />
      ) : matchedHospitals.length === 0 ? (
        <SectionStatus
          loading={false}
          text={q ? `No hospitals match "${query}".` : from ? "No hospitals found within 10 km." : "Turn on location to see hospitals near you."}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-1">
          {matchedHospitals.map((hospital) => (
            <button
              key={hospital.id}
              type="button"
              onClick={() => navigate(`/hospital/${hospital.id}`)}
              className="snap-start shrink-0 w-64 text-left rounded-2xl overflow-hidden bg-card border border-border cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="h-20 bg-brand-soft text-brand flex items-center justify-center">
                <FaHospital size={30} />
              </div>
              <div className="p-3">
                <p className="font-semibold leading-tight line-clamp-2">{hospital.name}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 shrink-0"><MapPin size={13} /> {hospital.distanceKm} km</span>
                  <OwnershipBadge place={hospital} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Doctors */}
      <SectionHeader title={q ? `Doctors (${matchedDoctors.length})` : "Suggested Doctors"} to="/suggestion" />
      {doctors === null ? (
        <SectionStatus loading text="Finding doctors for your health conditions..." />
      ) : matchedDoctors.length === 0 ? (
        <SectionStatus loading={false} text={q ? `No doctors match "${query}".` : "No doctors found near you yet."} />
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-1">
          {matchedDoctors.map((doctor) => (
            <button
              key={doctor.id}
              type="button"
              onClick={() => navigate(`/hospital/${doctor.id}`)}
              className="snap-start shrink-0 w-40 rounded-2xl p-3 bg-card border border-border flex flex-col items-center text-center cursor-pointer active:scale-[0.98] transition-transform"
            >
              <span className="w-14 h-14 rounded-full bg-brand-soft text-brand flex items-center justify-center">
                {doctor.kind === "hospital" ? <Building2 size={24} /> : <Stethoscope size={24} />}
              </span>
              <p className="font-semibold text-sm mt-2 leading-tight line-clamp-2">{doctor.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{doctor.doctorTitle}</p>
              <p className="text-xs font-semibold text-brand mt-1">{doctor.distanceKm} km</p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-xl text-center">Emergency Ambulance Booking</DialogTitle>

            <div className="flex justify-center mt-3">
              <Spinner className="size-12 text-red-600" />
            </div>

            <DialogDescription className="text-center mt-2">
              Please wait while we process your request.
              <br /><span className="text-sm">(Redirecting in 5 seconds)</span>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-center items-center sm:justify-center">
            <DialogClose asChild>
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Home;
