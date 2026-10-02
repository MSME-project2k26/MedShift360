const supabase = require('../config/supabase');
const { unwrap } = require('../utils/db');

const USER_COLUMNS =
  'id, full_name, email, phone, password_hash, role, account_type, email_verified, phone_verified, status, ' +
  'failed_login_attempts, locked_until, last_login_at, created_at, updated_at';

async function findById(id) {
  return unwrap(await supabase.from('users').select(USER_COLUMNS).eq('id', id).maybeSingle());
}

async function findByEmail(email) {
  return unwrap(await supabase.from('users').select(USER_COLUMNS).eq('email', email).maybeSingle());
}

async function findByPhone(phone) {
  return unwrap(await supabase.from('users').select(USER_COLUMNS).eq('phone', phone).maybeSingle());
}

async function createUser(fields) {
  return unwrap(await supabase.from('users').insert(fields).select(USER_COLUMNS).single());
}

async function updateUser(id, fields) {
  return unwrap(await supabase.from('users').update(fields).eq('id', id).select(USER_COLUMNS).single());
}

/** The user object returned to the frontend - never includes the password hash. */
function toPublicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    accountType: user.account_type,
    emailVerified: user.email_verified,
    phoneVerified: user.phone_verified,
    hasPassword: Boolean(user.password_hash),
    status: user.status,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
  };
}

module.exports = { findById, findByEmail, findByPhone, createUser, updateUser, toPublicUser };
