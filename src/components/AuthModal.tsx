import { useEffect, useState } from 'react';
import { Film, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CITIES = ['Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'New Delhi'];

export function AuthModal({
  isOpen,
  initialMode = 'login',
  onClose,
  onSignedIn,
  onError,
}: {
  isOpen: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onSignedIn: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { signInWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredCity, setPreferredCity] = useState('Hyderabad');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLocalError(null);
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLocalError(null);
    setSubmitting(true);
    try {
      const user = await signInWithGoogle();
      onSignedIn(`Welcome back, ${user?.name || 'Guest'}.`);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Sign-in could not be completed.';
      setLocalError(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSubmitting(true);
    try {
      if (mode === 'register') {
        const user = await registerWithEmail({
          name,
          email,
          password,
          phone,
          preferredCity,
        });
        onSignedIn(`Account created! Welcome, ${user.name}.`);
      } else {
        const user = await loginWithEmail(email, password);
        onSignedIn(`Welcome back, ${user.name}.`);
      }
      setPassword('');
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Authentication failed.';
      setLocalError(message);
      onError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-dialog-title"
    >
      <div className="relative w-full max-w-md bg-[#141216] border border-white/15 rounded-2xl p-6 sm:p-7 shadow-2xl my-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sign-in dialog"
          className="absolute top-4 right-4 p-2 rounded-lg text-[#A9A299] hover:text-white hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 text-[#D4AF37] mb-3">
          <Film className="w-5 h-5" />
          <span className="font-display text-lg font-bold tracking-[0.12em]">
            CINEVERSE
          </span>
        </div>

        <h2
          id="auth-dialog-title"
          className="font-display text-3xl font-semibold text-[#F5F2EB]"
        >
          {mode === 'register' ? 'Create Your Account' : 'Member Login'}
        </h2>
        <p className="mt-1.5 text-xs text-[#B5AEA4] leading-relaxed">
          {mode === 'register'
            ? 'Register once to book seats, receive digital QR passes, and view your ticket history.'
            : 'Sign in with your Cineverse account or Google to manage bookings and reserve seats.'}
        </p>

        {/* Login / Create Account Tabs */}
        <div className="mt-5 grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0C0B0E] border border-white/10">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setLocalError(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-[#D4AF37] text-[#0A090C]'
                : 'text-[#B5AEA4] hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setLocalError(null);
            }}
            className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-[#D4AF37] text-[#0A090C]'
                : 'text-[#B5AEA4] hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="mt-4 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs text-[#B5AEA4] mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                placeholder="Enter your full name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-[#B5AEA4] mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {mode === 'register' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#B5AEA4] mb-1">
                  WhatsApp / Mobile
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B5AEA4] mb-1">
                  Preferred City
                </label>
                <select
                  value={preferredCity}
                  onChange={(e) => setPreferredCity(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                >
                  {CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-[#B5AEA4] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder={
                mode === 'register'
                  ? 'Minimum 6 characters'
                  : 'Enter your password'
              }
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {localError && (
            <p className="text-xs text-red-300 bg-red-950/50 border border-red-500/30 rounded-lg px-3 py-2">
              {localError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-sm hover:bg-[#E5C150] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'register'
                ? 'Create Account'
                : 'Login'}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[11px] text-[#8E877E]">
          <div className="flex-1 h-px bg-white/10" />
          <span>OR</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-[#0C0B0E] border border-white/15 text-[#F5F2EB] font-medium text-sm hover:border-[#D4AF37]/60 disabled:opacity-60 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4 text-[#D4AF37]" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="mt-4 flex items-start gap-2.5 pt-3 border-t border-white/10 text-[11px] text-[#9C958B]">
          <ShieldCheck className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
          <span>
            Passwords are encrypted on the server and every booking verifies your
            session token.
          </span>
        </div>
      </div>
    </div>
  );
}
