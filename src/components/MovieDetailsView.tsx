import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Film,
  MapPin,
  Play,
  Star,
} from 'lucide-react';
import type { Movie, MovieDetails, ShowSummary } from '../types';

function formatReadableDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function MovieDetailsView({
  movieId,
  selectedCity,
  onCityChange,
  onBack,
  onOpenTrailer,
  onSelectShow,
}: {
  movieId: number;
  selectedCity: string;
  onCityChange: (city: string) => void;
  onBack: () => void;
  onOpenTrailer: (movie: Movie) => void;
  onSelectShow: (showId: number) => void;
}) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [posterError, setPosterError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/movies/${movieId}`)
      .then((res) => res.json())
      .then((data: MovieDetails) => {
        if (!active) return;
        setDetails(data);
        if (data.shows && data.shows.length > 0) {
          setSelectedDate(data.shows[0].showDate);
        }
      })
      .catch((err) => console.error('Failed to load movie details:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [movieId]);

  const availableCities = useMemo(() => {
    if (!details?.shows) return ['All Cities'];
    const cities = Array.from(new Set(details.shows.map((s) => s.theatreCity)));
    return ['All Cities', ...cities];
  }, [details]);

  const availableDates = useMemo(() => {
    if (!details?.shows) return [];
    const filteredByCity =
      selectedCity === 'All Cities'
        ? details.shows
        : details.shows.filter((s) => s.theatreCity === selectedCity);
    return Array.from(new Set(filteredByCity.map((s) => s.showDate))).sort();
  }, [details, selectedCity]);

  useEffect(() => {
    if (
      availableDates.length > 0 &&
      (!selectedDate || !availableDates.includes(selectedDate))
    ) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  const theatresWithShows = useMemo(() => {
    if (!details?.shows) return [];
    const filtered = details.shows.filter((s) => {
      if (selectedCity !== 'All Cities' && s.theatreCity !== selectedCity) {
        return false;
      }
      if (selectedDate && s.showDate !== selectedDate) return false;
      return true;
    });

    const grouped = new Map<
      number,
      {
        theatreId: number;
        theatreName: string;
        theatreCity: string;
        theatreAddress: string;
        shows: ShowSummary[];
      }
    >();

    for (const sh of filtered) {
      if (!grouped.has(sh.theatreId)) {
        grouped.set(sh.theatreId, {
          theatreId: sh.theatreId,
          theatreName: sh.theatreName,
          theatreCity: sh.theatreCity,
          theatreAddress: sh.theatreAddress || '',
          shows: [],
        });
      }
      grouped.get(sh.theatreId)!.shows.push(sh);
    }

    return Array.from(grouped.values());
  }, [details, selectedCity, selectedDate]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        <div className="h-72 rounded-2xl bg-[#141216] border border-white/10 animate-pulse" />
        <div className="h-48 rounded-2xl bg-[#141216] border border-white/10 animate-pulse" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-lg text-[#F5F2EB]">Movie details could not be loaded.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A090C] text-sm font-semibold"
        >
          Back to Movies
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Cinematic Backdrop Header */}
      <section className="relative border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={details.backdropUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A090C] via-[#0A090C]/80 to-[#0A090C]/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#C8C2B8] hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Browse
          </button>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 lg:col-span-3">
              <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-white/15 bg-[#141216] shadow-2xl">
                {!posterError ? (
                  <img
                    src={details.posterUrl}
                    alt={`${details.title} poster`}
                    referrerPolicy="no-referrer"
                    onError={() => setPosterError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                    <Film className="w-10 h-10 text-[#D4AF37]" />
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-8 lg:col-span-9 space-y-5">
              <div>
                <p className="text-xs font-medium text-[#D4AF37]">
                  {details.status === 'coming_soon' ? 'Upcoming Release' : 'Now Showing'}{' '}
                  <span aria-hidden="true">·</span> {details.genre}{' '}
                  <span aria-hidden="true">·</span> {details.language}
                </p>
                <h1 className="mt-2 font-display text-4xl sm:text-5xl font-bold text-[#F5F2EB] [text-wrap:balance]">
                  {details.title}
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#D6D0C6]">
                <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[#D4AF37]">
                  <Star className="w-4 h-4 fill-[#D4AF37] text-[#D4AF37]" />
                  {details.rating} / 10
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{details.durationMin} min</span>
                <span aria-hidden="true">·</span>
                <span>{details.certificate}</span>
                <span aria-hidden="true">·</span>
                <span>Release {details.releaseDate}</span>
              </div>

              <p className="text-base text-[#C8C2B8] leading-relaxed max-w-3xl">
                {details.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenTrailer(details)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#0A090C] text-sm font-semibold hover:bg-[#E5C150] transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Watch Trailer
                </button>
              </div>

              {/* Cast & Crew */}
              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="text-xs text-[#A9A299]">
                  Directed by{' '}
                  <span className="text-[#F5F2EB] font-medium">
                    {details.director}
                  </span>
                </div>

                {details.cast && details.cast.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    {details.cast.map((member) => (
                      <div
                        key={member.name}
                        className="p-3 rounded-xl bg-[#141216]/90 border border-white/10"
                      >
                        <p className="text-sm font-medium text-[#F5F2EB] truncate">
                          {member.name}
                        </p>
                        <p className="text-xs text-[#9C958B] truncate">
                          {member.role}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Theatre & Showtime Selection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-medium text-[#D4AF37]">Select Showtime</p>
            <h2 className="mt-1 font-display text-3xl font-semibold text-[#F5F2EB]">
              Theatres & Timings
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              aria-label="Filter theatres by city"
              className="px-3.5 py-2 rounded-xl bg-[#141216] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
            >
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {availableDates.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#141216] border border-white/10">
                {availableDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDate(d)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedDate === d
                        ? 'bg-[#D4AF37] text-[#0A090C]'
                        : 'text-[#C8C2B8] hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    {formatReadableDate(d)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {details.status === 'coming_soon' ? (
          <div className="p-8 rounded-2xl bg-[#141216] border border-white/10 text-center space-y-2">
            <p className="text-base font-medium text-[#F5F2EB]">
              Advance reservations open closer to {details.releaseDate}
            </p>
            <p className="text-sm text-[#A9A299]">
              Watch the preview above or browse Now Showing titles for immediate seat selection.
            </p>
          </div>
        ) : theatresWithShows.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#141216] border border-white/10 text-center space-y-3">
            <p className="text-base text-[#F5F2EB]">
              No showtimes scheduled in {selectedCity} on {selectedDate}.
            </p>
            {selectedCity !== 'All Cities' && (
              <button
                type="button"
                onClick={() => onCityChange('All Cities')}
                className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A090C] text-xs font-semibold"
              >
                Show All Cities
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {theatresWithShows.map((group) => (
              <div
                key={group.theatreId}
                className="p-6 rounded-2xl bg-[#141216] border border-white/10 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                      {group.theatreName}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#A9A299]">
                      <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {group.theatreCity} — {group.theatreAddress}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {group.shows.map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => onSelectShow(sh.id)}
                      className="text-left p-4 rounded-xl bg-[#0C0B0E] border border-white/15 hover:border-[#D4AF37] transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-base font-semibold text-[#F5F2EB] group-hover:text-[#D4AF37]">
                          <Clock className="w-4 h-4 text-[#D4AF37]" />
                          {sh.showTime}
                        </span>
                        <span className="text-xs text-[#A9A299]">
                          {sh.screenFormat}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-[#B5AEA4] truncate">
                        {sh.screenName}
                      </p>
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] font-mono tabular-nums text-[#A9A299]">
                        <span>Silver ${sh.silverPrice}</span>
                        <span>Gold ${sh.goldPrice}</span>
                        <span>Plat ${sh.platinumPrice}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
