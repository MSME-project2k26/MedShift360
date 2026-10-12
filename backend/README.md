# MedShift360 Backend API

Node.js + Express + Supabase (PostgreSQL) backend for registration, login, Aadhaar verification and patient profiles. Every response is JSON in one standard format, so the frontend can rely on it.

## 1. Setup

1. **Create a Supabase project** at https://supabase.com.
2. **Create the tables:** Supabase Dashboard → SQL Editor → paste [supabase/migrations/001_auth_and_profiles.sql](supabase/migrations/001_auth_and_profiles.sql) → Run.
3. **Configure:**
   ```bash
   cd backend
   cp .env.example .env
   ```
   Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Project Settings → API). Generate each secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
4. **Run:**
   ```bash
   npm install
   npm run dev     # auto-restarts on file changes
   npm test        # unit + API tests (no database needed)
   ```
   API base URL: `http://localhost:4000/api/v1`

**Development mode.** SMS and email are printed to the server console instead of being sent. With `OTP_DEV_ECHO=true`, every OTP response also contains `"devOtp": "123456"`, so the frontend can be tested without a phone. The mock Aadhaar provider always accepts OTP `123456`. The server **refuses to start** in production while any console or mock provider is still configured.

---

## 2. Response format

**Success**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": { }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please enter a valid 10-digit Indian mobile number.",
    "details": [{ "field": "phone", "message": "Please enter a valid 10-digit Indian mobile number." }]
  }
}
```
- `error.code` is stable. Use it in frontend logic.
- `error.message` is plain language and safe to show directly to the user.

**Authentication.** Send `Authorization: Bearer <accessToken>`. When a request returns `401` with `TOKEN_EXPIRED`, call `POST /auth/token/refresh` and retry. Each refresh returns a **new** refresh token, so always store the latest one.

**Phone numbers** may be sent in any common Indian format (`9876543210`, `+91 98765 43210`, `09876543210`). They are always returned as `+919876543210`.

---

## 3. Endpoints

### 3.1 Registration

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register/email` | – | Register with email + password (phone optional) |
| POST | `/auth/register/phone/send-otp` | – | Step 1 of mobile registration (for users without email) |
| POST | `/auth/register/phone/verify` | – | Step 2: verify OTP and create the account |

**Register with email**
```http
POST /api/v1/auth/register/email
{
  "fullName": "Ramesh Kumar",
  "email": "ramesh@example.com",
  "password": "ramesh1955",
  "phone": "9876543210",
  "dateOfBirth": "1955-06-15",
  "gender": "male"
}
```
Response `201`:
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email with the OTP we sent.",
  "data": {
    "user": {
      "id": "6f1c...",
      "fullName": "Ramesh Kumar",
      "email": "ramesh@example.com",
      "phone": "+919876543210",
      "role": "patient",
      "accountType": "self",
      "emailVerified": false,
      "phoneVerified": false,
      "hasPassword": true,
      "status": "active",
      "lastLoginAt": null,
      "createdAt": "2026-10-02T10:00:00.000Z"
    },
    "tokens": {
      "tokenType": "Bearer",
      "accessToken": "eyJhbGciOi...",
      "accessTokenExpiresIn": 1800,
      "refreshToken": "q8Xz...",
      "refreshTokenExpiresAt": "2026-11-01T10:00:00.000Z"
    },
    "emailVerification": { "sentTo": "ra****@example.com", "channel": "email", "expiresInSeconds": 300, "resendAfterSeconds": 30, "devOtp": "482913" },
    "nextSteps": ["verify_email", "verify_phone", "verify_aadhaar", "complete_profile"]
  }
}
```
Password rules: 8–72 characters, with at least one letter and one number. Special characters are not required, to keep it easy for elderly users.

**Register with mobile number (no email needed)**
```http
POST /api/v1/auth/register/phone/send-otp
{ "phone": "9876543210" }
```
```json
{ "success": true, "message": "OTP sent to your mobile number.",
  "data": { "sentTo": "+91 ******3210", "channel": "sms", "expiresInSeconds": 300, "resendAfterSeconds": 30, "devOtp": "104729" } }
```
```http
POST /api/v1/auth/register/phone/verify
{
  "phone": "9876543210",
  "otp": "104729",
  "fullName": "Lakshmi Devi",
  "dateOfBirth": "1950-03-21",
  "gender": "female"
}
```
`email` and `password` are optional here. If `email` is given, `password` is required. The response has the same shape as email registration (`user`, `tokens`, `nextSteps`).

### 3.2 Login

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/login/email` | – | Email + password |
| POST | `/auth/login/phone/send-otp` | – | Send login OTP |
| POST | `/auth/login/phone/verify` | – | Verify OTP and log in |

```http
POST /api/v1/auth/login/email
{ "email": "ramesh@example.com", "password": "ramesh1955" }
```
```http
POST /api/v1/auth/login/phone/send-otp
{ "phone": "9876543210" }

POST /api/v1/auth/login/phone/verify
{ "phone": "9876543210", "otp": "552190" }
```
A successful login returns:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": { "...": "same as above" },
    "tokens": { "...": "same as above" },
    "aadhaar": { "status": "verified", "isVerified": true, "aadhaarMasked": "XXXX XXXX 4821", "verifiedAt": "...", "nameMatched": true },
    "nextSteps": ["complete_profile"]
  }
}
```
After 5 wrong passwords, the account is locked for 15 minutes (`423 ACCOUNT_LOCKED`). OTP login still works during the lock.

### 3.3 Session & password

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/auth/token/refresh` | – | `{ "refreshToken": "..." }` → `{ tokens }` |
| POST | `/auth/logout` | – | `{ "refreshToken": "..." }` |
| POST | `/auth/logout-all` | ✔ | – (logs out every device) |
| GET | `/auth/me` | ✔ | – → `{ user, aadhaar, nextSteps }` |
| POST | `/auth/password/forgot` | – | `{ "email": "..." }` **or** `{ "phone": "..." }` |
| POST | `/auth/password/reset` | – | `{ "phone": "...", "otp": "123456", "newPassword": "..." }` (or `email`) |
| POST | `/auth/password/change` | ✔ | `{ "currentPassword": "...", "newPassword": "..." }`. OTP-only users omit `currentPassword` to set their first password |
| POST | `/auth/verify/email/send` | ✔ | `{}` to verify the current email, or `{ "email": "new@x.com" }` to add one |
| POST | `/auth/verify/email/confirm` | ✔ | `{ "otp": "123456", "email": "new@x.com" }` |
| POST | `/auth/verify/phone/send` | ✔ | `{}` or `{ "phone": "9876543210" }` to add a phone |
| POST | `/auth/verify/phone/confirm` | ✔ | `{ "otp": "123456", "phone": "9876543210" }` |

### 3.4 Profile, Aadhaar, emergency contacts

All of these routes exist under **`/users/me`** (your own account) **and** under **`/dependents/:patientId`** (an elderly person you look after as a caregiver).

| Method | Path | Purpose |
|---|---|---|
| GET | `/users/me/profile` | Full profile |
| PATCH | `/users/me/profile` | Update any profile fields |
| GET | `/users/me/medical-summary` | Emergency medical card |
| GET | `/users/me/aadhaar` | Aadhaar verification status |
| POST | `/users/me/aadhaar/send-otp` | `{ "aadhaarNumber": "2345 6789 0123", "consent": true }` |
| POST | `/users/me/aadhaar/verify-otp` | `{ "otp": "123456" }` |
| GET | `/users/me/emergency-contacts` | List (max 5) |
| POST | `/users/me/emergency-contacts` | `{ "name", "relationship", "phone", "isPrimary"?, "notifyOnEmergency"? }` |
| PATCH | `/users/me/emergency-contacts/:contactId` | Any of the above fields |
| DELETE | `/users/me/emergency-contacts/:contactId` | Remove |
| DELETE | `/users/me` | Delete account: `{ "confirm": "DELETE" }` |

**GET /users/me/profile** response:
```json
{
  "success": true,
  "message": "OK",
  "data": {
    "user": { "id": "...", "fullName": "Lakshmi Devi", "phone": "+919876543210", "...": "..." },
    "profile": {
      "dateOfBirth": "1950-03-21",
      "gender": "female",
      "bloodGroup": "B+",
      "heightCm": 152,
      "weightKg": 58.5,
      "addressLine1": "12, Gandhi Street",
      "addressLine2": null,
      "city": "Chennai",
      "district": "Chennai",
      "state": "Tamil Nadu",
      "pincode": "600017",
      "homeLatitude": 13.0418,
      "homeLongitude": 80.2341,
      "chronicConditions": ["Type 2 Diabetes", "Hypertension"],
      "allergies": ["Penicillin"],
      "currentMedications": [{ "name": "Metformin", "dosage": "500 mg", "frequency": "twice daily", "timing": "after food" }],
      "disabilities": [],
      "mobilityAid": "walker",
      "hearingImpaired": true,
      "visionImpaired": false,
      "livesAlone": true,
      "abhaNumber": "12345678901234",
      "pmjayId": null,
      "insuranceProvider": "Star Health",
      "insurancePolicyNumber": "SH-778812",
      "preferredLanguage": "ta",
      "preferredContactMethod": "call",
      "largeTextMode": true,
      "voiceAssistance": false,
      "age": 76,
      "isSeniorCitizen": true,
      "updatedAt": "2026-10-02T10:05:00.000Z"
    },
    "aadhaar": { "status": "verified", "isVerified": true, "aadhaarMasked": "XXXX XXXX 0123", "verifiedAt": "...", "nameMatched": true },
    "emergencyContacts": [
      { "id": "...", "name": "Suresh Kumar", "relationship": "Son", "phone": "+919812345678", "isPrimary": true, "notifyOnEmergency": true, "createdAt": "...", "updatedAt": "..." }
    ],
    "profileCompletion": { "percentage": 100, "missingFields": [] }
  }
}
```
Use `profileCompletion` to drive a progress bar and "complete your profile" prompts.

Allowed values:
- `gender`: `male | female | other | prefer_not_to_say`
- `bloodGroup`: `A+ A- B+ B- AB+ AB- O+ O- unknown`
- `mobilityAid`: `none | walking_stick | walker | wheelchair | bedridden`
- `preferredContactMethod`: `call | sms | whatsapp`

`PATCH /profile` accepts any subset of the fields above, plus `fullName`. Send `null` to clear an optional field.

**Aadhaar flow**
1. `POST /aadhaar/send-otp` with `consent: true`. UIDAI sends an OTP to the mobile number linked with the Aadhaar. The response is `{ "status": "otp_sent", "aadhaarMasked": "XXXX XXXX 0123", "expiresInSeconds": 600 }`.
2. `POST /aadhaar/verify-otp` → `{ "status": "verified", "isVerified": true, "nameMatched": true, ... }`.

The full Aadhaar number is **never stored, logged or returned**. Only a keyed hash (which stops one Aadhaar being linked to two accounts) and the last 4 digits are kept. If `dateOfBirth` or `gender` are missing from the profile, they are filled in from Aadhaar.

**GET /users/me/medical-summary** returns a compact emergency card. It is meant for paramedics, hospital admission screens or a printable QR card:
```json
{
  "patientId": "...", "fullName": "Lakshmi Devi", "age": 76, "gender": "female", "isSeniorCitizen": true,
  "bloodGroup": "B+", "chronicConditions": ["Type 2 Diabetes"], "allergies": ["Penicillin"],
  "currentMedications": [{ "name": "Metformin", "dosage": "500 mg" }],
  "mobilityAid": "walker", "hearingImpaired": true, "visionImpaired": false, "livesAlone": true,
  "preferredLanguage": "ta", "identityVerified": true,
  "insurance": { "abhaNumber": "12345678901234", "pmjayId": null, "provider": "Star Health", "policyNumber": "SH-778812" },
  "primaryEmergencyContact": { "name": "Suresh Kumar", "relationship": "Son", "phone": "+919812345678" },
  "generatedAt": "..."
}
```

### 3.5 Caregivers / family members

Many elderly people have no smartphone or email. A son, daughter or caregiver can register for them and manage their profile.

| Method | Path | Purpose |
|---|---|---|
| POST | `/dependents` | Register an elderly person (phone optional) |
| GET | `/dependents` | List people I manage |
| POST | `/dependents/link/send-otp` | Link an **existing** account: `{ "phone": "..." }`. The OTP goes to the elder's phone |
| POST | `/dependents/link/verify` | `{ "phone", "otp", "relationship" }`. The elder shares the OTP, which counts as their consent |
| DELETE | `/dependents/:patientId` | Stop managing this person |
| * | `/dependents/:patientId/profile` … | Same profile/Aadhaar/contacts routes as `/users/me` |
| GET | `/users/me/caregivers` | (Elder) who can manage my profile |
| DELETE | `/users/me/caregivers/:linkId` | (Elder) revoke a caregiver |

```http
POST /api/v1/dependents
Authorization: Bearer <caregiver token>
{
  "fullName": "Lakshmi Devi",
  "relationship": "Mother",
  "dateOfBirth": "1950-03-21",
  "gender": "female",
  "bloodGroup": "B+",
  "chronicConditions": ["Hypertension"],
  "mobilityAid": "walker",
  "livesAlone": true,
  "preferredLanguage": "ta"
}
```
Returns `201` with the same body as `GET /profile` for the new dependent. If the elder later gets a phone, they can log in themselves with OTP.

### 3.6 Nearby hospitals & suggested doctors (live)

Live data from **OpenStreetMap** through the free public Overpass API (no key). All routes need a bearer token.

| Method | Path | Purpose |
|---|---|---|
| GET | `/hospitals/nearby?lat=&lng=` | Government and private hospitals near a point, nearest first |
| GET | `/hospitals/:hospitalId?lat=&lng=` | One hospital or clinic (`lat`/`lng` optional, adds the distance) |
| GET | `/users/me/suggested-doctors?lat=&lng=` | Doctors, clinics and hospitals for the conditions in the profile |
| GET | `/dependents/:patientId/suggested-doctors` | The same for an elder I manage |

`/hospitals/nearby` query: `radiusKm` (1-50, default 10), `type` (`all` \| `government` \| `private`), `emergencyOnly` (`true` = only hospitals tagged with 24/7 emergency), `limit` (1-100, default 50).

```json
{
  "origin": { "lat": 13.0827, "lng": 80.2707 },
  "radiusKm": 10,
  "counts": { "all": 489, "government": 40, "private": 449 },
  "hospitals": [
    {
      "id": "way-123456",
      "name": "Rajiv Gandhi Government General Hospital",
      "kind": "hospital",
      "ownership": "government",
      "ownershipSource": "name",
      "distanceKm": 0.7,
      "address": "Park Town, Chennai, 600003",
      "phone": null,
      "emergency": null,
      "beds": null,
      "specialities": [],
      "openingHours": null,
      "website": null,
      "location": { "lat": 13.0806, "lng": 80.2770 },
      "directionsUrl": "https://www.google.com/maps/dir/?api=1&destination=13.0806,80.2770",
      "osmUrl": "https://www.openstreetmap.org/way/123456"
    }
  ],
  "source": { "name": "OpenStreetMap", "attribution": "© OpenStreetMap contributors", "license": "ODbL" }
}
```

- **Government or private.** Few Indian hospitals have an ownership tag in OpenStreetMap, so `ownershipSource` says how it was decided: `tagged` (OSM `operator:type`), `name` (for example "Govt", "Corporation", "ESI", "PHC", "Taluk" mean government; "Pvt Ltd" and "Nursing Home" mean private) or `assumed` (no government sign, treated as private). Fields not in the map data are `null`.
- **Suggested doctors.** Each chronic condition in the profile is mapped to specialties (diabetes and thyroid go to a diabetologist, high BP to a cardiologist, arthritis to an orthopaedic doctor, and so on; see `src/services/places/specialties.js`). Clinics match by their OSM speciality tag or by name ("Joseph Eye Clinic", "Diabetes Care Centre"). Seniors also get an elderly-care group, and patients with no conditions get general physicians. Without `lat`/`lng` the saved home location is used; with neither, the error is `LOCATION_REQUIRED`.
- **Reliability.** Mirrors are tried in order (`OVERPASS_URLS`). Results are reused for `PLACES_CACHE_TTL_SECONDS` per area. If every mirror fails, the last good result for that area (up to 24 hours old) is served, or else `502 PLACES_SERVICE_UNAVAILABLE`. Lookups are limited to 120 per 15 minutes per IP. Only the rounded location is sent to Overpass, never health data.

---

## 4. Error codes

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid input (`details` lists each field) |
| 400 | `INVALID_JSON` | Body is not valid JSON |
| 400 | `OTP_INVALID` | Wrong OTP (`details.attemptsRemaining`) |
| 400 | `OTP_EXPIRED` | Expired or never requested |
| 400 | `OTP_ATTEMPTS_EXCEEDED` | 5 wrong tries; request a new OTP |
| 400 | `PASSWORD_NOT_SET` | Account only uses OTP login |
| 400 | `INVALID_AADHAAR` | Not a valid 12-digit Aadhaar (checksum is verified) |
| 400 | `AADHAAR_MOBILE_NOT_LINKED` | No mobile linked to the Aadhaar |
| 400 | `AADHAAR_OTP_INVALID` / `AADHAAR_OTP_EXPIRED` / `AADHAAR_OTP_ATTEMPTS_EXCEEDED` | Aadhaar OTP problems |
| 400 | `EMERGENCY_CONTACT_LIMIT` | More than 5 contacts |
| 401 | `AUTH_REQUIRED` / `INVALID_TOKEN` / `TOKEN_EXPIRED` | Missing, invalid or expired access token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `INVALID_REFRESH_TOKEN` | Session ended; log in again |
| 403 | `ACCOUNT_SUSPENDED` / `NOT_A_CAREGIVER` / `FORBIDDEN` | Not allowed |
| 404 | `PHONE_NOT_REGISTERED` | OTP login for an unknown number |
| 409 | `EMAIL_ALREADY_REGISTERED` / `PHONE_ALREADY_REGISTERED` | Duplicate account |
| 409 | `AADHAAR_ALREADY_VERIFIED` / `AADHAAR_LINKED_TO_ANOTHER_ACCOUNT` | Aadhaar conflicts |
| 423 | `ACCOUNT_LOCKED` | Too many wrong passwords (`details.retryAfterSeconds`) |
| 429 | `OTP_COOLDOWN` | Resent too fast (`details.retryAfterSeconds`; use it for a countdown timer) |
| 429 | `OTP_LIMIT_REACHED` / `RATE_LIMITED` | Too many requests |
| 400 | `LOCATION_REQUIRED` | Suggested doctors without a device or saved home location |
| 404 | `HOSPITAL_NOT_FOUND` | Unknown hospital id |
| 502 | `SMS_DELIVERY_FAILED` / `EMAIL_DELIVERY_FAILED` / `AADHAAR_SERVICE_UNAVAILABLE` / `PLACES_SERVICE_UNAVAILABLE` | Third-party service down |

---

## 5. Security notes

- Passwords are hashed with bcrypt (12 rounds). OTPs and refresh tokens are stored only as hashes.
- OTPs: 6 digits, valid for 5 minutes, single-use, at most 5 wrong attempts, 30-second resend cooldown, at most 5 per hour per number.
- Refresh tokens are rotated on every use. If an old refresh token is reused, all of that user's sessions are revoked.
- Supabase Row Level Security is on with no policies, so the public `anon` key cannot read anything. Only this backend (service-role key) can.
- Request bodies are never logged. Keys like `password`, `otp`, `aadhaar*` and `*token` are redacted from all logs.
- Important actions (login, Aadhaar verification, profile edits, caregiver changes, account deletion) are written to `audit_logs`.

## 6. Going to production

- **SMS:** use `SMS_PROVIDER=msg91` (recommended for India) or `SMS_PROVIDER=twilio`. Indian SMS requires **DLT registration** of your business, sender ID and every message template. With MSG91 the message text lives in the approved template and the backend only sends the variables. Setup:
  1. **DLT registration** on an operator portal (for example Jio TrueConnect, Airtel DLT or Vi). Register as a Principal Entity (needs PAN and a business or organisation document). You receive an **Entity ID**.
  2. On the DLT portal, register a 6-letter **Header** (sender ID), for example `MEDSFT`, of type *Transactional / Service-Implicit*.
  3. Register two **content templates**, category *Service Implicit*, linked to that header. `{#var#}` is DLT's variable placeholder:
     - OTP: `{#var#} is your MedShift360 verification code. It is valid for {#var#} minutes. Do not share it with anyone. - MedShift360`
     - Caregiver: `{#var#} wants to help manage your MedShift360 health profile. If you agree, share OTP {#var#} with them. Valid for {#var#} minutes. Ignore if you do not know them. - MedShift360`
  4. In **MSG91** (msg91.com), add the Entity ID and Header, then create two SMS templates with the *same text* and the DLT Template IDs, using MSG91 variables in place of `{#var#}`:
     - OTP: `##otp## is your MedShift360 verification code. It is valid for ##minutes## minutes. ...`
     - Caregiver: `##name## wants to help manage ... share OTP ##otp## with them. Valid for ##minutes## minutes. ...`

     The variable names must be exactly `otp`, `minutes` and `name`.
  5. In `.env`, set `SMS_PROVIDER=msg91`, `MSG91_AUTH_KEY`, `MSG91_OTP_TEMPLATE_ID`, `MSG91_CAREGIVER_TEMPLATE_ID` (the MSG91 template IDs), and `OTP_DEV_ECHO=false`.
- **Aadhaar:** real Aadhaar OTP e-KYC is only available through a UIDAI-licensed AUA/KUA or an authorised e-KYC partner. Add an adapter in `src/services/aadhaar/providers/` that implements the contract described in `providers/index.js`.
- **Housekeeping:** schedule `purge_expired_otps()` daily with Supabase Cron (see the bottom of the migration file).

## 7. Project structure

```
backend/
├── supabase/migrations/001_auth_and_profiles.sql   # tables, constraints, triggers, RLS
├── src/
│   ├── server.js            # starts the HTTP server
│   ├── app.js               # express app, security middleware
│   ├── config/              # env validation, Supabase client
│   ├── routes/              # URL → controller mapping
│   ├── controllers/         # request/response handling
│   ├── services/            # business logic (OTP, tokens, Aadhaar, profile, caregivers,
│   │   └── places/          #   live hospitals/doctors from OpenStreetMap)
│   ├── validators/          # Zod request schemas
│   ├── middleware/          # auth, validation, rate limits, errors
│   └── utils/               # phone/Aadhaar/age helpers, crypto, logger
└── tests/                   # node:test suites (npm test)
```
