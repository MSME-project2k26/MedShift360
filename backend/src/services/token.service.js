const jwt = require('jsonwebtoken');
const env = require('../config/env');
const supabase = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { unwrap } = require('../utils/db');
const { randomToken, sha256 } = require('../utils/crypto');

const JWT_ISSUER = 'medshift360-api';
const JWT_AUDIENCE = 'medshift360-app';
// A revoked refresh token used again after this grace period is treated as
// stolen and all of the user's sessions are revoked. The grace period
// tolerates two browser tabs refreshing at the same moment.
const REUSE_GRACE_SECONDS = 60;

function signAccessToken(user, sessionId) {
  return jwt.sign({ sub: user.id, role: user.role, sid: sessionId }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function buildTokenResponse(accessToken, refreshToken, refreshExpiresAt) {
  const { exp, iat } = jwt.decode(accessToken);
  return {
    tokenType: 'Bearer',
    accessToken,
    accessTokenExpiresIn: exp - iat,
    refreshToken,
    refreshTokenExpiresAt: refreshExpiresAt,
  };
}

async function insertSession(userId, meta) {
  const refreshToken = randomToken(48);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const session = unwrap(
    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        refresh_token_hash: sha256(refreshToken),
        user_agent: meta.userAgent || null,
        ip_address: meta.ip || null,
        expires_at: expiresAt,
      })
      .select('id')
      .single(),
  );
  return { session, refreshToken, expiresAt };
}

/** Starts a new login session and returns access + refresh tokens. */
async function createSession(user, meta = {}) {
  const { session, refreshToken, expiresAt } = await insertSession(user.id, meta);
  return buildTokenResponse(signAccessToken(user, session.id), refreshToken, expiresAt);
}

async function revokeAllSessions(userId, { exceptSessionId } = {}) {
  let query = supabase
    .from('user_sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
  if (exceptSessionId) query = query.neq('id', exceptSessionId);
  unwrap(await query);
}

/** Exchanges a refresh token for a new token pair (rotation). */
async function rotateSession(refreshToken, meta = {}) {
  const session = unwrap(
    await supabase
      .from('user_sessions')
      .select('*, user:users(id, role, status)')
      .eq('refresh_token_hash', sha256(refreshToken))
      .maybeSingle(),
  );

  const invalid = ApiError.unauthorized('INVALID_REFRESH_TOKEN', 'Your session has ended. Please log in again.');
  if (!session) throw invalid;

  if (session.revoked_at) {
    const secondsSinceRevoked = (Date.now() - new Date(session.revoked_at).getTime()) / 1000;
    if (session.replaced_by && secondsSinceRevoked > REUSE_GRACE_SECONDS) {
      await revokeAllSessions(session.user_id);
    }
    throw invalid;
  }
  if (new Date(session.expires_at) < new Date()) throw invalid;
  if (!session.user || session.user.status !== 'active') throw invalid;

  const next = await insertSession(session.user_id, meta);
  const rotated = unwrap(
    await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString(), replaced_by: next.session.id, last_used_at: new Date().toISOString() })
      .eq('id', session.id)
      .is('revoked_at', null)
      .select('id'),
  );
  if (!rotated.length) {
    // Another request rotated this token first
    await supabase.from('user_sessions').update({ revoked_at: new Date().toISOString() }).eq('id', next.session.id);
    throw invalid;
  }

  return buildTokenResponse(signAccessToken(session.user, next.session.id), next.refreshToken, next.expiresAt);
}

async function revokeSessionByToken(refreshToken) {
  unwrap(
    await supabase
      .from('user_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('refresh_token_hash', sha256(refreshToken))
      .is('revoked_at', null),
  );
}

module.exports = {
  JWT_ISSUER,
  JWT_AUDIENCE,
  createSession,
  rotateSession,
  revokeSessionByToken,
  revokeAllSessions,
};
