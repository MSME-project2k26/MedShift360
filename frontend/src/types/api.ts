// Shapes returned by the MedShift360 backend (see backend/README.md)

export type Gender = "male" | "female" | "other" | "prefer_not_to_say";

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  accountType: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  hasPassword: boolean;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Tokens {
  tokenType: "Bearer";
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AadhaarStatus {
  status: "not_started" | "otp_sent" | "verified" | "failed";
  isVerified: boolean;
  aadhaarMasked: string | null;
  verifiedAt?: string | null;
  nameMatched?: boolean | null;
  failureReason?: string;
}

export interface OtpSent {
  sentTo: string;
  channel: "sms" | "email";
  expiresInSeconds: number;
  resendAfterSeconds: number;
  devOtp?: string;
}

export interface AadhaarOtpSent {
  status: "otp_sent";
  aadhaarMasked: string;
  expiresInSeconds: number;
}

export interface AuthResult {
  user: User;
  tokens: Tokens;
  aadhaar?: AadhaarStatus;
  nextSteps: string[];
}

export interface MeResult {
  user: User;
  aadhaar: AadhaarStatus;
  nextSteps: string[];
}

export interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  timing?: string;
}

export interface PatientProfile {
  dateOfBirth: string | null;
  gender: Gender | null;
  bloodGroup: string | null;
  heightCm: number | null;
  weightKg: number | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  chronicConditions: string[];
  allergies: string[];
  currentMedications: Medication[];
  mobilityAid: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  preferredLanguage: string | null;
  age: number | null;
  isSeniorCitizen: boolean;
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
  notifyOnEmergency: boolean;
}

export interface ProfileResult {
  user: User;
  profile: PatientProfile;
  aadhaar: AadhaarStatus;
  emergencyContacts: EmergencyContact[];
  profileCompletion: { percentage: number; missingFields: string[] };
}
