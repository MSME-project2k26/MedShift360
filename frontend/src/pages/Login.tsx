import { useState } from "react";
import type { FormEvent } from "react";
import { MdOutlineHealthAndSafety, MdOutlineEmail } from "react-icons/md";
import { Input } from "@/components/ui/input";
import { RiMessage2Line } from "react-icons/ri";
import { Eye, EyeOff } from "lucide-react"; // eye icons
import '../App.css'; // adjust path if needed
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { OtpState } from "./Otp";

type Mode = "otp" | "password";

const activeMode = { borderColor: "var(--brand)", color: "var(--brand)" };

const Login = () => {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();

  const [mode, setMode] = useState<Mode>("otp");
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [visible, setVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notRegistered, setNotRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setNotRegistered(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setNotRegistered(false);

    if (mode === "otp" ? !phone : !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "otp") {
        const sent = await api.loginPhoneSendOtp(phone);
        const state: OtpState = { purpose: "login", phone, sent };
        navigate("/otp", { state });
      } else {
        signIn(await api.loginEmail(email, password));
        navigate("/home", { replace: true });
      }
    } catch (err) {
      setError(errorMessage(err));
      setNotRegistered(err instanceof ApiError && err.code === "PHONE_NOT_REGISTERED");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="whole-container" onSubmit={handleSubmit}>
      <div className="login-text-head">
          <div className="lg-txt-icon"><MdOutlineHealthAndSafety /></div>
          <h2 className="heading-txt">Welcome Back</h2>
          <p className="login-text-para">
            {mode === "otp" ? "Enter your mobile number to receive an OTP" : "Please enter your credentials to access the system"}
          </p>
      </div>

      {mode === "otp" ? (
        <Input
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Mobile number, eg. 9876543210"
        />
      ) : (
        <>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
          />

          <div className="relative w-full">
            <input
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Toggle Button */}
            <button
              type="button"
              onClick={() => setVisible(!visible)}
              className="eye-btn absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {visible ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="form-error">
          {error} {notRegistered && <Link to="/signup" className="font-bold underline">Sign up</Link>}
        </p>
      )}

      <button className="signup-btn" type="submit" disabled={loading}>
        {loading ? "Please wait..." : mode === "otp" ? "Send OTP" : "Login"}
      </button>
      <div className="flex flex-wrap justify-around">
        <div className="lg-alt-line"></div>
          <p className="lg-alt-text">or Login</p>
        <div className="lg-alt-line"></div>
      </div>
        <div className="flex gap-2">
            <button className="oth-login-btn flex gap-2" type="button" aria-pressed={mode === "password"} style={mode === "password" ? activeMode : undefined} onClick={() => switchMode("password")}><span><MdOutlineEmail /></span>Email</button>
            <button className="oth-login-btn flex gap-2" type="button" aria-pressed={mode === "otp"} style={mode === "otp" ? activeMode : undefined} onClick={() => switchMode("otp")}><span><RiMessage2Line /></span>OTP</button>
        </div>

      <p className="login-txt">Don't have an account?  <Link to="/signup">SignUp Here</Link></p>
    </form>
  );
};

export default Login;
