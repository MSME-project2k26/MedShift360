import type {
  AadhaarOtpSent,
  AadhaarStatus,
  AuthResult,
  EmergencyContact,
  Gender,
  PatientProfile,
  MeResult,
  OtpSent,
  ProfileResult,
  Tokens,
} from "@/types/api";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");

const ACCESS_KEY = "ms360.accessToken";
const REFRESH_KEY = "ms360.refreshToken";

/** Fired when the session can no longer be refreshed, so the app can go back to login. */
export const SESSION_EXPIRED_EVENT = "ms360:session-expired";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// ---------- token storage ----------

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  save(tokens: Tokens) {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ---------- request core ----------

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function rawRequest<T>(method: Method, path: string, body?: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokenStore.access) headers.Authorization = `Bearer ${tokenStore.access}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("NETWORK_ERROR", "Unable to reach the server. Please check your connection.", 0);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.success) {
    const err = json?.error;
    throw new ApiError(
      err?.code || "UNKNOWN_ERROR",
      err?.message || "Something went wrong. Please try again.",
      res.status,
      err?.details,
    );
  }
  return json.data as T;
}

// Several requests may hit TOKEN_EXPIRED at once; refresh only once.
let refreshing: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (!refreshing) {
    const refreshToken = tokenStore.refresh;
    refreshing = (async () => {
      if (!refreshToken) throw new ApiError("AUTH_REQUIRED", "Please log in again.", 401);
      // The backend rotates refresh tokens, so always store the new pair
      const { tokens } = await rawRequest<{ tokens: Tokens }>("POST", "/auth/token/refresh", { refreshToken });
      tokenStore.save(tokens);
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Authenticated request that refreshes the access token once on TOKEN_EXPIRED. */
async function authRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  try {
    return await rawRequest<T>(method, path, body, true);
  } catch (err) {
    if (!(err instanceof ApiError) || err.code !== "TOKEN_EXPIRED") throw err;
  }

  try {
    await refreshSession();
  } catch (err) {
    tokenStore.clear();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw err;
  }
  return rawRequest<T>(method, path, body, true);
}

// ---------- endpoints ----------

export interface RegisterPhoneInput {
  phone: string;
  otp: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: Gender;
}

export const api = {
  // Registration
  registerPhoneSendOtp: (phone: string) => rawRequest<OtpSent>("POST", "/auth/register/phone/send-otp", { phone }),
  registerPhoneVerify: (input: RegisterPhoneInput) =>
    rawRequest<AuthResult>("POST", "/auth/register/phone/verify", input),

  // Login
  loginEmail: (email: string, password: string) =>
    rawRequest<AuthResult>("POST", "/auth/login/email", { email, password }),
  loginPhoneSendOtp: (phone: string) => rawRequest<OtpSent>("POST", "/auth/login/phone/send-otp", { phone }),
  loginPhoneVerify: (phone: string, otp: string) =>
    rawRequest<AuthResult>("POST", "/auth/login/phone/verify", { phone, otp }),

  // Session
  me: () => authRequest<MeResult>("GET", "/auth/me"),
  logout: (refreshToken: string) => rawRequest<null>("POST", "/auth/logout", { refreshToken }),

  // Profile
  getProfile: () => authRequest<ProfileResult>("GET", "/users/me/profile"),
  /** Send only the fields to change; null clears an optional field. */
  updateProfile: (patch: Partial<PatientProfile> & { fullName?: string }) =>
    authRequest<ProfileResult>("PATCH", "/users/me/profile", patch),

  // Aadhaar verification (for the logged-in user)
  aadhaarStatus: () => authRequest<AadhaarStatus>("GET", "/users/me/aadhaar"),
  aadhaarSendOtp: (aadhaarNumber: string) =>
    authRequest<AadhaarOtpSent>("POST", "/users/me/aadhaar/send-otp", { aadhaarNumber, consent: true }),
  aadhaarVerifyOtp: (otp: string) => authRequest<AadhaarStatus>("POST", "/users/me/aadhaar/verify-otp", { otp }),

  // Emergency contacts
  addEmergencyContact: (contact: { name: string; relationship: string; phone: string; isPrimary?: boolean }) =>
    authRequest<{ contact: EmergencyContact }>("POST", "/users/me/emergency-contacts", contact),
};

/** User-facing text for any error (backend messages are plain language and safe to show). */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}
