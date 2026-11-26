import { useCallback, useEffect, useState } from 'react';
import {
  Download,
  Mail,
  MessageCircle,
  QrCode,
  Save,
  Ticket,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { BookingRecord } from '../types';
import {
  buildEmailTicketUrl,
  buildWhatsAppTicketUrl,
  downloadTicketHtml,
} from './BookingConfirmationView';

const CITIES = ['Mumbai', 'Bengaluru', 'Chennai', 'Hyderabad', 'New Delhi'];

export function ProfileBookingsView({
  onOpenAuthModal,
  onBrowseMovies,
  onOpenAdmin,
  onSuccess,
  onError,
}: {
  onOpenAuthModal: () => void;
  onBrowseMovies: () => void;
  onOpenAdmin?: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { isAuthenticated, profile, refreshProfile, authFetch } = useAuth();
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [qrModalBooking, setQrModalBooking] = useState<BookingRecord | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [preferredCity, setPreferredCity] = useState('Mumbai');
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setPreferredCity(profile.preferredCity || 'Mumbai');
    }
  }, [profile]);

  const loadBookings = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/bookings/mine');
      if (res.ok) {
        const list = await res.json();
        setBookings(list);
      }
    } catch (err) {
      console.error('Failed to fetch booking history:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authFetch]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await authFetch('/api/me', {
        method: 'PUT',
        body: JSON.stringify({ name, phone, preferredCity }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Unable to update profile.');
        return;
      }
      await refreshProfile();
      onSuccess('Profile preferences saved.');
    } catch (err) {
      console.error(err);
      onError('Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Could not cancel booking.');
        return;
      }
      onSuccess('Reservation cancelled and seats released.');
      loadBookings();
    } catch (err) {
      console.error(err);
      onError('Could not cancel booking.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-5">
        <Ticket className="w-10 h-10 text-[#D4AF37] mx-auto" />
        <h1 className="font-display text-4xl font-semibold text-[#F5F2EB]">
          Login to view your bookings
        </h1>
        <p className="text-sm text-[#B5AEA4] max-w-md mx-auto">
          Access your QR tickets, past cinema visits, and saved theatre city
          preferences.
        </p>
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="px-6 py-3 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-sm hover:bg-[#E5C150]"
        >
          Login / Create Account
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-10">
      <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#D4AF37]">
            {profile?.role === 'admin' ? 'Administrator Account' : 'Customer Account'}
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-[#F5F2EB]">
            Profile & My Bookings
          </h1>
        </div>
        {profile?.role === 'admin' && onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0A090C] text-xs font-semibold hover:bg-[#E5C150] transition-colors self-start sm:self-auto"
          >
            Open Admin Dashboard
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Settings */}
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-4 bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-4"
        >
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
              Account Details
            </h2>
            <p className="text-xs text-[#9C958B] mt-0.5">{profile?.email}</p>
          </div>

          <div>
            <label className="block text-xs text-[#B5AEA4] mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#B5AEA4] mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div>
            <label className="block text-xs text-[#B5AEA4] mb-1.5">
              Preferred City
            </label>
            <select
              value={preferredCity}
              onChange={(e) => setPreferredCity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-xs hover:bg-[#E5C150] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>

        {/* Booking History */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
            Booking History ({bookings.length})
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-36 rounded-2xl bg-[#141216] border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[#141216] border border-white/10 text-center space-y-3">
              <p className="text-base font-medium text-[#F5F2EB]">
                No reservations yet
              </p>
              <p className="text-sm text-[#A9A299]">
                Pick a showtime and reserve your preferred seats to see your
                tickets here.
              </p>
              <button
                type="button"
                onClick={onBrowseMovies}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A090C] text-xs font-semibold"
              >
                Browse Now Showing
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((b) => (
                <article
                  key={b.id}
                  className="bg-[#141216] border border-white/10 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-mono text-[#D4AF37] font-semibold">
                        {b.bookingCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={
                          b.status === 'confirmed'
                            ? 'text-emerald-400 font-medium'
                            : 'text-red-400 font-medium'
                        }
                      >
                        {b.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                      </span>
                    </div>

                    <h3 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                      {b.movieTitle}
                    </h3>
                    <p className="text-xs text-[#B5AEA4]">
                      {b.theatreName} ({b.theatreCity}) · {b.screenName}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#D6D0C6]">
                      {b.showDate} at {b.showTime} · Seats:{' '}
                      <span className="text-[#D4AF37]">
                        {b.seats.map((s) => s.seatCode).join(', ')}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col justify-between sm:items-end gap-3 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-[#9C958B]">Total Paid</p>
                      <p className="font-mono tabular-nums text-lg font-semibold text-[#F5F2EB]">
                        ${b.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {b.status === 'confirmed' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setQrModalBooking(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1F1A22] border border-white/15 text-xs font-medium text-[#F5F2EB] hover:border-[#D4AF37]/60"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#D4AF37]" />
                            QR Ticket
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadTicketHtml(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1F1A22] border border-white/15 text-xs font-medium text-[#F5F2EB] hover:border-[#D4AF37]/60"
                          >
                            <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                            Download
                          </button>
                          <a
                            href={buildWhatsAppTicketUrl(b, b.deliveryPhone || profile?.phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/15 border border-emerald-500/35 text-xs font-medium text-emerald-300 hover:bg-emerald-600/25"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </a>
                          <a
                            href={buildEmailTicketUrl(b, b.deliveryEmail || profile?.email)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1F1A22] border border-white/15 text-xs font-medium text-[#F5F2EB] hover:border-[#D4AF37]/60"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
                            Email
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCancelBooking(b.id)}
                            className="px-3 py-2 rounded-lg border border-red-500/30 text-xs font-medium text-red-300 hover:bg-red-950/40"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {qrModalBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-sm bg-[#141216] border border-[#D4AF37]/40 rounded-2xl p-6 text-center space-y-4">
            <button
              type="button"
              onClick={() => setQrModalBooking(null)}
              aria-label="Close ticket QR"
              className="absolute top-3 right-3 p-2 rounded-lg text-[#A9A299] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-mono text-xs text-[#D4AF37]">
              {qrModalBooking.bookingCode}
            </p>
            <h3 className="font-display text-2xl font-semibold text-[#F5F2EB]">
              {qrModalBooking.movieTitle}
            </h3>
            <img
              src={qrModalBooking.qrDataUrl}
              alt="Ticket QR Code"
              className="w-48 h-48 mx-auto rounded-lg"
            />
            <p className="text-xs text-[#B5AEA4]">
              {qrModalBooking.theatreName} · {qrModalBooking.showDate}{' '}
              {qrModalBooking.showTime}
            </p>
            <p className="font-mono text-xs text-[#D4AF37]">
              Seats: {qrModalBooking.seats.map((s) => s.seatCode).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
