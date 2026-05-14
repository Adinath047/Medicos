// server/utils/crypto.js
// AES-256-GCM field-level encryption — zero external dependencies
// Used to protect patient PII at rest in the SQLite database.
//
// Format stored in DB: "<iv_hex>:<ciphertext_hex>:<authtag_hex>"
// IV is 96-bit (12 bytes) random per encryption — never reused.
// GCM authentication tag prevents silent tampering.

'use strict';
const crypto = require('crypto');
const ALGO   = 'aes-256-gcm';

// ── Key loading ────────────────────────────────────────────────────────────────
let _key = null;

function getKey() {
  if (_key) return _key;
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[FATAL] FIELD_ENCRYPTION_KEY must be 32-byte hex (64 chars). Set it in .env');
      process.exit(1);
    }
    // Dev fallback — deterministic but clearly wrong for production
    console.warn('[crypto] FIELD_ENCRYPTION_KEY not set — using dev fallback key. NOT FOR PRODUCTION.');
    _key = Buffer.alloc(32, 0xde); // 0xde * 32 = obvious dev placeholder
    return _key;
  }
  _key = Buffer.from(hex, 'hex');
  return _key;
}

// ── Encrypt a plaintext string → stored string ────────────────────────────────
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;
  const text = String(plaintext);
  const key  = getKey();
  const iv   = crypto.randomBytes(12); // 96-bit GCM IV
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc  = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag(); // 128-bit auth tag
  return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

// ── Decrypt a stored string → plaintext ────────────────────────────────────────
function decrypt(stored) {
  if (!stored || typeof stored !== 'string') return stored;
  // Already-plaintext values (migration period) — detect by absence of ':'
  const parts = stored.split(':');
  if (parts.length !== 3) return stored; // Not encrypted — return as-is
  const [ivHex, encHex, tagHex] = parts;
  try {
    const key      = getKey();
    const iv       = Buffer.from(ivHex,  'hex');
    const enc      = Buffer.from(encHex, 'hex');
    const tag      = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(enc, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    // Decryption failure — return a safe sentinel rather than crashing
    console.error('[crypto] Decryption failed — wrong key or tampered data');
    return '[DECRYPTION_ERROR]';
  }
}

// ── HMAC fingerprint for searchable fields ────────────────────────────────────
// Allows equality lookups (WHERE phone_hash = ?) without storing plaintext.
// Use a separate HMAC key so hash output cannot be reversed to plaintext.
function hmacFingerprint(value) {
  if (!value) return null;
  const key = process.env.FIELD_HMAC_KEY || process.env.FIELD_ENCRYPTION_KEY || 'dev-hmac-key';
  return crypto
    .createHmac('sha256', key)
    .update(String(value).toLowerCase().trim())
    .digest('hex');
}

// ── Encrypt a record's sensitive fields in-place ──────────────────────────────
// Pass the plain row object and a list of field names to encrypt.
// Returns a new object with encrypted values + optional hash fields.
function encryptFields(row, fields, { addHashes = [] } = {}) {
  const out = { ...row };
  for (const f of fields) {
    if (out[f] !== null && out[f] !== undefined) {
      out[f] = encrypt(String(out[f]));
    }
  }
  for (const f of addHashes) {
    if (row[f]) out[`${f}_hash`] = hmacFingerprint(row[f]);
  }
  return out;
}

// ── Decrypt a record's sensitive fields in-place ──────────────────────────────
function decryptFields(row, fields) {
  if (!row) return row;
  const out = { ...row };
  for (const f of fields) {
    if (out[f]) out[f] = decrypt(out[f]);
  }
  return out;
}

module.exports = { encrypt, decrypt, hmacFingerprint, encryptFields, decryptFields };
