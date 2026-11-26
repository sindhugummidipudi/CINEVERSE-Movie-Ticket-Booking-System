import { useEffect, useState } from 'react';
import { Clock, MapPin, Monitor } from 'lucide-react';
import type { TheatreInfo } from '../types';

export function TheatresDirectoryView({
  selectedCity,
  onCityChange,
  onSelectShow,
}: {
  selectedCity: string;
  onCityChange: (city: string) => void;
  onSelectShow: (showId: number) => void;
}) {
  const [theatres, setTheatres] = useState<TheatreInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const cities = [
    'All Cities',
    'Chennai',
    'Hyderabad',
    'Bengaluru',
    'Mumbai',
    'New Delhi',
  ];

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCity !== 'All Cities') {
      params.set('city', selectedCity);
    }
    fetch(`/api/theatres?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (active && Array.isArray(data)) {
          setTheatres(data);
        }
      })
      .catch((err) => console.error('Failed to load theatres:', err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCity]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-medium text-[#D4AF37]">Cinema Locations</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-[#F5F2EB]">
            Partner Theatres
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#141216] border border-white/10">
          {cities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onCityChange(c)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCity === c
                  ? 'bg-[#D4AF37] text-[#0A090C]'
                  : 'text-[#B5AEA4] hover:text-white'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl bg-[#141216] border border-white/10 animate-pulse"
            />
          ))}
        </div>
      ) : theatres.length === 0 ? (
        <div className="py-12 rounded-2xl border border-white/10 bg-[#141216] text-center text-sm text-[#A9A299]">
          No theatres found in {selectedCity}.
        </div>
      ) : (
        <div className="space-y-6">
          {theatres.map((theatre) => (
            <article
              key={theatre.id}
              className="bg-[#141216] border border-white/10 rounded-2xl p-6 space-y-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#F5F2EB]">
                    {theatre.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-[#B5AEA4]">
                    <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
                    {theatre.address}
                  </p>
                </div>

                <div className="text-xs text-[#A9A299] flex flex-wrap items-center gap-2">
                  {theatre.amenities.map((amenity, idx) => (
                    <span key={amenity} className="inline-flex items-center gap-2">
                      {idx > 0 && <span aria-hidden="true">·</span>}
                      <span>{amenity}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[#A9A299]">
                {theatre.screens.map((sc) => (
                  <span key={sc.id} className="inline-flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {sc.name} ({sc.format})
                  </span>
                ))}
              </div>

              {theatre.shows.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {theatre.shows.slice(0, 8).map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => onSelectShow(sh.id)}
                      className="text-left p-3.5 rounded-xl bg-[#0C0B0E] border border-white/10 hover:border-[#D4AF37]/60 transition-colors group"
                    >
                      <p className="text-xs text-[#D4AF37] font-medium truncate">
                        {sh.movieTitle}
                      </p>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-sm font-semibold text-[#F5F2EB] group-hover:text-[#D4AF37]">
                          <Clock className="w-3.5 h-3.5" />
                          {sh.showTime}
                        </span>
                        <span className="text-xs font-mono tabular-nums text-[#A9A299]">
                          {sh.showDate}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#9C958B] truncate">
                        {sh.screenFormat} · From ${sh.silverPrice}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
