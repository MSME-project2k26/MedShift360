import React from "react";
import { useParams, Link } from "react-router-dom";
import hospitalData from "../data/hospital.json";
import type { Hospital } from "../types/Hospital";
const HospitalDetail: React.FC = () => {
  const { id } = useParams();
  const hospitalId = Number(id);

  const hospital: Hospital | undefined = hospitalData.find(
    (h) => h.id === hospitalId
  );



  if (!hospital) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-semibold">Hospital not found 😕</h2>
        <Link
          to="/home"
          className="text-blue-600 hover:underline mt-4 block"
        >
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="whole-container">
      <Link to="/home" className="text-blue-600 hover:underline mb-4 block">
        ← Back to Hospitals
      </Link>
      <h1 className="text-3xl font-bold mb-2">{hospital.name}</h1>
      <p className="text-gray-600 mb-2">{hospital.location}</p>
      <div className="flex flex-row gap-10">
          <p className="text-gray-500 mb-2 bg-gray-200 p-2 rounded-md h-10">🛏️ Beds: {hospital.beds}</p>
          <p className="text-yellow-600 mb-4 bg-amber-200 p-2 rounded-md h-10">⭐ Rating: {hospital.rating}</p>
      </div>
      {/* Extended details — optional */}
        <div className="flex flex-wrap gap-2 mt-2">
          {hospital.departments.map((dept, index) => (
            <p key={index}><strong>Departments:</strong> {dept}</p>
          ))}
        </div>


        <p><strong>Contact:</strong> +91 98765 43210</p>
        <p><strong>Emergency:</strong> 24/7 Available 🚑</p>

        <div>
           {/*ward details */}
        <div className="flex flex-wrap gap-2 mt-2">
          {hospital.wards.map((ward, i) => (
            <div key={i} className="w-full p-3 border rounded-lg mb-2 flex flex-row bg-sky-50">
              <img className="w-30 h-30 rounded-md" src={ward.image} />
            <div className="flex flex-col mx-3">
                    <h3 className="text-xl font-semibold text-sky-900">{ward.name}</h3>
                    <p className="text-lg text-gray-700">Type: {ward.type}</p>
                    <p className="text-lg text-gray-700">Beds: {ward.beds}</p>
            </div>
            </div>
          ))}

        </div>

        </div>

      </div>

  
  );
};

export default HospitalDetail;
