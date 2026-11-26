import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { appSettings, users } from '../db/schema.ts';

const ADMIN_PASSCODE_KEY = 'admin_passcode_hash';

function hashPasscode(passcode: string, salt?: string) {
  const effectiveSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, effectiveSalt, 64).toString('hex');
  return `${effectiveSalt}:${derived}`;
}

function verifyPasscodeHash(passcode: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export async function getAdminBootstrapStatus() {
  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPasscode.length > 0) {
    return { configured: true, source: 'env' as const };
  }
  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, ADMIN_PASSCODE_KEY))
    .limit(1);

  return {
    configured: existing.length > 0,
    source: existing.length > 0 ? ('claimed' as const) : ('unclaimed' as const),
  };
}

export async function verifyOrClaimAdminPasscode(
  userId: number,
  passcode: string
): Promise<{ ok: boolean; error?: string }> {
  if (!passcode || passcode.trim().length < 6) {
    return { ok: false, error: 'Passcode must be at least 6 characters.' };
  }

  const envPasscode = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPasscode.length > 0) {
    const a = Buffer.from(passcode.trim());
    const b = Buffer.from(envPasscode);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, error: 'Invalid administrator passcode.' };
    }
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
    return { ok: true };
  }

  const existing = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, ADMIN_PASSCODE_KEY))
    .limit(1);

  if (existing.length === 0) {
    // First-run atomic bootstrap claim
    const hashed = hashPasscode(passcode.trim());
    const inserted = await db
      .insert(appSettings)
      .values({ key: ADMIN_PASSCODE_KEY, value: hashed })
      .onConflictDoNothing()
      .returning();

    if (inserted.length > 0) {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
      return { ok: true };
    }
    // Race condition: re-read and verify
    const reread = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, ADMIN_PASSCODE_KEY))
      .limit(1);
    if (reread.length > 0 && verifyPasscodeHash(passcode.trim(), reread[0].value)) {
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
      return { ok: true };
    }
    return { ok: false, error: 'Admin passcode already claimed. Enter the existing passcode.' };
  }

  if (!verifyPasscodeHash(passcode.trim(), existing[0].value)) {
    return { ok: false, error: 'Invalid administrator passcode.' };
  }

  await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
  return { ok: true };
}
