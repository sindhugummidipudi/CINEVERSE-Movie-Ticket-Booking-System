import { useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Play,
  Search,
  Star,
  Ticket,
} from 'lucide-react';
import type { Movie } from '../types';
import { useAuth } from '../context/AuthContext';
import { MovieCard } from './MovieCard';

interface HomeViewProps {
  movies: Movie[];
  loading: boolean;
  selectedCity: string;
  onCityChange: (city: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onSelectMovie: (movieId: number) => void;
  onOpenTrailer: (movie: Movie) => void;
  onExploreAllMovies: () => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
}

const CITIES = [
  'All Cities',
  'Chennai',
  'Hyderabad',
  'Bengaluru',
  'Mumbai',
  'New Delhi',
];

export function HomeView({
  movies,
  loading,
  selectedCity,
  onCityChange,
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  selectedLanguage,
  onLanguageChange,
  onSelectMovie,
  onOpenTrailer,
  onExploreAllMovies,
  onOpenAuthModal,
}: HomeViewProps) {
  const { isAuthenticated } = useAuth();
  const [heroImgError, setHeroImgError] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  const genres = [
    'All',
    ...Array.from(new Set(movies.map((m) => m.genre))).sort(),
  ];
  const languages = [
    'All',
    ...Array.from(new Set(movies.map((m) => m.language))).sort(),
  ];

  const filteredMovies = movies.filter((m) => {
    if (selectedGenre !== 'All' && m.genre !== selectedGenre) return false;
    if (selectedLanguage !== 'All' && m.language !== selectedLanguage) return false;
    if (
      selectedCity !== 'All Cities' &&
      m.status === 'now_showing' &&
      m.cities &&
      m.cities.length > 0 &&
      !m.cities.includes(selectedCity)
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const needle = searchQuery.trim().toLowerCase();
      const hay = `${m.title} ${m.genre} ${m.language} ${m.director}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  const trendingMovies = filteredMovies.filter((m) => m.isTrending);
  const nowShowingMovies = filteredMovies.filter((m) => m.status === 'now_showing');
  const comingSoonMovies = filteredMovies.filter((m) => m.status === 'coming_soon');

  const heroMovie =
    movies.find((m) => m.isTrending && m.status === 'now_showing') || movies[0];

  const scrollCarousel = (dir: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const offset = dir === 'left' ? -340 : 340;
    carouselRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  return (
    <div className="space-y-14 pb-20">
      {/* First-Page Login & Create Account Strip (when signed out) */}
      {!isAuthenticated && (
        <section className="border-b border-[#D4AF37]/20 bg-[#141118]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-[#D6D0C6]">
              <span className="font-semibold text-[#D4AF37]">Welcome to Cineverse.</span>{' '}
              Login or create an account to reserve seats, download QR passes, and get tickets on WhatsApp or Email.
            </p>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="px-4 py-1.5 rounded-lg border border-white/20 text-xs font-medium text-[#F5F2EB] hover:border-[#D4AF37] transition-colors cursor-pointer"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => onOpenAuthModal('register')}
                className="px-4 py-1.5 rounded-lg bg-[#D4AF37] text-[#0A090C] text-xs font-semibold hover:bg-[#E5C150] transition-colors cursor-pointer"
              >
                Create Account
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Large Cinematic Hero Section */}
      {heroMovie && (
        <section className="relative w-full min-h-[540px] lg:min-h-[600px] flex items-end overflow-hidden border-b border-white/10">
          {!heroImgError ? (
            <img
              src={heroMovie.backdropUrl}
              alt={`${heroMovie.title} theatrical backdrop`}
              referrerPolicy="no-referrer"
              onError={() => setHeroImgError(true)}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#2C1018] via-[#120D14] to-[#0A090C]" />
          )}

          {/* Measured contrast scrims */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A090C] via-[#0A090C]/65 to-[#0A090C]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A090C]/95 via-[#0A090C]/60 to-transparent" />

          <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-medium tracking-wider text-[#D4AF37]">
                Featured Premiere <span aria-hidden="true">·</span> {heroMovie.genre}{' '}
                <span aria-hidden="true">·</span> {heroMovie.language}
              </p>

              <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#F5F2EB] leading-[1.08] [text-wrap:balance]">
                {heroMovie.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#D6D0C6]">
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[#D4AF37]">
                  <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
                  {heroMovie.rating} / 10
                </span>
                <span aria-hidden="true">·</span>
                <span>{heroMovie.durationMin} min</span>
                <span aria-hidden="true">·</span>
                <span>{heroMovie.certificate}</span>
                <span aria-hidden="true">·</span>
                <span>Dir. {heroMovie.director}</span>
              </div>

              <p className="mt-4 text-base text-[#C8C2B8] leading-relaxed line-clamp-3">
                {heroMovie.description}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => onSelectMovie(heroMovie.id)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] text-[#0A090C] font-semibold text-sm hover:bg-[#E5C150] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Ticket className="w-4 h-4" />
                  Book Tickets
                </button>
                <button
                  type="button"
                  onClick={() => onOpenTrailer(heroMovie)}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#18141B]/90 text-[#F5F2EB] border border-white/20 hover:border-[#D4AF37]/60 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 text-[#D4AF37]" />
                  Watch Trailer
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search, Location, Genre & Language Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#141216] border border-white/10 rounded-2xl p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#9C958B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search films, directors, or genres..."
                aria-label="Search movies"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] placeholder:text-[#7D766E] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div className="md:col-span-3 relative">
              <MapPin className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedCity}
                onChange={(e) => onCityChange(e.target.value)}
                aria-label="Select city"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedGenre}
                onChange={(e) => onGenreChange(e.target.value)}
                aria-label="Filter by genre"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              >
                {genres.map((g) => (
                  <option key={g} value={g}>
                    {g === 'All' ? 'All Genres' : g}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                value={selectedLanguage}
                onChange={(e) => onLanguageChange(e.target.value)}
                aria-label="Filter by language"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0C0B0E] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
              >
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {l === 'All' ? 'All Languages' : l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Language Tabs */}
          <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-xs text-[#9C958B] mr-1">Language:</span>
            {languages.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => onLanguageChange(lang)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedLanguage === lang
                    ? 'bg-[#D4AF37] text-[#0A090C]'
                    : 'bg-[#0C0B0E] text-[#C8C2B8] border border-white/10 hover:border-[#D4AF37]/50 hover:text-white'
                }`}
              >
                {lang === 'All' ? 'All Languages' : lang}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Carousel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#D4AF37]">Curated Box Office</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#F5F2EB]">
              Currently Trending
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCarousel('left')}
              aria-label="Scroll trending movies left"
              className="p-2 rounded-lg border border-white/10 bg-[#141216] text-[#C8C2B8] hover:text-white hover:border-[#D4AF37]/50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel('right')}
              aria-label="Scroll trending movies right"
              className="p-2 rounded-lg border border-white/10 bg-[#141216] text-[#C8C2B8] hover:text-white hover:border-[#D4AF37]/50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl bg-[#141216] border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : trendingMovies.length === 0 ? (
          <div className="py-10 px-6 rounded-xl border border-white/10 bg-[#141216] text-center">
            <p className="text-sm text-[#A9A299]">
              No trending titles match your current filters.
            </p>
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
          >
            {trendingMovies.map((movie) => (
              <div
                key={movie.id}
                className="min-w-[260px] sm:min-w-[280px] max-w-[300px] snap-start shrink-0"
              >
                <MovieCard movie={movie} onSelect={onSelectMovie} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Now Showing Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <p className="text-xs font-medium text-[#D4AF37]">
              In Cinemas · {selectedCity}
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#F5F2EB]">
              Now Showing
            </h2>
          </div>
          <button
            type="button"
            onClick={onExploreAllMovies}
            className="text-xs font-medium text-[#D4AF37] hover:text-[#E5C150] transition-colors whitespace-nowrap"
          >
            Browse Full Catalog
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[420px] rounded-xl bg-[#141216] border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : nowShowingMovies.length === 0 ? (
          <div className="py-12 px-6 rounded-xl border border-white/10 bg-[#141216] text-center space-y-3">
            <p className="text-base font-medium text-[#F5F2EB]">
              No showtimes found for those filters
            </p>
            <p className="text-sm text-[#A9A299]">
              Try switching your selected city or clearing genre/language filters.
            </p>
            <button
              type="button"
              onClick={() => {
                onCityChange('All Cities');
                onGenreChange('All');
                onLanguageChange('All');
                onSearchChange('');
              }}
              className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A090C] text-xs font-semibold"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {nowShowingMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onSelect={onSelectMovie} />
            ))}
          </div>
        )}
      </section>

      {/* Coming Soon Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="border-b border-white/10 pb-4">
          <p className="text-xs font-medium text-[#A9A299]">Upcoming Releases</p>
          <h2 className="mt-1 font-display text-3xl font-semibold text-[#F5F2EB]">
            Coming Soon
          </h2>
        </div>

        {comingSoonMovies.length === 0 ? (
          <p className="text-sm text-[#A9A299]">
            No upcoming titles match your active filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {comingSoonMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onSelect={onSelectMovie} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
