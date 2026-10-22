import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from './env.ts';

const KEY_PREFIX = 'rpx_';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function looksLikeApiKey(value: string): boolean {
  return value.startsWith(KEY_PREFIX);
}

// 32 random bytes -> 43 url-safe chars. The visible prefix lets users tell
// keys apart without exposing the secret.
export function mintApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = KEY_PREFIX + randomBytes(32).toString('base64url');
  return { raw, prefix: raw.slice(0, 12), hash: sha256(raw) };
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function encryptionKey(): Buffer {
  const key = Buffer.from(env.tokenEncryptionKey, 'base64');
  if (key.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  }
  return key;
}

export function canEncrypt(): boolean {
  try {
    encryptionKey();
    return true;
  } catch {
    return false;
  }
}

// AES-256-GCM; stored as base64(iv | tag | ciphertext).
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

export function decryptSecret(stored: string): string {
  const buf = Buffer.from(stored, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}
