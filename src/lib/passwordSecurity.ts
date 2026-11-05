import crypto from 'crypto';

/**
 * DR.FIX Staff Password Security Engine
 * - Uses scrypt with 16-byte cryptographically secure salt.
 * - Format: scrypt:<salt_hex>:<derived_key_hex>
 * - Provides seamless backward compatibility and automatic migration for existing plaintext passwords.
 */

const SCRYPT_KEYLEN = 64;

export function hashPasswordScrypt(password: string): string {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPasswordScrypt(
  passwordAttempt: string,
  storedValue: string | null | undefined
): { valid: boolean; needsUpgrade: boolean } {
  if (!storedValue || typeof storedValue !== 'string') {
    return { valid: false, needsUpgrade: false };
  }

  const cleanAttempt = String(passwordAttempt || '').trim();
  const cleanStored = String(storedValue).trim();

  // 1. Scrypt Hash Check
  if (cleanStored.startsWith('scrypt:')) {
    const parts = cleanStored.split(':');
    if (parts.length !== 3) {
      return { valid: false, needsUpgrade: false };
    }
    const [, salt, expectedHex] = parts;
    try {
      const derivedKey = crypto.scryptSync(cleanAttempt, salt, SCRYPT_KEYLEN);
      const expectedKey = Buffer.from(expectedHex, 'hex');

      if (derivedKey.length !== expectedKey.length) {
        return { valid: false, needsUpgrade: false };
      }

      const valid = crypto.timingSafeEqual(derivedKey, expectedKey);
      return { valid, needsUpgrade: false };
    } catch (err) {
      console.error('[Password Security] Error during scrypt verification:', err);
      return { valid: false, needsUpgrade: false };
    }
  }

  // 2. Legacy Plaintext Migration Check
  // Compare exact string match or case-insensitive fallback if applicable
  const valid = cleanStored === cleanAttempt;
  return {
    valid,
    needsUpgrade: valid // If plaintext matched, it must be upgraded immediately
  };
}

export function maskPassword(): string {
  return '••••••••';
}
