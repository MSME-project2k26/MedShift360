import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Gender } from "@/types/api";
import type { OtpState } from "./Otp";

import '../App.css'; // adjust path if needed

const today = new Date().toISOString().slice(0, 10);

const Signup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [username, setUsername] = useState('');
  const [contact, setContact] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianContact, setGuardianContact] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !contact || !guardianName || !guardianContact || !dateOfBirth || !gender) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      const sent = await api.registerPhoneSendOtp(contact);
      const state: OtpState = {
        purpose: "register",
        sent,
        form: { fullName: username.trim(), phone: contact, dateOfBirth, gender, guardianName: guardianName.trim(), guardianContact },
      };
      navigate("/otp", { state });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="whole-container" onSubmit={handleSubmit}>
      <h2 className="heading-txt mb-8">Sign Up</h2>

      <h5 className="inp-txt">Patient Name</h5>
      <Input
        type="text"
        autoComplete="name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Eg.John Doe"
      />

      <h5 className="inp-txt">Contact No.</h5>
      <Input
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Eg.9876543210"
      />

      <h5 className="inp-txt">Guardian Name</h5>
      <Input
        type="text"
        value={guardianName}
        onChange={(e) => setGuardianName(e.target.value)}
        placeholder="Eg.John Doe"
      />
      <h5 className="inp-txt">Guardian Contact No.</h5>
      <Input
        type="tel"
        inputMode="numeric"
        value={guardianContact}
        onChange={(e) => setGuardianContact(e.target.value)}
        placeholder="Eg.9876543210"
      />

      <h5 className="inp-txt">Date of Birth</h5>
      <Input
        type="date"
        max={today}
        value={dateOfBirth}
        onChange={(e) => setDateOfBirth(e.target.value)}
      />

      <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
        <SelectTrigger className="w-full h-12! rounded-xl bg-card">
          <SelectValue placeholder="Select Gender" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="male">Male</SelectItem>
          <SelectItem value="female">Female</SelectItem>
          <SelectItem value="other">Other</SelectItem>
          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
        </SelectContent>
      </Select>

      {error && <p className="form-error">{error}</p>}

      <button className="signup-btn" type="submit" disabled={loading}>{loading ? "Please wait..." : "Sign Up"}</button>

      <p className="login-txt">Have an account?  <Link to="/login">Login Here</Link></p>
    </form>
  );
};

export default Signup;
