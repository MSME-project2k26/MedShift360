# MedShift360 Patient App (Frontend)

React 19 + TypeScript + Vite + Tailwind patient app. It talks to the API in [`../backend`](../backend/README.md).

## Setup

```bash
cd frontend
cp .env.example .env      # VITE_API_BASE_URL=http://localhost:4000/api/v1
npm install
npm run dev               # http://localhost:5173 (already allowed in the backend's CORS_ORIGINS)
```

Start the backend first (`cd backend && npm run dev`).

Other scripts: `npm run lint`, `npm run build`, `npm run preview`.

## How it connects to the backend

| Screen | API |
|---|---|
| Sign Up → OTP | `POST /auth/register/phone/send-otp`, `POST /auth/register/phone/verify`, then the guardian is saved with `POST /users/me/emergency-contacts` |
| Login (OTP) | `POST /auth/login/phone/send-otp`, `POST /auth/login/phone/verify` |
| Login (Email) | `POST /auth/login/email` |
| Verify Aadhaar (`/aadhaar`) | `POST /users/me/aadhaar/send-otp`, `POST /users/me/aadhaar/verify-otp` |
| Profile | `GET /users/me/profile`, `POST /auth/logout` |

- `src/lib/api.ts` is the single API client. It unwraps the backend's `{ success, data | error }` envelope, throws `ApiError` with the stable `error.code`, and on `TOKEN_EXPIRED` refreshes the session once (the refresh token rotates) and retries.
- `src/components/AuthProvider.tsx` keeps the logged-in user. `RequireAuth` protects every page except login, signup and OTP.
- Aadhaar is an identity **verification** step for a logged-in user. It is offered right after sign-up (skippable) and from the Profile page. It is not a login method.

## Development mode

With the backend's `OTP_DEV_ECHO=true`, the OTP screen shows the OTP from the API response (only in `npm run dev`). The mock Aadhaar provider always accepts `123456`. `2847 3619 2056` is a test Aadhaar number that passes the checksum.

Hospital, pharmacy, ambulance and insurance pages still use the local JSON in `src/data/`, because the backend has no APIs for them yet.
