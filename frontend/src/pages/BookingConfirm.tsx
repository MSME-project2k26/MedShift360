import React from "react";
import {  NavLink } from "react-router-dom";
import { IoHome, IoDocumentText } from "react-icons/io5";
import { FaUser,FaCapsules, FaHospital } from "react-icons/fa";

const BookingConfirm: React.FC = () => {
  

  return (
    <div className="whole-container">
 <div className="flex items-center justify-center-safe mt-2 pb-5">
          <h1 className="font-bold text-lg left-[3%] relative">Pharmacy</h1>
           <NavLink to="/profile" className={({ isActive }) => ` w-[50px] h-[50px] rounded-[100px] bg-amber-300 left-[30%] relative flex justify-center items-center text-white transition-colors duration-200 ${isActive ? "text-sky-500" : "text-sky-800/70 hover:text-sky-800" }`}>
            <p className="text-2xl "><FaUser /></p>
          </NavLink>
        </div>


      
      <div className="flex flex-col mt-5">
        <h3  className="font-bold text-2xl mb-4">Emergency Contacts</h3>

        <div className="flex flex-col bg-white shadow-md w-1max h-max  p-3 rounded-2xl">
          
          <div className="flex flex-row items-center mb-4 ">
            <div className="flex flex-row mx-3 w-100 border-b-2 pb-2 items-center gap-10">
              <h4 className="text-md opacity-60">Policy Holder</h4>
                <h4 className="text-lg font-bold">Arun Sharma</h4>
            </div>
          </div>

          <div className="flex flex-row items-center mb-4 ">
            <div className="flex flex-row mx-3 w-100 border-b-2 pb-2 items-center gap-10">
              <h4 className="text-md opacity-60">Policy Number</h4>
                <h4 className="text-lg font-bold">XY1729282</h4>
            </div>
          </div>

            <div className="flex flex-row items-center mb-4 ">
            <div className="flex flex-row mx-3 w-100 border-b-2 pb-2 items-center gap-10">
              <h4 className="text-md opacity-60">Provider</h4>
                <h4 className="text-lg font-bold">MedSecure</h4>
            </div>
          </div>

            <div className="flex flex-row items-center mb-4 ">
            <div className="flex flex-row mx-3 w-100 border-b-2 pb-2 items-center gap-10">
              <h4 className="text-md opacity-60">Coverage</h4>
                <h4 className="text-lg font-bold">Full Coverage</h4>
            </div>
          </div>

            <div className="flex flex-row items-center mb-4 ">
            <div className="flex flex-row mx-3 w-100 border-b-2 pb-2 items-center gap-10">
              <h4 className="text-md opacity-60">Co-payment</h4>
                <h4 className="text-lg font-bold">1000 per visit</h4>
            </div>
          </div>

             <div className="flex flex-row items-center mb-4 ">
            <div className="flex flex-row mx-3 w-100 border-b-2 pb-2 items-center gap-10">
              <h4 className="text-md opacity-60">Deductible</h4>
                <h4 className="text-lg font-bold">500 (Remaining: 250)</h4>
            </div>
          </div>

             <div className="flex flex-row items-center mb-4 ">
            <div className="flex flex-row mx-3 w-100  pb-2 items-center gap-10">
              <h4 className="text-md opacity-60">Valid Until</h4>
                <h4 className="text-lg font-bold">31/12/2025</h4>
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

export default BookingConfirm;
