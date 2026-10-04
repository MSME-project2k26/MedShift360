import React from "react";
import {  NavLink, useNavigate } from "react-router-dom";
import { FaArrowRight, FaCamera } from "react-icons/fa6";
import { IoHome, IoDocumentText } from "react-icons/io5";
import { FaUser,FaCapsules, FaHospital } from "react-icons/fa";
import { PiCrosshairDuotone } from "react-icons/pi";
import { Badge } from "@/components/ui/badge"
import { MdOutlineHome } from "react-icons/md";

const AmbulanceBooking: React.FC = () => {
  
  const navigate = useNavigate(); 
  const handleConfirm = () => {
    navigate("/Hospital"); // ✅ triggers route change
  };


  return (
    <div className="whole-container">
   <div className="flex items-center justify-center-safe mt-2 pb-5">
          <h1 className="font-bold text-lg left-[3%] relative">Pharmacy</h1>
           <NavLink to="/profile" className={({ isActive }) => ` w-[50px] h-[50px] rounded-[100px] bg-amber-300 left-[30%] relative flex justify-center items-center text-white transition-colors duration-200 ${isActive ? "text-sky-500" : "text-sky-800/70 hover:text-sky-800" }`}>
            <p className="text-2xl "><FaUser /></p>
          </NavLink>
        </div>



      <div>
            <div className="flex-col bg-white w-full h-max rounded-2xl p-3 mb-5 shadow-md">
                <img className="w-20 relative mt-5 mx-3 rounded-full outline-2 outline-offset-0 outline-blue-500" src="https://img.freepik.com/free-vector/woman-head-profile_24908-81681.jpg?semt=ais_hybrid&w=740&q=80"></img>
                <div className="relative -mt-5 mx-17">
                      <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600 rounded-full p-1 scale-100 cursor-pointer">
                      <FaCamera />
                    </Badge>
              </div>
                    <h2 className="font-bold text-lg mb-1 -mt-20 mx-30 w-max pt-1">Priya Sharma</h2>
                    <h2 className="text-sky-950/40 text-md mb-1 w-50 mx-30">Aadhar: XXXX XXXX 1234</h2>
                    <a href="" className="text-sky-400 decoration-sky-400 font-medium text-sm flex items-center mx-30 w-max" >View Suggestion &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<FaArrowRight /></a>
                    <div className="flex flex-row mt-6">
                                <div className="flex flex-col items-center mx-9">
                                    <h3 className="font-bold text-md opacity-60">Age</h3>
                                     <h3 className="font-bold text-lg">28</h3>
                                </div>
                                <div className="flex flex-col items-center mx-6">
                                    <h3 className="font-bold text-md opacity-60">Gender</h3>
                                     <h3 className="font-bold text-lg">Female</h3>
                                </div>
                                 <div className="flex flex-col items-center mx-6">
                                    <h3 className="font-bold text-md opacity-60 w-max">Blood Group</h3>
                                     <h3 className="font-bold text-lg text-red-600">O+</h3>
                                </div>
                                
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
                <h4 className="text-lg font-bold">#123, Sunshine Apartments, Green Valley, Banglore, 560001</h4>
            </div>
          </div>

          <div className="flex flex-row items-center  mb-4">
            <h4 className="text-3xl font-bold text-sky-400 mx-3"><PiCrosshairDuotone /></h4>
            <div className="flex flex-col mx-3">
                <h4 className="text-md opacity-60">Current location</h4>
                <h4 className="text-lg font-bold">Near City Park, Banglore</h4>
            </div>
          </div>
        </div>
      </div>  

      
      <div className="flex flex-col mt-5">
        <h3  className="font-bold text-2xl mb-4">Emergency Contacts</h3>

        <div className="flex flex-col bg-white shadow-md w-1max h-max  p-3 rounded-2xl">
          
          <div className="flex flex-row items-center mb-4 ">
            <div className="flex flex-col mx-3 w-100 border-b-2 pb-2">
              <h4 className="text-md opacity-60">Primary Contact</h4>
                <h4 className="text-lg font-bold">Arun Sharma</h4>
                <h4 className="text-md opacity-60">Brother</h4>
                <h4 className="text-md opacity-60">+91 98765 43210</h4>
            </div>
          </div>

          <div className="flex flex-row items-center  mb-4">
            <div className="flex flex-col mx-3">
                <h4 className="text-md opacity-60">Alternate Contact</h4>
                <h4 className="text-lg font-bold">Sunita Sharma</h4>
                <h4 className="text-md opacity-60">Mother</h4>
                <h4 className="text-md opacity-60">+91 98765 43211</h4>
            </div>
          </div>
        </div>
      </div>    

      <div className="flex flex-row w-full mt-5 gap-3">
        <button className="flex text-md font-bold bg-red-600 text-white p-1 px-3 py-3 w-100 justify-center mt-5 mb-3  rounded-xl items-center cursor-pointer shadow-md" onClick={handleConfirm}>Confirm</button>
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

export default AmbulanceBooking;
