import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { verifySessionToken } from '../lib/session-auth.ts';
import {
  findUserById,
  getOrCreateUser,
  isConfiguredAdminEmail,
} from '../db/users.ts';

export interface AuthUserRecord {
  id: number;
  uid: string;
  email: string;
  name: string;
  phone: string;
  preferredCity: string;
  role: string;
}

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: AuthUserRecord;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.split('Bearer ')[1];

  // Check signed server session token first (for Email + Password accounts)
  if (token.startsWith('cv1.')) {
    const session = verifySessionToken(token);
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }
    try {
      const dbUser = await findUserById(session.userId);
      if (!dbUser) {
        return res.status(401).json({ error: 'Account not found. Please sign in again.' });
      }
      if (isConfiguredAdminEmail(dbUser.email) && dbUser.role !== 'admin') {
        dbUser.role = 'admin';
      }
      req.dbUser = dbUser;
      return next();
    } catch (error) {
      console.error('Error loading session user:', error);
      return res.status(500).json({ error: 'Unable to verify session.' });
    }
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decodedToken;

    const email = decodedToken.email || `${decodedToken.uid}@cineverse.local`;
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      email,
      decodedToken.name
    );
    req.dbUser = dbUser;
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.dbUser || req.dbUser.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator privileges required.' });
  }
  next();
};
