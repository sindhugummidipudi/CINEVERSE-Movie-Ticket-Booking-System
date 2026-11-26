import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  Edit3,
  Film,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users as UsersIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AdminOverview, Movie, SeatItem } from '../types';

type AdminTab =
  | 'overview'
  | 'movies'
  | 'theatres'
  | 'shows'
  | 'bookings'
  | 'payments'
  | 'users';

export function AdminDashboardView({
  onOpenAuthModal,
  onCatalogMutated,
  onSuccess,
  onError,
}: {
  onOpenAuthModal: () => void;
  onCatalogMutated: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { isAuthenticated, profile, refreshProfile, authFetch } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(false);

  // Merchant UPI Settings Form
  const [merchantUpiId, setMerchantUpiId] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);

  // Bookings filter state
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  // Admin Passcode Bootstrap / Elevation
  const [bootstrapStatus, setBootstrapStatus] = useState<{
    configured: boolean;
    source: string;
  } | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [elevating, setElevating] = useState(false);

  // Movie Form
  const [editingMovieId, setEditingMovieId] = useState<number | null>(null);
  const [movieTitle, setMovieTitle] = useState('');
  const [movieDesc, setMovieDesc] = useState('');
  const [movieGenre, setMovieGenre] = useState('Sci-Fi Thriller');
  const [movieLanguage, setMovieLanguage] = useState('English');
  const [movieDuration, setMovieDuration] = useState('135');
  const [movieRating, setMovieRating] = useState('8.6');
  const [movieDirector, setMovieDirector] = useState('');
  const [movieStatus, setMovieStatus] = useState<'now_showing' | 'coming_soon'>(
    'now_showing'
  );
  const [movieTrending, setMovieTrending] = useState(false);

  // Theatre Form
  const [theatreName, setTheatreName] = useState('');
  const [theatreCity, setTheatreCity] = useState('Mumbai');
  const [theatreAddress, setTheatreAddress] = useState('');
  const [screenName, setScreenName] = useState('Audi 1');
  const [screenFormat, setScreenFormat] = useState('Dolby Atmos');

  // Seat Maintenance Inspector
  const [inspectedScreenId, setInspectedScreenId] = useState<number | null>(null);
  const [screenSeats, setScreenSeats] = useState<SeatItem[]>([]);

  // Show Form
  const [showMovieId, setShowMovieId] = useState('');
  const [showTheatreId, setShowTheatreId] = useState('');
  const [showScreenId, setShowScreenId] = useState('');
  const [showDate, setShowDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [showTime, setShowTime] = useState('19:30');
  const [silverPrice, setSilverPrice] = useState('14');
  const [goldPrice, setGoldPrice] = useState('20');
  const [platinumPrice, setPlatinumPrice] = useState('28');

  const isAdmin = profile?.role === 'admin';

  const loadOverview = useCallback(async () => {
    if (!isAuthenticated || !isAdmin) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/overview');
      if (res.ok) {
        const data: AdminOverview = await res.json();
        setOverview(data);
        if (data.paymentSettings) {
          setMerchantUpiId(data.paymentSettings.merchantUpiId);
          setMerchantName(data.paymentSettings.merchantName);
        }
        if (!showMovieId && data.movies.length > 0) {
          setShowMovieId(String(data.movies[0].id));
        }
        if (!showTheatreId && data.theatres.length > 0) {
          setShowTheatreId(String(data.theatres[0].id));
          if (data.theatres[0].screens.length > 0) {
            setShowScreenId(String(data.theatres[0].screens[0].id));
          }
        }
      }
    } catch (err) {
      console.error('Admin overview load error:', err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin, authFetch, showMovieId, showTheatreId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (isAdmin) {
      loadOverview();
    } else {
      refreshProfile().catch(() => {});
      authFetch('/api/admin/bootstrap-status')
        .then((r) => r.json())
        .then((d) => setBootstrapStatus(d))
        .catch(() => {});
    }
  }, [isAuthenticated, isAdmin, loadOverview, authFetch, refreshProfile]);

  const handleElevate = async (e: React.FormEvent) => {
    e.preventDefault();
    setElevating(true);
    try {
      const res = await authFetch('/api/admin/elevate', {
        method: 'POST',
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Admin verification failed.');
        return;
      }
      setPasscodeInput('');
      await refreshProfile();
      onSuccess('Administrator session verified.');
    } catch (err) {
      console.error(err);
      onError('Unable to verify administrator passcode.');
    } finally {
      setElevating(false);
    }
  };

  const resetMovieForm = () => {
    setEditingMovieId(null);
    setMovieTitle('');
    setMovieDesc('');
    setMovieGenre('Sci-Fi Thriller');
    setMovieLanguage('English');
    setMovieDuration('135');
    setMovieRating('8.6');
    setMovieDirector('');
    setMovieStatus('now_showing');
    setMovieTrending(false);
  };

  const startEditMovie = (m: Movie) => {
    setEditingMovieId(m.id);
    setMovieTitle(m.title);
    setMovieDesc(m.description);
    setMovieGenre(m.genre);
    setMovieLanguage(m.language);
    setMovieDuration(String(m.durationMin));
    setMovieRating(m.rating);
    setMovieDirector(m.director);
    setMovieStatus(m.status);
    setMovieTrending(m.isTrending);
  };

  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingMovieId
        ? `/api/admin/movies/${editingMovieId}`
        : '/api/admin/movies';
      const method = editingMovieId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          title: movieTitle,
          description: movieDesc,
          genre: movieGenre,
          language: movieLanguage,
          durationMin: Number(movieDuration),
          rating: movieRating,
          director: movieDirector,
          status: movieStatus,
          isTrending: movieTrending,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Unable to save movie.');
        return;
      }
      onSuccess(editingMovieId ? 'Movie updated.' : 'New movie added to catalog.');
      resetMovieForm();
      loadOverview();
      onCatalogMutated();
    } catch (err) {
      console.error(err);
      onError('Unable to save movie.');
    }
  };

  const handleDeleteMovie = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/movies/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError('Could not delete movie.');
        return;
      }
      onSuccess('Movie removed from catalog.');
      loadOverview();
      onCatalogMutated();
    } catch (err) {
      console.error(err);
      onError('Could not delete movie.');
    }
  };

  const handleAddTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/theatres', {
        method: 'POST',
        body: JSON.stringify({
          name: theatreName,
          city: theatreCity,
          address: theatreAddress,
          screenName,
          screenFormat,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Could not add theatre.');
        return;
      }
      onSuccess('Theatre and auditorium seats created.');
      setTheatreName('');
      setTheatreAddress('');
      loadOverview();
    } catch (err) {
      console.error(err);
      onError('Could not add theatre.');
    }
  };

  const handleDeleteTheatre = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/theatres/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        onError('Could not delete theatre.');
        return;
      }
      onSuccess('Theatre removed.');
      loadOverview();
    } catch (err) {
      console.error(err);
      onError('Could not delete theatre.');
    }
  };

  const loadScreenSeats = async (screenId: number) => {
    setInspectedScreenId(screenId);
    try {
      const res = await authFetch(`/api/admin/screens/${screenId}/seats`);
      if (res.ok) {
        setScreenSeats(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBlockSeat = async (seatId: number) => {
    try {
      const res = await authFetch(`/api/admin/seats/${seatId}/toggle-block`, {
        method: 'PUT',
      });
      if (res.ok) {
        const updated: SeatItem = await res.json();
        setScreenSeats((prev) =>
          prev.map((s) => (s.id === updated.id ? { ...s, isBlocked: updated.isBlocked } : s))
        );
        onSuccess(
          `Seat ${updated.seatCode} marked ${
            updated.isBlocked ? 'blocked for maintenance' : 'available'
          }.`
        );
      }
    } catch (err) {
      console.error(err);
      onError('Unable to update seat status.');
    }
  };

  const handleAddShow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/admin/shows', {
        method: 'POST',
        body: JSON.stringify({
          movieId: Number(showMovieId),
          theatreId: Number(showTheatreId),
          screenId: Number(showScreenId),
          showDate,
          showTime,
          silverPrice: Number(silverPrice),
          goldPrice: Number(goldPrice),
          platinumPrice: Number(platinumPrice),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Could not schedule show.');
        return;
      }
      onSuccess('Showtime scheduled successfully.');
      loadOverview();
    } catch (err) {
      console.error(err);
      onError('Could not schedule show.');
    }
  };

  const handleDeleteShow = async (id: number) => {
    try {
      const res = await authFetch(`/api/admin/shows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onSuccess('Showtime deleted.');
        loadOverview();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveUpiSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingUpi(true);
    try {
      const res = await authFetch('/api/admin/payment-settings', {
        method: 'PUT',
        body: JSON.stringify({ merchantUpiId, merchantName }),
      });
      const json = await res.json();
      if (!res.ok) {
        onError(json.error || 'Could not update UPI settings.');
        return;
      }
      onSuccess('Merchant UPI settings saved for in-app checkout.');
      loadOverview();
    } catch (err) {
      console.error(err);
      onError('Could not update UPI settings.');
    } finally {
      setSavingUpi(false);
    }
  };

  const handleCancelBookingAdmin = async (bookingId: number) => {
    try {
      const res = await authFetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      if (!res.ok) {
        onError('Could not cancel booking.');
        return;
      }
      onSuccess('Booking cancelled and seats released.');
      loadOverview();
    } catch (err) {
      console.error(err);
      onError('Could not cancel booking.');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-5">
        <Shield className="w-10 h-10 text-[#D4AF37] mx-auto" />
        <h1 className="font-display text-4xl font-semibold text-[#F5F2EB]">
          Administrator Sign In
        </h1>
        <p className="text-sm text-[#B5AEA4]">
          Sign in with your authorized Cineverse administrator account to manage
          movies, theatres, showtimes, and seating layouts.
        </p>
        <button
          type="button"
          onClick={onOpenAuthModal}
          className="px-6 py-3 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-sm hover:bg-[#E5C150]"
        >
          Login as Administrator
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <form
          onSubmit={handleElevate}
          className="bg-[#141216] border border-white/15 rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-[#D4AF37]">
            <Lock className="w-5 h-5" />
            <h1 className="font-display text-2xl font-semibold text-[#F5F2EB]">
              Admin Access Required
            </h1>
          </div>
          <p className="text-xs text-[#B5AEA4] leading-relaxed">
            Signed in as <span className="text-[#F5F2EB]">{profile?.email}</span>.{' '}
            {bootstrapStatus?.source === 'unclaimed'
              ? 'No admin passcode has been claimed yet. Enter a new passcode (min 6 characters) to initialize and unlock administrator access.'
              : 'Enter the administrator passcode to elevate this session.'}
          </p>
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder={
              bootstrapStatus?.source === 'unclaimed'
                ? 'Set initial admin passcode (6+ chars)'
                : 'Enter admin passcode'
            }
            required
            minLength={6}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
          />
          <button
            type="submit"
            disabled={elevating}
            className="w-full py-2.5 px-4 rounded-xl bg-[#D4AF37] text-[#0A090C] text-xs font-semibold hover:bg-[#E5C150]"
          >
            {elevating
              ? 'Verifying...'
              : bootstrapStatus?.source === 'unclaimed'
                ? 'Claim & Unlock Admin Dashboard'
                : 'Unlock Admin Dashboard'}
          </button>
        </form>
      </div>
    );
  }

  const selectedTheatreObj = overview?.theatres.find(
    (t) => String(t.id) === showTheatreId
  );

  const maxMovieRev = Math.max(
    1,
    ...(overview?.revenueByMovie.map((r) => r.amount) || [1])
  );
  const maxDateRev = Math.max(
    1,
    ...(overview?.revenueByDate.map((r) => r.amount) || [1])
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-8">
      {/* Admin Header & Tab Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-medium text-[#D4AF37]">
            Cinema Operations Console
          </p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-[#F5F2EB]">
            Admin Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#141216] border border-white/10">
          {(
            [
              { id: 'overview', label: 'Analytics' },
              { id: 'movies', label: 'Movies' },
              { id: 'theatres', label: 'Theatres & Seats' },
              { id: 'shows', label: 'Showtimes & Prices' },
              { id: 'bookings', label: 'Bookings' },
              { id: 'payments', label: 'Payments & UPI' },
              { id: 'users', label: 'Users' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                tab === item.id
                  ? 'bg-[#D4AF37] text-[#0A090C]'
                  : 'text-[#B5AEA4] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !overview ? (
        <div className="h-64 rounded-2xl bg-[#141216] border border-white/10 animate-pulse" />
      ) : (
        <>
          {/* KPI Strip */}
          {tab === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-[#141216] border border-white/10">
                  <p className="text-xs text-[#A9A299]">Box Office Revenue</p>
                  <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-[#D4AF37]">
                    ${overview.kpis.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-[#141216] border border-white/10">
                  <p className="text-xs text-[#A9A299]">Tickets Sold</p>
                  <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-[#F5F2EB]">
                    {overview.kpis.totalTickets.toLocaleString()}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-[#141216] border border-white/10">
                  <p className="text-xs text-[#A9A299]">Now Showing Films</p>
                  <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-[#F5F2EB]">
                    {overview.kpis.activeMovies}
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-[#141216] border border-white/10">
                  <p className="text-xs text-[#A9A299]">Registered Patrons</p>
                  <p className="mt-2 font-mono tabular-nums text-3xl font-semibold text-[#F5F2EB]">
                    {overview.kpis.registeredUsers}
                  </p>
                </div>
              </div>

              {/* Custom SVG Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl bg-[#141216] border border-white/10 space-y-4">
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    Revenue by Film
                  </h2>
                  {overview.revenueByMovie.length === 0 ? (
                    <p className="text-sm text-[#9C958B]">
                      No confirmed bookings yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {overview.revenueByMovie.map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-[#E5DFD5] truncate pr-4">
                              {item.label}
                            </span>
                            <span className="font-mono tabular-nums text-[#D4AF37]">
                              ${item.amount}
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-[#0C0B0E] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#D4AF37]"
                              style={{
                                width: `${Math.max(
                                  6,
                                  Math.round((item.amount / maxMovieRev) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 rounded-2xl bg-[#141216] border border-white/10 space-y-4">
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    Revenue by Show Date
                  </h2>
                  {overview.revenueByDate.length === 0 ? (
                    <p className="text-sm text-[#9C958B]">
                      No confirmed bookings yet.
                    </p>
                  ) : (
                    <svg
                      viewBox="0 0 420 180"
                      className="w-full h-44"
                      role="img"
                      aria-label="Daily box office revenue chart"
                    >
                      {overview.revenueByDate.map((pt, idx) => {
                        const colW = Math.min(
                          60,
                          Math.floor(380 / overview.revenueByDate.length) - 12
                        );
                        const x =
                          24 +
                          idx *
                            Math.floor(
                              380 / Math.max(1, overview.revenueByDate.length)
                            );
                        const barH = Math.max(
                          12,
                          Math.round((pt.amount / maxDateRev) * 120)
                        );
                        const y = 140 - barH;
                        return (
                          <g key={pt.date}>
                            <rect
                              x={x}
                              y={y}
                              width={colW}
                              height={barH}
                              rx={4}
                              fill="#D4AF37"
                            />
                            <text
                              x={x + colW / 2}
                              y={y - 6}
                              textAnchor="middle"
                              fill="#F5F2EB"
                              fontSize="10"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              ${pt.amount}
                            </text>
                            <text
                              x={x + colW / 2}
                              y={162}
                              textAnchor="middle"
                              fill="#9C958B"
                              fontSize="9"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {pt.date.slice(5)}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Movies CRUD */}
          {tab === 'movies' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <form
                onSubmit={handleSaveMovie}
                className="lg:col-span-5 bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    {editingMovieId ? 'Edit Film' : 'Add New Film'}
                  </h2>
                  {editingMovieId && (
                    <button
                      type="button"
                      onClick={resetMovieForm}
                      className="text-xs text-[#D4AF37] hover:underline"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={movieTitle}
                  onChange={(e) => setMovieTitle(e.target.value)}
                  placeholder="Movie title"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                />
                <textarea
                  value={movieDesc}
                  onChange={(e) => setMovieDesc(e.target.value)}
                  placeholder="Synopsis"
                  rows={3}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={movieGenre}
                    onChange={(e) => setMovieGenre(e.target.value)}
                    placeholder="Genre"
                    required
                    className="px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  />
                  <input
                    type="text"
                    value={movieLanguage}
                    onChange={(e) => setMovieLanguage(e.target.value)}
                    placeholder="Language"
                    required
                    className="px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="number"
                    value={movieDuration}
                    onChange={(e) => setMovieDuration(e.target.value)}
                    placeholder="Mins"
                    min={40}
                    required
                    className="px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  />
                  <input
                    type="text"
                    value={movieRating}
                    onChange={(e) => setMovieRating(e.target.value)}
                    placeholder="Rating"
                    className="px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  />
                  <select
                    value={movieStatus}
                    onChange={(e) =>
                      setMovieStatus(
                        e.target.value as 'now_showing' | 'coming_soon'
                      )
                    }
                    className="px-3 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  >
                    <option value="now_showing">Now Showing</option>
                    <option value="coming_soon">Coming Soon</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={movieDirector}
                  onChange={(e) => setMovieDirector(e.target.value)}
                  placeholder="Director"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                />
                <label className="flex items-center gap-2 text-xs text-[#C8C2B8]">
                  <input
                    type="checkbox"
                    checked={movieTrending}
                    onChange={(e) => setMovieTrending(e.target.checked)}
                    className="rounded"
                  />
                  Feature in Trending Now
                </label>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-xs hover:bg-[#E5C150]"
                >
                  <Plus className="w-4 h-4" />
                  {editingMovieId ? 'Update Movie' : 'Add Movie'}
                </button>
              </form>

              <div className="lg:col-span-7 space-y-3">
                {overview.movies.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-[#141216] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Film className="w-5 h-5 text-[#D4AF37] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-[#F5F2EB] truncate">
                          {m.title}
                        </p>
                        <p className="text-xs text-[#9C958B] truncate">
                          {m.genre} · {m.language} · {m.durationMin}m ·{' '}
                          {m.status === 'now_showing'
                            ? 'Now Showing'
                            : 'Coming Soon'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditMovie(m)}
                        aria-label={`Edit ${m.title}`}
                        className="p-2 rounded-lg border border-white/10 text-[#C8C2B8] hover:text-[#D4AF37]"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMovie(m.id)}
                        aria-label={`Delete ${m.title}`}
                        className="p-2 rounded-lg border border-red-500/20 text-red-300 hover:bg-red-950/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Theatres & Seat Availability Management */}
          {tab === 'theatres' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <form
                  onSubmit={handleAddTheatre}
                  className="lg:col-span-5 bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-4"
                >
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    Add Theatre & Screen
                  </h2>
                  <input
                    type="text"
                    value={theatreName}
                    onChange={(e) => setTheatreName(e.target.value)}
                    placeholder="Theatre name"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  />
                  <select
                    value={theatreCity}
                    onChange={(e) => setTheatreCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  >
                    <option value="Mumbai">Mumbai</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Chennai">Chennai</option>
                    <option value="New Delhi">New Delhi</option>
                    <option value="Hyderabad">Hyderabad</option>
                  </select>
                  <input
                    type="text"
                    value={theatreAddress}
                    onChange={(e) => setTheatreAddress(e.target.value)}
                    placeholder="Street address"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={screenName}
                      onChange={(e) => setScreenName(e.target.value)}
                      placeholder="Screen name"
                      className="px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                    />
                    <input
                      type="text"
                      value={screenFormat}
                      onChange={(e) => setScreenFormat(e.target.value)}
                      placeholder="Format (IMAX / Atmos)"
                      className="px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-xs hover:bg-[#E5C150]"
                  >
                    Create Theatre (96 Seats)
                  </button>
                </form>

                <div className="lg:col-span-7 space-y-3">
                  {overview.theatres.map((t) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-xl bg-[#141216] border border-white/10 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm text-[#F5F2EB]">
                            {t.name} ({t.city})
                          </p>
                          <p className="text-xs text-[#9C958B]">{t.address}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteTheatre(t.id)}
                          aria-label={`Delete ${t.name}`}
                          className="p-2 rounded-lg border border-red-500/20 text-red-300 hover:bg-red-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {t.screens.map((sc) => (
                          <button
                            key={sc.id}
                            type="button"
                            onClick={() => loadScreenSeats(sc.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                              inspectedScreenId === sc.id
                                ? 'bg-[#D4AF37] text-[#0A090C] border-[#D4AF37] font-semibold'
                                : 'bg-[#0C0B0E] text-[#C8C2B8] border-white/10 hover:border-[#D4AF37]/50'
                            }`}
                          >
                            Manage Seats: {sc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {inspectedScreenId && screenSeats.length > 0 && (
                <div className="p-6 rounded-2xl bg-[#141216] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                        Auditorium Seat Maintenance
                      </h3>
                      <p className="text-xs text-[#A9A299]">
                        Click any seat to toggle Available vs Blocked (maintenance).
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-12 gap-1.5 max-w-xl">
                    {screenSeats.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleBlockSeat(s.id)}
                        title={`${s.seatCode} (${s.category})`}
                        className={`h-8 rounded text-[10px] font-mono tabular-nums flex items-center justify-center border ${
                          s.isBlocked
                            ? 'bg-red-950/70 border-red-500/50 text-red-200'
                            : 'bg-[#0C0B0E] border-white/15 text-[#D6D0C6] hover:border-[#D4AF37]'
                        }`}
                      >
                        {s.isBlocked ? <Ban className="w-3 h-3" /> : s.seatCode}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shows & Pricing CRUD */}
          {tab === 'shows' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <form
                onSubmit={handleAddShow}
                className="lg:col-span-5 bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-4"
              >
                <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                  Schedule Showtime & Seat Pricing
                </h2>

                <div>
                  <label className="block text-xs text-[#B5AEA4] mb-1">Film</label>
                  <select
                    value={showMovieId}
                    onChange={(e) => setShowMovieId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  >
                    {overview.movies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#B5AEA4] mb-1">
                    Theatre
                  </label>
                  <select
                    value={showTheatreId}
                    onChange={(e) => {
                      setShowTheatreId(e.target.value);
                      const th = overview.theatres.find(
                        (t) => String(t.id) === e.target.value
                      );
                      if (th && th.screens.length > 0) {
                        setShowScreenId(String(th.screens[0].id));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  >
                    {overview.theatres.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#B5AEA4] mb-1">
                    Screen
                  </label>
                  <select
                    value={showScreenId}
                    onChange={(e) => setShowScreenId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                  >
                    {(selectedTheatreObj?.screens || []).map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name} ({sc.format})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#B5AEA4] mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={showDate}
                      onChange={(e) => setShowDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#B5AEA4] mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={showTime}
                      onChange={(e) => setShowTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#B5AEA4] mb-1">
                      Silver ($)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={silverPrice}
                      onChange={(e) => setSilverPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm font-mono text-[#F5F2EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#B5AEA4] mb-1">
                      Gold ($)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={goldPrice}
                      onChange={(e) => setGoldPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm font-mono text-[#F5F2EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#B5AEA4] mb-1">
                      Platinum ($)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={platinumPrice}
                      onChange={(e) => setPlatinumPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm font-mono text-[#F5F2EB]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-xs hover:bg-[#E5C150]"
                >
                  Publish Showtime
                </button>
              </form>

              <div className="lg:col-span-7 space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {overview.shows.map((sh) => (
                  <div
                    key={sh.id}
                    className="p-4 rounded-xl bg-[#141216] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F5F2EB] truncate">
                        {sh.movieTitle}
                      </p>
                      <p className="text-xs text-[#9C958B] truncate">
                        {sh.theatreName} ({sh.theatreCity}) · {sh.screenName}
                      </p>
                      <p className="mt-1 font-mono tabular-nums text-xs text-[#D4AF37]">
                        {sh.showDate} {sh.showTime} · ${sh.silverPrice} / $
                        {sh.goldPrice} / ${sh.platinumPrice}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteShow(sh.id)}
                      aria-label="Delete showtime"
                      className="p-2 rounded-lg border border-red-500/20 text-red-300 hover:bg-red-950/40 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Bookings Table */}
          {tab === 'bookings' && (() => {
            const filteredBookings = overview.bookings.filter((b) => {
              if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) {
                return false;
              }
              if (bookingSearch.trim()) {
                const needle = bookingSearch.trim().toLowerCase();
                const hay = `${b.bookingCode} ${b.customerName} ${b.customerEmail} ${b.movieTitle} ${b.theatreName}`.toLowerCase();
                if (!hay.includes(needle)) return false;
              }
              return true;
            });

            return (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141216] border border-white/10 rounded-2xl p-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#9C958B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                      placeholder="Search booking ID, patron email, movie, or theatre..."
                      className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] placeholder:text-[#7D766E] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#0C0B0E] border border-white/10">
                      {(['all', 'confirmed', 'cancelled'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setBookingStatusFilter(st)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                            bookingStatusFilter === st
                              ? 'bg-[#D4AF37] text-[#0A090C]'
                              : 'text-[#B5AEA4] hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={loadOverview}
                      aria-label="Refresh bookings"
                      className="p-2 rounded-xl border border-white/10 bg-[#0C0B0E] text-[#C8C2B8] hover:text-[#D4AF37]"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-[#141216] border border-white/10 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-xs text-[#A9A299]">
                      <tr>
                        <th className="py-3.5 px-4">Booking ID</th>
                        <th className="py-3.5 px-4">Patron</th>
                        <th className="py-3.5 px-4">Film, Theatre & Show</th>
                        <th className="py-3.5 px-4">Seats</th>
                        <th className="py-3.5 px-4 text-right">Amount</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 px-4 text-center text-xs text-[#9C958B]">
                            No booked tickets match your search.
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-4 font-mono text-xs text-[#D4AF37]">
                              {b.bookingCode}
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-xs font-medium text-[#F5F2EB]">
                                {b.customerName}
                              </p>
                              <p className="text-[11px] text-[#9C958B]">
                                {b.customerEmail}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-xs text-[#D6D0C6]">
                              <p className="font-medium text-[#F5F2EB]">{b.movieTitle}</p>
                              <p className="text-[11px] text-[#9C958B]">
                                {b.theatreName} · {b.showDate} {b.showTime}
                              </p>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-[#F5F2EB]">
                              {b.seats.map((s) => s.seatCode).join(', ')}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#F5F2EB]">
                              ${b.totalAmount.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              <div className="flex items-center gap-3">
                                <span
                                  className={
                                    b.status === 'confirmed'
                                      ? 'text-emerald-400'
                                      : 'text-red-400'
                                  }
                                >
                                  {b.status === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                                </span>
                                {b.status === 'confirmed' && (
                                  <button
                                    type="button"
                                    onClick={() => handleCancelBookingAdmin(b.id)}
                                    className="text-[11px] text-red-300 hover:underline"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Payments & Merchant UPI Settings */}
          {tab === 'payments' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <form
                onSubmit={handleSaveUpiSettings}
                className="lg:col-span-4 bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-4"
              >
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    Merchant UPI Receiver
                  </h2>
                  <p className="mt-1 text-xs text-[#9C958B]">
                    Configure the UPI handle displayed in the PhonePe, Google
                    Pay, and Paytm QR code during in-app checkout.
                  </p>
                </div>

                <div>
                  <label className="block text-xs text-[#B5AEA4] mb-1">
                    Merchant UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    value={merchantUpiId}
                    onChange={(e) => setMerchantUpiId(e.target.value)}
                    placeholder="yourname@okaxis or merchant@ybl"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#B5AEA4] mb-1">
                    Merchant Display Name
                  </label>
                  <input
                    type="text"
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="CINEVERSE Theatres"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingUpi}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-xs hover:bg-[#E5C150] disabled:opacity-50"
                >
                  {savingUpi ? 'Saving...' : 'Save UPI Receiver'}
                </button>
              </form>

              <div className="lg:col-span-8 bg-[#141216] border border-white/10 rounded-2xl overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-xs text-[#A9A299]">
                    <tr>
                      <th className="py-3.5 px-4">Transaction Ref</th>
                      <th className="py-3.5 px-4">Patron</th>
                      <th className="py-3.5 px-4">Method</th>
                      <th className="py-3.5 px-4 text-right">Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {(overview.payments || []).map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono text-xs text-[#D4AF37]">
                          {p.transactionRef}
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-xs font-medium text-[#F5F2EB]">
                            {p.customerName}
                          </p>
                          <p className="text-[11px] text-[#9C958B]">
                            {p.customerEmail}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs uppercase font-mono text-[#D6D0C6]">
                          {p.method}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#F5F2EB]">
                          ${p.amount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <span
                            className={
                              p.status === 'succeeded'
                                ? 'text-emerald-400'
                                : 'text-red-400'
                            }
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Registered Users */}
          {tab === 'users' && (
            <div className="bg-[#141216] border border-white/10 rounded-2xl overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-[#A9A299]">
                  <tr>
                    <th className="py-3.5 px-4">Patron</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Preferred City</th>
                    <th className="py-3.5 px-4">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {overview.users.map((u) => (
                    <tr key={u.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 flex items-center gap-2 text-xs font-medium text-[#F5F2EB]">
                        <UsersIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {u.name || 'Cinema Patron'}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#B5AEA4]">
                        {u.email}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#B5AEA4]">
                        {u.preferredCity}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-[#D4AF37]">
                        {u.role}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
