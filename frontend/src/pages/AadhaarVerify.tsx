import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { IoMdFingerPrint } from "react-icons/io";
import { MdVerified } from "react-icons/md";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { OtpState } from "./Otp";

import "../App.css";

/** "234567890123" -> "2345 6789 0123" while typing */
function formatAadhaar(value: string) {
  return value.replace(/\D/g, "").slice(0, 12).replace(/(\d{4})(?=\d)/g, "$1 ");
}

const AadhaarVerify = () => {
  const navigate = useNavigate();
  const { aadhaar } = useAuth();
  const onboarding = Boolean((useLocation().state as { onboarding?: boolean } | null)?.onboarding);

  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (aadhaarNumber.replace(/\D/g, "").length !== 12) {
      setError("Please enter your 12-digit Aadhaar number.");
      return;
    }
    if (!consent) {
      setError("Please give your consent to verify Aadhaar.");
      return;
    }

    setLoading(true);
    try {
      const sent = await api.aadhaarSendOtp(aadhaarNumber);
      const state: OtpState = { purpose: "aadhaar", sent, onboarding };
      navigate("/otp", { state });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="whole-container" onSubmit={handleSubmit}>
      <div className="login-text-head">
        <div className="lg-txt-icon"><IoMdFingerPrint /></div>
        <h2 className="heading-txt">Verify Aadhaar</h2>
        <p className="login-text-para">
          {onboarding ? "Account created! Verify your identity to complete your profile" : "Verify your identity with an OTP from UIDAI"}
        </p>
      </div>

      {aadhaar?.isVerified ? (
        <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-5 shadow-md">
          <p className="text-4xl text-green-600"><MdVerified /></p>
          <p className="font-bold text-lg">{aadhaar.aadhaarMasked}</p>
          <Badge className="bg-green-600 text-white rounded-full">Verified</Badge>
          <Link to="/profile" className="signup-btn text-center">Back to Profile</Link>
        </div>
      ) : (
        <>
          <h5 className="inp-txt">Aadhaar No.</h5>
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={aadhaarNumber}
            onChange={(e) => setAadhaarNumber(formatAadhaar(e.target.value))}
            placeholder="1234 1234 1234"
          />

          <label className="flex gap-2 items-start text-sm opacity-80 cursor-pointer">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I consent to MedShift360 verifying my Aadhaar with UIDAI. My full Aadhaar number is never stored.
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="signup-btn" type="submit" disabled={loading}>{loading ? "Please wait..." : "Send OTP"}</button>

          <p className="login-txt">
            {onboarding ? <Link to="/home" replace>Skip for now</Link> : <Link to="/profile">Back to Profile</Link>}
          </p>
        </>
      )}
    </form>
  );
};

export default AadhaarVerify;
