import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import type { UserProfile } from '../types';

export interface RegisterEmailInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  preferredCity: string;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<UserProfile | null>;
  loginWithEmail: (email: string, password: string) => Promise<UserProfile>;
  registerWithEmail: (input: RegisterEmailInput) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [customToken, setCustomToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBackendProfile = useCallback(async (token: string) => {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('Failed to sync profile');
    }
    const data: UserProfile = await res.json();
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setIdToken(null);
        setLoading(false);
        return;
      }

      try {
        setCustomToken(null);
        const token = await user.getIdToken();
        setIdToken(token);
        await fetchBackendProfile(token);
      } catch (err) {
        console.error('Auth state sync error:', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [fetchBackendProfile]);

  const signInWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const token = await cred.user.getIdToken();
    setCustomToken(null);
    setFirebaseUser(cred.user);
    setIdToken(token);
    return await fetchBackendProfile(token);
  }, [fetchBackendProfile]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unable to sign in.');
      }
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      setFirebaseUser(null);
      setIdToken(null);
      setCustomToken(json.token);
      setProfile(json.user);
      return json.user as UserProfile;
    },
    []
  );

  const registerWithEmail = useCallback(
    async (input: RegisterEmailInput) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Unable to create account.');
      }
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      setFirebaseUser(null);
      setIdToken(null);
      setCustomToken(json.token);
      setProfile(json.user);
      return json.user as UserProfile;
    },
    []
  );

  const logout = useCallback(async () => {
    if (auth.currentUser) {
      await signOut(auth);
    }
    setFirebaseUser(null);
    setIdToken(null);
    setCustomToken(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (customToken) {
      return await fetchBackendProfile(customToken);
    }
    if (!auth.currentUser) return null;
    const token = await auth.currentUser.getIdToken(true);
    setIdToken(token);
    return await fetchBackendProfile(token);
  }, [customToken, fetchBackendProfile]);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      let token = customToken || idToken;
      if (!customToken && auth.currentUser) {
        token = await auth.currentUser.getIdToken();
        setIdToken(token);
      }
      const headers = new Headers(init.headers);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      return fetch(input, { ...init, headers });
    },
    [customToken, idToken]
  );

  const isAuthenticated = Boolean(firebaseUser || (customToken && profile));

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isAuthenticated,
        loading,
        signInWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        refreshProfile,
        authFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
