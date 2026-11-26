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
import firebaseConfig from '../../firebase-applet-config.json';
import { fetchJsonWithRetry } from '../lib/http';
import type { UserProfile } from '../types';

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleOAuthWindow extends Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (response: GoogleTokenResponse) => void;
          error_callback?: (error: { type?: string }) => void;
        }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
      };
    };
  };
}

function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Browser window unavailable.'));
  }
  const win = window as GoogleOAuthWindow;
  if (win.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-cineverse-gsi="true"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Could not load Google Sign-In script.')),
        { once: true }
      );
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.cineverseGsi = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google Sign-In script.'));
    document.head.appendChild(script);
  });
}

async function requestGoogleOAuthToken(clientId: string): Promise<string> {
  await loadGoogleIdentityScript();
  const win = window as GoogleOAuthWindow;
  const initTokenClient = win.google?.accounts?.oauth2?.initTokenClient;
  if (!initTokenClient) {
    throw new Error('Google Sign-In client is unavailable.');
  }
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const client = initTokenClient({
      client_id: clientId,
      scope: 'openid email profile',
      callback: (response) => {
        if (settled) return;
        settled = true;
        if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error(response.error || 'Google authorization did not complete.'));
        }
      },
      error_callback: (err) => {
        if (settled) return;
        settled = true;
        reject(new Error(err.type || 'Google popup could not be opened.'));
      },
    });
    client.requestAccessToken({ prompt: 'select_account' });
  });
}

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
    const parsed = await fetchJsonWithRetry<UserProfile>('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!parsed.ok || !parsed.data) {
      throw new Error(parsed.errorMessage || 'Failed to sync profile');
    }
    setProfile(parsed.data);
    return parsed.data;
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
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setCustomToken(null);
      setFirebaseUser(cred.user);
      setIdToken(token);
      return await fetchBackendProfile(token);
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      const isUnauthorizedDomain =
        fbErr?.code === 'auth/unauthorized-domain' ||
        (fbErr?.message || '').includes('auth/unauthorized-domain');

      const oauthClientId = (firebaseConfig as { oAuthClientId?: string })
        .oAuthClientId;

      if (isUnauthorizedDomain && oauthClientId) {
        try {
          const accessToken = await requestGoogleOAuthToken(oauthClientId);
          const parsed = await fetchJsonWithRetry<{ token: string; user: UserProfile }>(
            '/api/auth/google-oauth',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ accessToken }),
            }
          );
          if (!parsed.ok || !parsed.data) {
            throw new Error(parsed.errorMessage || 'Google sign-in failed.');
          }
          setFirebaseUser(null);
          setIdToken(null);
          setCustomToken(parsed.data.token);
          setProfile(parsed.data.user);
          return parsed.data.user;
        } catch (fallbackErr) {
          const domainError = new Error(
            'Google Sign-In is not authorized on this domain yet. Please use Email & Password Login or Create Account above.'
          ) as Error & { code?: string; cause?: unknown };
          domainError.code = 'auth/unauthorized-domain';
          domainError.cause = fallbackErr;
          throw domainError;
        }
      }

      throw err;
    }
  }, [fetchBackendProfile]);

  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      const parsed = await fetchJsonWithRetry<{ token: string; user: UserProfile }>(
        '/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.errorMessage || 'Unable to sign in.');
      }
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      setFirebaseUser(null);
      setIdToken(null);
      setCustomToken(parsed.data.token);
      setProfile(parsed.data.user);
      return parsed.data.user;
    },
    []
  );

  const registerWithEmail = useCallback(
    async (input: RegisterEmailInput) => {
      const parsed = await fetchJsonWithRetry<{ token: string; user: UserProfile }>(
        '/api/auth/register',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        }
      );
      if (!parsed.ok || !parsed.data) {
        throw new Error(parsed.errorMessage || 'Unable to create account.');
      }
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }
      setFirebaseUser(null);
      setIdToken(null);
      setCustomToken(parsed.data.token);
      setProfile(parsed.data.user);
      return parsed.data.user;
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
