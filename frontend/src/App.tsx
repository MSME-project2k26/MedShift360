// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from "react";
import Signup from './pages/Signup.tsx';
import Otp from './pages/Otp.tsx'
import Login from './pages/Login.tsx';
import Home from './pages/Home.tsx';
import React from "react";
import Suggestion from './pages/Suggestion.tsx';
import Profile from './pages/Profile.tsx';
import Emergency from './pages/Emergency.tsx';
import HospitalDetail from './pages/HospitalDetail.tsx';
import AiAssistant from './pages/AiAssistant.tsx';
import AmbulanceBooking from './pages/AmbulanceBooking.tsx';
import Insurance from './pages/Insurance.tsx';
import Pharmacy from './pages/Pharmacy.tsx';
import AadhaarVerify from './pages/AadhaarVerify.tsx';
import { AuthProvider } from './components/AuthProvider.tsx';
import { RequireAuth } from './components/RequireAuth.tsx';

const protect = (page: ReactNode) => <RequireAuth>{page}</RequireAuth>;

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/otp" element={<Otp />} />
          <Route path="/aadhaar" element={protect(<AadhaarVerify />)} />
          <Route path="/home" element={protect(<Home />)} />
          <Route path="/hospital/:id" element={protect(<HospitalDetail />)} />
          <Route path="/profile" element={protect(<Profile />)} />
          <Route path="/hospital" element={protect(<Emergency />)} />
          <Route path="/suggestion" element={protect(<Suggestion />)} />
          <Route path="/AiAssistant" element={protect(<AiAssistant />)} />
          <Route path="/insurance" element={protect(<Insurance />)} />
          <Route path="/pharmacy" element={protect(<Pharmacy />)} />
          <Route path="/AmbulanceBooking" element={protect(<AmbulanceBooking />)} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
