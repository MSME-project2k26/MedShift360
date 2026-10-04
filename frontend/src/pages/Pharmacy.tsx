import React from "react";
import { NavLink } from "react-router-dom";
import { IoHome, IoDocumentText, IoSearch } from "react-icons/io5";
import { FaUser, FaCapsules, FaHospital } from "react-icons/fa";
import data from "../data/medicines.json";

interface Medicine {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
}

const Pharmacy: React.FC = () => {

  const medicines: Medicine[] = data.medicines;

  return (
    <div className="whole-container p-4">
        <div className="flex items-center justify-center-safe mt-2 pb-5">
          <h1 className="font-bold text-lg left-[3%] relative">Pharmacy</h1>
           <NavLink to="/profile" className={({ isActive }) => ` w-[50px] h-[50px] rounded-[100px] bg-amber-300 left-[30%] relative flex justify-center items-center text-white transition-colors duration-200 ${isActive ? "text-sky-500" : "text-sky-800/70 hover:text-sky-800" }`}>
            <p className="text-2xl "><FaUser /></p>
          </NavLink>
        </div>

      {/* SEARCH BAR */}
      <div className="flex items-center bg-gray-100 rounded-xl p-2 mb-4">
        <IoSearch className="text-gray-500 mr-2" />
        <input
          className="bg-transparent outline-none w-full"
          placeholder="Search medicines"
        />
      </div>

      {/* PROMO BANNER */}
      <div className="bg-green-500 text-white rounded-xl p-4 mb-4">
        <h2 className="font-semibold text-3xl relative float-start top-[20px]">{data.promo.title}</h2>
        <p className="font-semibold text-sm opacity-70 relative float-start top-[20px]">{data.promo.subtitle}</p>
         <img
              src={data.promo["images:"]}
              alt={data.promo.title}
              className="w-max h-34 object-fit left-[10%] relative mt-7"
            />
      </div>

      {/* CATEGORY CHIPS */}
      <div className="flex gap-3 mb-4">
        {data.categories.map((cat, index) => (
          <div
            key={index}
            className="px-4 py-1 bg-gray-200 rounded-full text-sm"
          >
            {cat}
          </div>
        ))}
      </div>

      {/* MEDICINES LIST */}
      <h2 className="font-semibold mb-2">Popular Medicines</h2>

      <div className="grid grid-cols-2 gap-4">
        {medicines.map((med) => (
          <div
            key={med.id}
            className="bg-white shadow-md rounded-xl p-3"
          >
            <img
              src={med.image}
              alt={med.name}
              className="w-full h-24 object-contain"
            />

            <h3 className="font-semibold text-sm mt-2">{med.name}</h3>
            <p className="text-xs text-gray-500">{med.description}</p>

            <div className="flex justify-between items-center mt-2">
              <p className="font-bold">₹{med.price}</p>

              <button className="bg-green-500 text-white w-7 h-7 rounded-full">
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* BOTTOM NAVBAR */}
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

export default Pharmacy;