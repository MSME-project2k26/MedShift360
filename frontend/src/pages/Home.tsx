import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Siren, Sparkles, Star, MapPin, BedDouble, ChevronRight, CalendarDays, X } from "lucide-react";
import { FaCapsules, FaHospital } from "react-icons/fa";
import { IoDocumentText } from "react-icons/io5";
import { RiRobot2Line } from "react-icons/ri";
import hospitalData from "../data/hospital.json";
import doctorData from "../data/doctor.json";
import type { Doctor } from "../types/Doctor";
import type { Hospital } from "../types/Hospital";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { initials } from "@/lib/utils";

const doctors: Doctor[] = doctorData;
const hospitals: Hospital[] = hospitalData;

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

/** Hospital photo with a branded placeholder when the image fails to load. */
function HospitalImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="h-32 bg-brand-soft text-brand flex items-center justify-center">
        <FaHospital size={36} />
      </div>
    );
  }
  return <img className="h-32 w-full object-cover" src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

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
  const matchedHospitals = hospitals.filter((h) => !q || `${h.name} ${h.location} ${h.type}`.toLowerCase().includes(q));
  const matchedDoctors = doctors.filter((d) => !q || `${d.name} ${d.specialization} ${d.hospital}`.toLowerCase().includes(q));
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
      {matchedHospitals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hospitals match "{query}".</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-1">
          {matchedHospitals.map((hospital) => (
            <button
              key={hospital.id}
              type="button"
              onClick={() => navigate(`/hospital/${hospital.id}`)}
              className="snap-start shrink-0 w-64 text-left rounded-2xl overflow-hidden bg-card border border-border cursor-pointer active:scale-[0.98] transition-transform"
            >
              <HospitalImage src={hospital.image} alt={hospital.name} />
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-tight">{hospital.name}</p>
                  <span className="flex items-center gap-1 text-xs font-semibold shrink-0">
                    <Star size={13} className="fill-amber-400 text-amber-400" /> {hospital.rating}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={13} /> {hospital.location} · {hospital.distance} km</span>
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                    <BedDouble size={13} /> {hospital.beds} beds
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Doctors */}
      <SectionHeader title={q ? `Doctors (${matchedDoctors.length})` : "Suggested Doctors"} />
      {matchedDoctors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No doctors match "{query}".</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-4 -mx-4 px-4 pb-1">
          {matchedDoctors.map((doctor) => (
            <div key={doctor.id} className="snap-start shrink-0 w-36 rounded-2xl p-3 bg-card border border-border flex flex-col items-center text-center">
              <img
                className="w-16 h-16 rounded-full object-cover bg-muted"
                src={doctor.image}
                alt={doctor.name}
                loading="lazy"
              />
              <p className="font-semibold text-sm mt-2 leading-tight">{doctor.name}</p>
              <p className="text-xs text-muted-foreground">{doctor.specialization}</p>
              <p className="flex items-center gap-1 text-xs font-semibold mt-1">
                <Star size={12} className="fill-amber-400 text-amber-400" /> {doctor.rating}
              </p>
            </div>
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
