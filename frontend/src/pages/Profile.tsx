import React, { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FaArrowRight, FaRegIdCard } from "react-icons/fa6";
import { IoHome, IoDocumentText } from "react-icons/io5";
import { FaCapsules, FaHospital } from "react-icons/fa";
import { LiaAllergiesSolid } from "react-icons/lia";
import { PiCrosshairDuotone } from "react-icons/pi";
import { Badge } from "@/components/ui/badge"
import { MdOutlineCoronavirus, MdOutlineHome, MdOutlineLightbulb, MdOutlineLocalHospital, MdOutlinePerson, MdOutlineShield, MdOutlineTimelapse, MdOutlineUploadFile } from "react-icons/md";
import { RiMedicineBottleLine } from "react-icons/ri";
import { LucideBellRing, Settings } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { api, errorMessage } from "@/lib/api";
import { initials } from "@/lib/utils";
import type { ProfileResult } from "@/types/api";

const NOT_ADDED = "Not added";

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
  prefer_not_to_say: "—",
};

const listOrEmpty = (items: string[]) => (items.length ? items.join(", ") : NOT_ADDED);

/** "+919876543210" -> "+91 98765 43210" */
const formatPhone = (phone: string) => phone.replace(/^\+91(\d{5})(\d{5})$/, "+91 $1 $2");

const Profile: React.FC = () => {
  const [data, setData] = useState<ProfileResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProfile().then(setData).catch((err) => setError(errorMessage(err)));
  }, []);

  if (!data) {
    return (
      <div className="whole-container flex flex-col justify-center items-center">
        {error ? <p className="form-error">{error}</p> : <Spinner className="size-12 text-[var(--brand)]" />}
      </div>
    );
  }

  const { user, profile, aadhaar, emergencyContacts } = data;
  const address = [profile.addressLine1, profile.addressLine2, profile.city, profile.state, profile.pincode]
    .filter(Boolean)
    .join(", ");
  const area = [profile.district || profile.city, profile.state].filter(Boolean).join(", ");
  const medications = profile.currentMedications.length
    ? profile.currentMedications.map((m) => (m.dosage ? `${m.name}(${m.dosage})` : m.name)).join(", ")
    : NOT_ADDED;
  const contacts = [...emergencyContacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  return (
    <div className="whole-container">
      <div className="flex items-center justify-between pb-5">
        <h1 className="font-semibold text-lg">Profile</h1>
        <Link
          to="/settings"
          aria-label="Settings"
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground!"
        >
          <Settings size={20} />
        </Link>
      </div>

      <div className="bg-white w-full rounded-2xl p-4 mb-5 shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 shrink-0 rounded-full bg-[var(--brand-soft)] text-[var(--brand)] text-xl font-semibold flex items-center justify-center">
            {initials(user.fullName)}
          </div>
          <div className="flex flex-col min-w-0 gap-1">
            <h2 className="font-bold text-lg truncate">{user.fullName}</h2>
            {aadhaar.isVerified ? (
              <p className="text-sky-950/40 text-sm flex items-center gap-2">
                Aadhar: {aadhaar.aadhaarMasked}
                <Badge className="bg-green-600 text-white rounded-full">Verified</Badge>
              </p>
            ) : (
              <p className="text-sky-950/40 text-sm flex items-center gap-2">
                Aadhar: Not verified
                <Link to="/aadhaar"><Badge className="bg-amber-500 text-white rounded-full cursor-pointer">Verify</Badge></Link>
              </p>
            )}
            <Link to="/suggestion" className="text-sky-400 font-medium text-sm flex items-center gap-2 w-max">
              View Suggestion <FaArrowRight />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-3 mt-5 pt-4 border-t border-border text-center">
          <div>
            <p className="text-sm opacity-60">Age</p>
            <p className="font-bold text-lg">{profile.age ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm opacity-60">Gender</p>
            <p className="font-bold text-lg">{profile.gender ? GENDER_LABELS[profile.gender] : "—"}</p>
          </div>
          <div>
            <p className="text-sm opacity-60">Blood Group</p>
            <p className="font-bold text-lg text-red-600">{profile.bloodGroup && profile.bloodGroup !== "unknown" ? profile.bloodGroup : "—"}</p>
          </div>
        </div>
      </div>

      <div className="healthScore grid grid-cols-2 gap-4">
          <div className="p-3 bg-sky-200 rounded-2xl flex flex-col items-center justify-center">
            <h3 className="text-sky-950">Profile Complete</h3>
            <h1 className="text-sky-950 text-4xl font-bold">{data.profileCompletion.percentage}%</h1>
          </div>
          <div className="p-3 bg-white shadow-md rounded-2xl flex flex-row items-center">
               <h3 className="text-sky-400 text-2xl"><FaRegIdCard/></h3>
                 <h3 className="text-black mx-3 font-bold text-center">Medical ID Card</h3>
          </div>
      </div>

      <div className="flex flex-col mt-5">
        <h3  className="font-bold text-2xl mb-4">Health Information</h3>

        <div className="flex flex-col bg-white shadow-md w-1max h-max  p-3 rounded-2xl">
          
          <div className="flex flex-row items-center mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><MdOutlineCoronavirus/></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md opacity-60">Medical Conditions</h4>
                <h4 className="text-lg font-bold">{listOrEmpty(profile.chronicConditions)}</h4>
            </div>
          </div>

          <div className="flex flex-row items-center  mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><RiMedicineBottleLine/></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md opacity-60">Current Medications</h4>
                <h4 className="text-lg font-bold">{medications}</h4>
            </div>
          </div>

          <div className="flex flex-row items-center mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><LiaAllergiesSolid /></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md opacity-60">Allergies</h4>
                <h4 className="text-lg font-bold">{listOrEmpty(profile.allergies)}</h4>
            </div>
          </div>

              <div className="border-t-2">
                <button className="flex text-xl font-bold text-sky-950 bg-sky-200/50 p-3 w-75 mx-3 mt-5 mb-3 px-9 rounded-xl items-center gap-2 cursor-pointer"> <MdOutlineUploadFile/> Upload/View Reports</button>
              </div>
        </div>
      </div>


      <div className="flex flex-col mt-5">
        <h3  className="font-bold text-2xl mb-4">Personal Details</h3>

        <div className="flex flex-col bg-white shadow-md w-1max h-max  p-3 rounded-2xl">
          
          <div className="flex flex-row items-center mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><MdOutlineHome/></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md opacity-60">Residential Address</h4>
                <h4 className="text-lg font-bold">{address || NOT_ADDED}</h4>
            </div>
          </div>

          <div className="flex flex-row items-center  mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><PiCrosshairDuotone /></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md opacity-60">Area</h4>
                <h4 className="text-lg font-bold">{area || NOT_ADDED}</h4>
            </div>
          </div>
        </div>
      </div>  

      
      <div className="flex flex-col mt-5">
        <h3  className="font-bold text-2xl mb-4">Emergency Contacts</h3>

        <div className="flex flex-col bg-white shadow-md w-1max h-max  p-3 rounded-2xl">
          
          {contacts.length === 0 && <h4 className="text-md opacity-60 mx-3 mb-2">No emergency contacts added</h4>}

          {contacts.map((contact, i) => (
            <div key={contact.id} className="flex flex-row items-center mb-4">
              <div className={`flex flex-col mx-3 w-100 ${i < contacts.length - 1 ? "border-b-2 pb-2" : ""}`}>
                <h4 className="text-md opacity-60">{contact.isPrimary ? "Primary Contact" : "Alternate Contact"}</h4>
                <h4 className="text-lg font-bold">{contact.name}</h4>
                <h4 className="text-md opacity-60">{contact.relationship}</h4>
                <h4 className="text-md opacity-60">{formatPhone(contact.phone)}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>    
          
      <div className="flex flex-col mt-5">
        <h3  className="font-bold text-2xl mb-4">AI Insights</h3>

        <div className="flex flex-col bg-white shadow-md w-1max h-max  p-3 rounded-2xl"
         style={{
          background: "linear-gradient(114deg, rgba(189, 230, 255, 0.48) 0.92%, #FBFBFB 100%)",
        }}>

                   
          <div className="flex flex-row items-center mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><MdOutlineLightbulb/></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md font-bold">Lifestyle Tip: <span className="font-thin"> Reduce sodium intake to help manage hypertension</span></h4>
            </div>
          </div>
                             
          <div className="flex flex-row items-center mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><MdOutlineLocalHospital/></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md font-bold">Nearby Hospital: <span className="font-thin"> Apollo Hospital(5km away, 12 beds available)</span></h4>
            </div>
          </div>

          <div className="flex flex-row items-center mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><MdOutlinePerson/></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md font-bold">Doctor Suggestion: <span className="font-thin"> Dr. Verma, Cardiologist, is highly rated.</span></h4>
            </div>
          </div>

          <div className="flex flex-row items-center mb-4">
            <h4 className="text-3xl font-bold text-green-500 mx-3"><LucideBellRing/></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md font-bold ">Alert Status: <span className="font-thin"> All system normal</span></h4>
            </div>
          </div>
        </div>
      </div>      
      
      <div className="flex flex-row w-full mt-5 gap-3">
        <button className="flex text-md font-bold bg-white text-stone-500 p-1 px-3 py-3 w-100  mt-5 mb-3  rounded-xl items-center cursor-pointer shadow-md"><MdOutlineShield/> Privacy Controls</button>
        <button className="flex text-md font-bold bg-white text-stone-500 p-1 px-3 py-3 w-100  mt-5 mb-3  rounded-xl items-center cursor-pointer shadow-md"> <MdOutlineTimelapse/> Update History</button>
      </div>
       
                 
      {/* bottom spacer */}
      <div>
                                    <div className="spacer-2"></div>
                                    <div className="spacer-2"></div>
                                    <div className="spacer-2"></div>
                                    <div className="spacer-2"></div>
                                    <div className="spacer-2"></div>
                                    <div className="spacer-2"></div>
      </div>
      {/* Bottom Navbar */}
      <div className="flex flex-row w-full fixed h-15 bg-white bottom-0 left-0 justify-around items-center border-t">

        <NavLink to="/home">
          <IoHome size={22} />
          <p className="text-xs">Home</p>
        </NavLink>

        <NavLink to="/insurance">
          <IoDocumentText size={22} />
          <p className="text-xs">Insurance</p>
        </NavLink>

        <NavLink to="/pharmacy">
          <FaCapsules size={22} />
          <p className="text-xs">Pharmacy</p>
        </NavLink>

        <NavLink to="/hospital">
          <FaHospital size={22} />
          <p className="text-xs">Hospitals</p>
        </NavLink>

      </div>
      </div>
          
          
  );
};

export default Profile;
