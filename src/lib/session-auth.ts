import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { appSettings } from '../db/schema.ts';

const SESSION_KEY_SETTING = 'session_signing_key';
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

let cachedDbSecret: string | null = null;
let secretInitPromise: Promise<string> | null = null;

function scryptAsync(
  password: string,
  salt: string,
  keylen: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

async function getSessionSecret(): Promise<string> {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret) {
    return envSecret;
  }
  if (cachedDbSecret) {
    return cachedDbSecret;
  }
  if (!secretInitPromise) {
    secretInitPromise = (async () => {
      try {
        const existing = await db
          .select()
          .from(appSettings)
          .where(eq(appSettings.key, SESSION_KEY_SETTING))
          .limit(1);

        if (existing.length > 0 && existing[0].value) {
          cachedDbSecret = existing[0].value;
          return cachedDbSecret;
        }

        const generated = crypto.randomBytes(32).toString('hex');
        const inserted = await db
          .insert(appSettings)
          .values({ key: SESSION_KEY_SETTING, value: generated })
          .onConflictDoNothing()
          .returning();

        if (inserted.length > 0 && inserted[0].value) {
          cachedDbSecret = inserted[0].value;
          return cachedDbSecret;
        }

        const reread = await db
          .select()
          .from(appSettings)
          .where(eq(appSettings.key, SESSION_KEY_SETTING))
          .limit(1);
        if (reread.length > 0 && reread[0].value) {
          cachedDbSecret = reread[0].value;
          return cachedDbSecret;
        }
      } catch (err) {
        console.error('Failed to load shared session signing key:', err);
      } finally {
        secretInitPromise = null;
      }
      return EPHEMERAL_FALLBACK_SECRET;
    })();
  }
  return secretInitPromise;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(password, salt, 64);
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;
  const [salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = await scryptAsync(password, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function signSessionToken(
  userId: number,
  email: string
): Promise<string> {
  const secret = await getSessionSecret();
  const payload = {
    sub: userId,
    email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString(
    'base64url'
  );
  const sig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `cv1.${encodedPayload}.${sig}`;
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: number; email: string } | null> {
  if (!token.startsWith('cv1.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  try {
    const secret = await getSessionSecret();
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(encodedPayload)
      .digest('base64url');

    const providedBuf = Buffer.from(providedSig, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (
      providedBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as { sub?: number; email?: string; exp?: number };

    if (
      !decoded.sub ||
      !decoded.email ||
      !decoded.exp ||
      Date.now() > decoded.exp
    ) {
      return null;
    }

    return { userId: decoded.sub, email: decoded.email };
  } catch {
    return null;
  }
}
