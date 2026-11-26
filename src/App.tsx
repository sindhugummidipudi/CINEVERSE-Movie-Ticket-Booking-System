import { useCallback, useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AdminDashboardView } from './components/AdminDashboardView';
import { AuthModal } from './components/AuthModal';
import { BookingConfirmationView } from './components/BookingConfirmationView';
import { Footer } from './components/Footer';
import { HomeView } from './components/HomeView';
import { MovieDetailsView } from './components/MovieDetailsView';
import { MoviesDirectoryView } from './components/MoviesDirectoryView';
import { PaymentView } from './components/PaymentView';
import { ProfileBookingsView } from './components/ProfileBookingsView';
import {
  type PendingCheckout,
  SeatSelectionView,
} from './components/SeatSelectionView';
import { TheatresDirectoryView } from './components/TheatresDirectoryView';
import { ToastContainer } from './components/Toast';
import { TopBar } from './components/TopBar';
import { TrailerModal } from './components/TrailerModal';
import type { AppView, BookingRecord, Movie, ToastItem } from './types';

function CineverseApp() {
  const [activeView, setActiveView] = useState<AppView>(() =>
    typeof window !== 'undefined' && window.location.hash === '#admin'
      ? 'admin'
      : 'home'
  );
  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(true);

  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'now_showing' | 'coming_soon'
  >('all');

  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [selectedShowId, setSelectedShowId] = useState<number | null>(null);
  const [pendingCheckout, setPendingCheckout] =
    useState<PendingCheckout | null>(null);
  const [confirmedBooking, setConfirmedBooking] =
    useState<BookingRecord | null>(null);

  const [trailerMovie, setTrailerMovie] = useState<Movie | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const pushToast = useCallback(
    (type: ToastItem['type'], message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadMovies = useCallback(async () => {
    setMoviesLoading(true);
    try {
      const res = await fetch('/api/movies');
      if (res.ok) {
        const list: Movie[] = await res.json();
        setMovies(list);
      }
    } catch (err) {
      console.error('Failed to fetch movies:', err);
    } finally {
      setMoviesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#admin') {
        setActiveView('admin');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (view: AppView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectMovie = (movieId: number) => {
    setSelectedMovieId(movieId);
    navigate('movie-details');
  };

  const handleSelectShow = (showId: number) => {
    setSelectedShowId(showId);
    navigate('seats');
  };

  const handleProceedToPayment = (checkout: PendingCheckout) => {
    setPendingCheckout(checkout);
    navigate('payment');
  };

  const handleBookingSuccess = (booking: BookingRecord) => {
    setConfirmedBooking(booking);
    setPendingCheckout(null);
    pushToast('success', `Booking ${booking.bookingCode} confirmed.`);
    navigate('confirmation');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A090C] text-[#F5F2EB]">
      <TopBar
        activeView={activeView}
        onNavigate={navigate}
        onOpenAuthModal={openAuthModal}
      />

      <main className="flex-1">
        {activeView === 'home' && (
          <HomeView
            movies={movies}
            loading={moviesLoading}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedGenre={selectedGenre}
            onGenreChange={setSelectedGenre}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            onSelectMovie={handleSelectMovie}
            onOpenTrailer={setTrailerMovie}
            onExploreAllMovies={() => navigate('movies')}
            onOpenAuthModal={openAuthModal}
          />
        )}

        {activeView === 'movies' && (
          <MoviesDirectoryView
            movies={movies}
            loading={moviesLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedGenre={selectedGenre}
            onGenreChange={setSelectedGenre}
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onSelectMovie={handleSelectMovie}
          />
        )}

        {activeView === 'theatres' && (
          <TheatresDirectoryView
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            onSelectShow={handleSelectShow}
          />
        )}

        {activeView === 'movie-details' && selectedMovieId !== null && (
          <MovieDetailsView
            movieId={selectedMovieId}
            selectedCity={selectedCity}
            onCityChange={setSelectedCity}
            onBack={() => navigate('movies')}
            onOpenTrailer={setTrailerMovie}
            onSelectShow={handleSelectShow}
          />
        )}

        {activeView === 'seats' && selectedShowId !== null && (
          <SeatSelectionView
            showId={selectedShowId}
            onBack={() =>
              selectedMovieId ? navigate('movie-details') : navigate('theatres')
            }
            onProceedToPayment={handleProceedToPayment}
            onError={(msg) => pushToast('error', msg)}
          />
        )}

        {activeView === 'payment' && pendingCheckout && (
          <PaymentView
            checkout={pendingCheckout}
            onBack={() => navigate('seats')}
            onOpenAuthModal={() => openAuthModal('login')}
            onSuccess={handleBookingSuccess}
            onError={(msg) => pushToast('error', msg)}
          />
        )}

        {activeView === 'confirmation' && confirmedBooking && (
          <BookingConfirmationView
            booking={confirmedBooking}
            onViewMyBookings={() => navigate('bookings')}
            onBackHome={() => navigate('home')}
          />
        )}

        {activeView === 'bookings' && (
          <ProfileBookingsView
            onOpenAuthModal={() => openAuthModal('login')}
            onBrowseMovies={() => navigate('movies')}
            onOpenAdmin={() => navigate('admin')}
            onSuccess={(msg) => pushToast('success', msg)}
            onError={(msg) => pushToast('error', msg)}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboardView
            onOpenAuthModal={() => openAuthModal('login')}
            onCatalogMutated={loadMovies}
            onSuccess={(msg) => pushToast('success', msg)}
            onError={(msg) => pushToast('error', msg)}
          />
        )}
      </main>

      <Footer onNavigate={navigate} />

      <TrailerModal
        movie={trailerMovie}
        onClose={() => setTrailerMovie(null)}
      />

      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSignedIn={(msg) => pushToast('success', msg)}
        onError={(msg) => pushToast('error', msg)}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CineverseApp />
    </AuthProvider>
  );
}
