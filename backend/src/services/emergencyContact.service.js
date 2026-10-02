const supabase = require('../config/supabase');
const ApiError = require('../utils/ApiError');
const { unwrap } = require('../utils/db');

const MAX_CONTACTS = 5;

function toApi(row) {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    phone: row.phone,
    isPrimary: row.is_primary,
    notifyOnEmergency: row.notify_on_emergency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function list(userId) {
  const rows = unwrap(
    await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true }),
  );
  return rows.map(toApi);
}

async function clearPrimary(userId) {
  unwrap(await supabase.from('emergency_contacts').update({ is_primary: false }).eq('user_id', userId).eq('is_primary', true));
}

async function create(userId, input, ownPhone) {
  if (ownPhone && input.phone === ownPhone) {
    throw ApiError.badRequest('INVALID_EMERGENCY_CONTACT', 'Your emergency contact must be a different person\'s number.');
  }
  const existing = await list(userId);
  if (existing.length >= MAX_CONTACTS) {
    throw ApiError.badRequest('EMERGENCY_CONTACT_LIMIT', `You can add up to ${MAX_CONTACTS} emergency contacts.`);
  }

  // The first contact is always primary
  const isPrimary = existing.length === 0 ? true : Boolean(input.isPrimary);
  if (isPrimary) await clearPrimary(userId);

  const row = unwrap(
    await supabase
      .from('emergency_contacts')
      .insert({
        user_id: userId,
        name: input.name,
        relationship: input.relationship,
        phone: input.phone,
        is_primary: isPrimary,
        notify_on_emergency: input.notifyOnEmergency ?? true,
      })
      .select('*')
      .single(),
  );
  return toApi(row);
}

async function getOwned(userId, contactId) {
  const row = unwrap(
    await supabase.from('emergency_contacts').select('*').eq('id', contactId).eq('user_id', userId).maybeSingle(),
  );
  if (!row) throw ApiError.notFound('EMERGENCY_CONTACT_NOT_FOUND', 'Emergency contact not found.');
  return row;
}

async function update(userId, contactId, input) {
  const current = await getOwned(userId, contactId);
  if (input.isPrimary === false && current.is_primary) {
    throw ApiError.badRequest('PRIMARY_CONTACT_REQUIRED', 'Make another contact primary first.');
  }
  if (input.isPrimary === true && !current.is_primary) await clearPrimary(userId);

  const patch = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.relationship !== undefined) patch.relationship = input.relationship;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.isPrimary !== undefined) patch.is_primary = input.isPrimary;
  if (input.notifyOnEmergency !== undefined) patch.notify_on_emergency = input.notifyOnEmergency;

  const row = unwrap(
    await supabase.from('emergency_contacts').update(patch).eq('id', contactId).eq('user_id', userId).select('*').single(),
  );
  return toApi(row);
}

async function remove(userId, contactId) {
  const current = await getOwned(userId, contactId);
  unwrap(await supabase.from('emergency_contacts').delete().eq('id', contactId).eq('user_id', userId));

  // Promote the oldest remaining contact if the primary was removed
  if (current.is_primary) {
    const [next] = await list(userId);
    if (next) unwrap(await supabase.from('emergency_contacts').update({ is_primary: true }).eq('id', next.id));
  }
}

module.exports = { list, create, update, remove, MAX_CONTACTS };
