import React from "react";
import { NavLink } from "react-router-dom";
import { FaRegIdCard } from "react-icons/fa6";
import { IoHome, IoDocumentText } from "react-icons/io5";
import { FaUser,FaCapsules, FaHospital } from "react-icons/fa";
import { MdOutlineLightbulb, MdOutlineLocalHospital, MdOutlinePerson } from "react-icons/md";

import { LucideBellRing } from "lucide-react";
const AiAssistant: React.FC = () => {



  return (
    <div className="whole-container">
     <div className="flex items-center justify-center-safe mt-2 pb-5">
          <h1 className="font-bold text-lg left-[3%] relative">Pharmacy</h1>
           <NavLink to="/profile" className={({ isActive }) => ` w-[50px] h-[50px] rounded-[100px] bg-amber-300 left-[30%] relative flex justify-center items-center text-white transition-colors duration-200 ${isActive ? "text-sky-500" : "text-sky-800/70 hover:text-sky-800" }`}>
            <p className="text-2xl "><FaUser /></p>
          </NavLink>
        </div>


        <h3  className="font-bold text-2xl mb-4">Health Score</h3>
      <div className="healthScore flex gap-6">
          <div className="w-50 p-3 h-22 bg-sky-200 rounded-2xl flex flex-col items-center">
            <h3 className="text-sky-950">Health Score</h3>
            <h1 className="text-sky-950 text-4xl font-bold">88</h1>
          </div>
          <div className="w-50 p-3 h-22 bg-white shadow-md rounded-2xl flex flex-row items-center">
               <h3 className="text-sky-400 text-2xl"><FaRegIdCard/></h3>
                 <h3 className="text-black mx-3 font-bold text-center">Medical ID Card</h3>
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

export default AiAssistant;
