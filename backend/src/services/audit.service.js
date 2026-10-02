const supabase = require('../config/supabase');
const logger = require('../utils/logger');

/**
 * Records an important action. Never throws - a failed audit write is
 * logged but does not break the user's request.
 * Never put Aadhaar numbers, OTPs or passwords in `metadata`.
 */
async function audit({ actorId = null, subjectId = null, action, metadata = {}, ip = null }) {
  const { error } = await supabase.from('audit_logs').insert({
    actor_user_id: actorId,
    subject_user_id: subjectId ?? actorId,
    action,
    metadata,
    ip_address: ip,
  });
  if (error) logger.error('Audit log write failed', { action, error: error.message });
}

module.exports = { audit };
