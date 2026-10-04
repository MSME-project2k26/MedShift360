import { useState, useEffect, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AadhaarOtpSent, Gender, OtpSent } from "@/types/api";

import "../App.css";

export interface SignupForm {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender;
  guardianName: string;
  guardianContact: string;
}

/** Router state passed to /otp by Login, Signup and AadhaarVerify. */
export type OtpState =
  | { purpose: "login"; phone: string; sent: OtpSent }
  | { purpose: "register"; form: SignupForm; sent: OtpSent }
  | { purpose: "aadhaar"; sent: AadhaarOtpSent; onboarding?: boolean };

const AADHAAR_RESEND_SECONDS = 30;

const Otp: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, refreshMe } = useAuth();
  const state = useLocation().state as OtpState | null;

  const [otpValue, setOtpValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState(state && "devOtp" in state.sent ? state.sent.devOtp : undefined);
  const [cooldown, setCooldown] = useState(() =>
    !state ? 0 : state.purpose === "aadhaar" ? AADHAAR_RESEND_SECONDS : state.sent.resendAfterSeconds,
  );
  const submitted = useRef("");

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Verify as soon as all 6 digits are entered
  useEffect(() => {
    if (!state || otpValue.length !== 6 || submitted.current === otpValue) return;
    submitted.current = otpValue;

    const verify = async () => {
      setLoading(true);
      setError("");
      try {
        if (state.purpose === "login") {
          signIn(await api.loginPhoneVerify(state.phone, otpValue));
          navigate("/home", { replace: true });
        } else if (state.purpose === "register") {
          const { form } = state;
          signIn(
            await api.registerPhoneVerify({
              phone: form.phone,
              otp: otpValue,
              fullName: form.fullName,
              dateOfBirth: form.dateOfBirth,
              gender: form.gender,
            }),
          );
          // The account exists now; a failed guardian save should not block onboarding
          await api
            .addEmergencyContact({
              name: form.guardianName,
              relationship: "Guardian",
              phone: form.guardianContact,
              isPrimary: true,
            })
            .catch(() => undefined);
          navigate("/aadhaar", { replace: true, state: { onboarding: true } });
        } else {
          await api.aadhaarVerifyOtp(otpValue);
          await refreshMe();
          navigate(state.onboarding ? "/home" : "/profile", { replace: true });
        }
      } catch (err) {
        setError(errorMessage(err));
        setOtpValue("");
        submitted.current = "";
        setLoading(false);
      }
    };
    verify();
  }, [otpValue, state, navigate, signIn, refreshMe]);

  if (!state) return <Navigate to="/login" replace />;

  const handleResend = async () => {
    setError("");
    if (state.purpose === "aadhaar") {
      // The Aadhaar number is not kept in browser history; ask for it again
      navigate("/aadhaar", { replace: true, state: { onboarding: state.onboarding } });
      return;
    }
    try {
      const sent =
        state.purpose === "login"
          ? await api.loginPhoneSendOtp(state.phone)
          : await api.registerPhoneSendOtp(state.form.phone);
      setDevOtp(sent.devOtp);
      setCooldown(sent.resendAfterSeconds);
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && err.code === "OTP_COOLDOWN") {
        const retry = (err.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
        if (retry) setCooldown(retry);
      }
    }
  };

  const sentTo =
    state.purpose === "aadhaar"
      ? `the mobile number linked with Aadhaar ${state.sent.aadhaarMasked}`
      : state.sent.sentTo;

  return (
    <div className="whole-container" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {!loading ? (
        <>
          <h4 className="otp-heading-txt">{state.purpose === "aadhaar" ? "Enter Aadhaar OTP" : "Enter your OTP"}</h4>
          <p className="otp-para-txt">We have sent an OTP to {sentTo}</p>
          <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue} inputMode="numeric" autoFocus>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && <p className="form-error">{error}</p>}

          {import.meta.env.DEV && (devOtp || state.purpose === "aadhaar") && (
            <p className="form-hint">Dev mode OTP: {devOtp ?? "123456 (mock Aadhaar)"}</p>
          )}

          <p className="login-txt" style={{ left: 0 }}>
            Didn't get it?{" "}
            <button type="button" className="link-btn" onClick={handleResend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
          </p>
        </>
      ) : (
        <div style={{ textAlign: "center", marginTop: "150px" }}>
          <Spinner className="size-16 text-[#13A4EC] mx-auto" />
          <p style={{ marginTop: "10px" }}>Verifying OTP...</p>
        </div>
      )}
    </div>
  );
};

export default Otp;
