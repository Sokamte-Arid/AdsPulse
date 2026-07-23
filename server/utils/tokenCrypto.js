/**
 * tokenCrypto.js — AES-256-GCM encryption for platform OAuth tokens at rest.
 *
 * Requires TOKEN_ENCRYPTION_KEY in .env (64 hex chars = 32 bytes).
 * Each token gets a unique random IV so identical tokens produce different ciphertext.
 *
 * Format stored in DB:  iv:authTag:ciphertext  (all hex)
 */

const crypto = require('crypto');

const ALGO       = 'aes-256-gcm';
const KEY_HEX    = process.env.TOKEN_ENCRYPTION_KEY;
const ENCRYPTED_PREFIX = 'enc:';

function getKey() {
  if (!KEY_HEX || KEY_HEX.length !== 64) {
    throw new Error('[FATAL] TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Generate one with: node -e "require(\'crypto\').randomBytes(32).toString(\'hex\')"');
  }
  return Buffer.from(KEY_HEX, 'hex');
}

/**
 * Encrypt a plaintext token string.
 * Returns a string in the format: enc:iv:authTag:ciphertext
 */
function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  // Already encrypted — don't double-encrypt
  if (plaintext.startsWith(ENCRYPTED_PREFIX)) return plaintext;

  const key    = getKey();
  const iv     = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt a stored token string.
 * Returns the original plaintext, or the input unchanged if not encrypted.
 */
function decrypt(stored) {
  if (!stored) return stored;
  if (!stored.startsWith(ENCRYPTED_PREFIX)) return stored; // plaintext (legacy)

  const parts = stored.slice(ENCRYPTED_PREFIX.length).split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted token format');

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key      = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

module.exports = { encrypt, decrypt };
