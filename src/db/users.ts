import crypto from 'crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

const DEFAULT_ADMIN_EMAIL = 'sindhugummidipudi@gmail.com';

export function isConfiguredAdminEmail(email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return (
    normalizedEmail === DEFAULT_ADMIN_EMAIL ||
    (Boolean(envAdminEmail) && normalizedEmail === envAdminEmail)
  );
}

export function sanitizeUser<T extends { passwordHash?: string | null }>(
  user: T
): Omit<T, 'passwordHash'> {
  const { passwordHash: _omitted, ...safe } = user;
  return safe;
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const isAdminEmail = isConfiguredAdminEmail(normalizedEmail);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      const current = existing[0];
      if (isAdminEmail && current.role !== 'admin') {
        const updated = await db
          .update(users)
          .set({ role: 'admin', email: normalizedEmail })
          .where(eq(users.id, current.id))
          .returning();
        return sanitizeUser(updated[0]);
      }
      return sanitizeUser(current);
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        name:
          displayName?.trim() || normalizedEmail.split('@')[0] || 'Cinema Guest',
        role: isAdminEmail ? 'admin' : 'user',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
        },
      })
      .returning();

    return sanitizeUser(inserted[0]);
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function findUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);
  return rows[0] || null;
}

export async function findUserById(id: number) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ? sanitizeUser(rows[0]) : null;
}

export async function registerEmailUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  preferredCity: string;
}) {
  const normalizedEmail = data.email.trim().toLowerCase();
  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    const conflict = new Error('An account with this email already exists.');
    (conflict as Error & { statusCode?: number }).statusCode = 409;
    throw conflict;
  }

  const uid = `local-${crypto.randomBytes(12).toString('hex')}`;
  const isAdminEmail = isConfiguredAdminEmail(normalizedEmail);

  const [created] = await db
    .insert(users)
    .values({
      uid,
      email: normalizedEmail,
      name: data.name.trim().slice(0, 80),
      phone: data.phone.trim().slice(0, 24),
      preferredCity: data.preferredCity.trim().slice(0, 40) || 'Mumbai',
      passwordHash: data.passwordHash,
      role: isAdminEmail ? 'admin' : 'user',
    })
    .returning();

  return sanitizeUser(created);
}

export async function updateUserProfile(
  userId: number,
  data: { name: string; phone: string; preferredCity: string }
) {
  try {
    const updated = await db
      .update(users)
      .set({
        name: data.name,
        phone: data.phone,
        preferredCity: data.preferredCity,
      })
      .where(eq(users.id, userId))
      .returning();
    return sanitizeUser(updated[0]);
  } catch (error) {
    console.error('Database query failed in updateUserProfile:', error);
    throw new Error('Failed to update user profile.', { cause: error });
  }
}
