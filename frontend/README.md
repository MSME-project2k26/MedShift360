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
| Profile | `GET /users/me/profile` |
| Settings | `POST /auth/logout` (plus the theme, stored on the device) |
| Hospitals (`/hospital`) | `GET /hospitals/nearby` (Government / Private / All, distance slider, map) |
| Hospital details (`/hospital/:id`) | `GET /hospitals/:id` |
| Suggested doctors (`/suggestion`) and Home | `GET /users/me/suggested-doctors`, `GET /hospitals/nearby` |

- `src/lib/api.ts` is the single API client. It unwraps the backend's `{ success, data | error }` envelope, throws `ApiError` with the stable `error.code`, and on `TOKEN_EXPIRED` refreshes the session once (the refresh token rotates) and retries.
- `src/components/AuthProvider.tsx` keeps the logged-in user. `RequireAuth` protects every page except login, signup and OTP.
- Aadhaar is an identity **verification** step for a logged-in user. It is offered right after sign-up (skippable) and from the Profile page. It is not a login method.

## UI

- **Mobile only.** Screens 768px or wider (and taller than 600px) show an "open on your phone" notice instead of the app (`src/components/MobileOnly.tsx`). Landscape phones still work. On desktop, use the browser's device toolbar (F12 → phone icon).
- **Theme.** White surfaces with the MedShift blue `#13A4EC`. All colors are tokens in `src/index.css` (`--brand`, `--background`, `--card`, ...).
- **Dark mode.** Settings → Appearance → Light / Dark / System. The choice is saved in `localStorage` and applied before first paint (`index.html`, `src/lib/theme.ts`). Pages that still use fixed classes such as `bg-white` or `text-sky-950` are mapped to the dark tokens at the bottom of `src/index.css`. New code should use the token classes (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) instead.

## Development mode

With the backend's `OTP_DEV_ECHO=true`, the OTP screen shows the OTP from the API response (only in `npm run dev`). The mock Aadhaar provider always accepts `123456`. `2847 3619 2056` is a test Aadhaar number that passes the checksum.

Hospitals and doctors are live OpenStreetMap data. The location comes from the phone's GPS (`src/lib/location.ts`), falling back to the home location saved in the profile. Browsers only allow GPS on `https` or `localhost`, so opening the app by LAN IP on a phone uses the home location. The pharmacy page still uses `src/data/medicines.json`, and ambulance booking is still a mock.
