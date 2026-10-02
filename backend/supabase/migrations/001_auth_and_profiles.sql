-- =====================================================================
-- MedShift360 - Migration 001
-- Users, authentication (OTP + sessions), patient profiles, Aadhaar
-- verification, emergency contacts, caregiver links and audit logs.
--
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Shared trigger: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- USERS
-- One row per login identity. A user registers with an email+password,
-- a mobile number (OTP), or is created by a caregiver as a "managed"
-- account (elderly person without their own phone/email).
-- ---------------------------------------------------------------------
create table public.users (
  id                    uuid primary key default gen_random_uuid(),
  full_name             text not null check (char_length(full_name) between 2 and 100),
  email                 text unique,
  phone                 text unique,
  password_hash         text,
  role                  text not null default 'patient'
                          check (role in ('patient', 'hospital_staff', 'admin')),
  account_type          text not null default 'self'
                          check (account_type in ('self', 'managed')),
  email_verified        boolean not null default false,
  phone_verified        boolean not null default false,
  status                text not null default 'active'
                          check (status in ('active', 'suspended', 'deleted')),
  failed_login_attempts integer not null default 0,
  locked_until          timestamptz,
  last_login_at         timestamptz,
  created_by            uuid references public.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  constraint users_email_lowercase check (email is null or email = lower(email)),
  constraint users_phone_e164      check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint users_contact_required
    check (account_type = 'managed' or status = 'deleted' or email is not null or phone is not null)
);

create index users_role_idx on public.users (role);

create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- PATIENT PROFILES (1:1 with users where role = 'patient')
-- Elderly-focused: chronic conditions, medications, mobility aids,
-- sensory impairments, living alone, accessibility preferences.
-- ---------------------------------------------------------------------
create table public.patient_profiles (
  user_id                  uuid primary key references public.users(id) on delete cascade,
  date_of_birth            date check (date_of_birth > date '1900-01-01'),
  gender                   text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_group              text check (blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  height_cm                numeric(5,1) check (height_cm between 30 and 260),
  weight_kg                numeric(5,1) check (weight_kg between 2 and 350),

  address_line1            text,
  address_line2            text,
  city                     text,
  district                 text,
  state                    text,
  pincode                  text check (pincode ~ '^[1-9][0-9]{5}$'),
  home_latitude            double precision check (home_latitude between -90 and 90),
  home_longitude           double precision check (home_longitude between -180 and 180),

  chronic_conditions       text[] not null default '{}',
  allergies                text[] not null default '{}',
  current_medications      jsonb  not null default '[]'::jsonb,
  disabilities             text[] not null default '{}',
  mobility_aid             text not null default 'none'
                             check (mobility_aid in ('none', 'walking_stick', 'walker', 'wheelchair', 'bedridden')),
  hearing_impaired         boolean not null default false,
  vision_impaired          boolean not null default false,
  lives_alone              boolean not null default false,

  abha_number              text check (abha_number ~ '^[0-9]{14}$'),
  pmjay_id                 text,
  insurance_provider       text,
  insurance_policy_number  text,

  preferred_language       text not null default 'en',
  preferred_contact_method text not null default 'call'
                             check (preferred_contact_method in ('call', 'sms', 'whatsapp')),
  large_text_mode          boolean not null default false,
  voice_assistance         boolean not null default false,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create trigger patient_profiles_set_updated_at
before update on public.patient_profiles
for each row execute function public.set_updated_at();

-- Every patient automatically gets an (empty) profile row
create or replace function public.create_patient_profile()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'patient' then
    insert into public.patient_profiles (user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger users_create_patient_profile
after insert on public.users
for each row execute function public.create_patient_profile();

-- ---------------------------------------------------------------------
-- AADHAAR VERIFICATION
-- The full Aadhaar number is NEVER stored (Aadhaar Act / UIDAI rules).
-- We keep a keyed HMAC hash (to stop one Aadhaar being linked to two
-- accounts) and the last 4 digits for display.
-- ---------------------------------------------------------------------
create table public.aadhaar_verifications (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references public.users(id) on delete cascade,
  aadhaar_hash           text not null,
  aadhaar_last4          char(4) not null,
  status                 text not null check (status in ('otp_sent', 'verified', 'failed')),
  provider               text not null,
  provider_reference_id  text,
  otp_attempts           integer not null default 0,
  consent_given_at       timestamptz not null,
  verified_name          text,
  verified_dob           date,
  verified_gender        text,
  name_matched           boolean,
  verified_at            timestamptz,
  failure_reason         text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- One Aadhaar can be verified against only one account
create unique index aadhaar_verified_hash_key
  on public.aadhaar_verifications (aadhaar_hash)
  where status = 'verified';

create trigger aadhaar_verifications_set_updated_at
before update on public.aadhaar_verifications
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- EMERGENCY CONTACTS (max 5 per user, enforced in the API)
-- ---------------------------------------------------------------------
create table public.emergency_contacts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  name                text not null check (char_length(name) between 2 and 100),
  relationship        text not null,
  phone               text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  is_primary          boolean not null default false,
  notify_on_emergency boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, phone)
);

create index emergency_contacts_user_idx on public.emergency_contacts (user_id);
create unique index emergency_contacts_one_primary
  on public.emergency_contacts (user_id) where is_primary;

create trigger emergency_contacts_set_updated_at
before update on public.emergency_contacts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- CAREGIVER LINKS
-- A family member / caregiver can manage an elderly person's profile.
-- ---------------------------------------------------------------------
create table public.caregiver_links (
  id                  uuid primary key default gen_random_uuid(),
  caregiver_id        uuid not null references public.users(id) on delete cascade,
  patient_id          uuid not null references public.users(id) on delete cascade,
  relationship        text not null,
  status              text not null default 'active' check (status in ('active', 'revoked')),
  can_manage_profile  boolean not null default true,
  can_book_on_behalf  boolean not null default true,
  created_at          timestamptz not null default now(),
  revoked_at          timestamptz,
  constraint caregiver_not_self check (caregiver_id <> patient_id)
);

create unique index caregiver_links_active_key
  on public.caregiver_links (caregiver_id, patient_id) where status = 'active';
create index caregiver_links_patient_idx on public.caregiver_links (patient_id);

-- ---------------------------------------------------------------------
-- OTP CODES (only a keyed hash of the code is stored)
-- ---------------------------------------------------------------------
create table public.otp_codes (
  id            uuid primary key default gen_random_uuid(),
  target        text not null,  -- E.164 phone number or lower-case email
  channel       text not null check (channel in ('sms', 'email')),
  purpose       text not null check (purpose in (
                  'register', 'login', 'verify_phone', 'verify_email',
                  'reset_password', 'caregiver_link')),
  code_hash     text not null,
  attempts      integer not null default 0,
  max_attempts  integer not null default 5,
  expires_at    timestamptz not null,
  consumed_at   timestamptz,
  requested_by  uuid references public.users(id) on delete cascade,
  ip_address    text,
  created_at    timestamptz not null default now()
);

create index otp_codes_lookup_idx on public.otp_codes (target, purpose, created_at desc);

-- ---------------------------------------------------------------------
-- USER SESSIONS (refresh tokens, stored as SHA-256 hashes, rotated)
-- ---------------------------------------------------------------------
create table public.user_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  refresh_token_hash  text not null unique,
  user_agent          text,
  ip_address          text,
  expires_at          timestamptz not null,
  revoked_at          timestamptz,
  replaced_by         uuid references public.user_sessions(id) on delete set null,
  last_used_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index user_sessions_user_idx on public.user_sessions (user_id) where revoked_at is null;

-- ---------------------------------------------------------------------
-- AUDIT LOGS
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id              bigint generated always as identity primary key,
  actor_user_id   uuid references public.users(id) on delete set null,
  subject_user_id uuid references public.users(id) on delete set null,
  action          text not null,
  metadata        jsonb not null default '{}'::jsonb,
  ip_address      text,
  created_at      timestamptz not null default now()
);

create index audit_logs_subject_idx on public.audit_logs (subject_user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Housekeeping: delete OTPs older than 1 day.
-- Schedule with Supabase Cron (pg_cron):
--   select cron.schedule('purge-otps', '0 3 * * *', 'select public.purge_expired_otps()');
-- ---------------------------------------------------------------------
create or replace function public.purge_expired_otps()
returns void
language sql
as $$
  delete from public.otp_codes where created_at < now() - interval '1 day';
$$;

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- RLS is enabled with NO policies, so the public anon/authenticated
-- keys cannot read or write anything. Only the backend, using the
-- service_role key, can access these tables.
-- ---------------------------------------------------------------------
alter table public.users                 enable row level security;
alter table public.patient_profiles      enable row level security;
alter table public.aadhaar_verifications enable row level security;
alter table public.emergency_contacts    enable row level security;
alter table public.caregiver_links       enable row level security;
alter table public.otp_codes             enable row level security;
alter table public.user_sessions         enable row level security;
alter table public.audit_logs            enable row level security;

revoke all on all tables in schema public from anon, authenticated;
