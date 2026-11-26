import { useState } from 'react';
import { Film, Star } from 'lucide-react';
import type { Movie } from '../types';

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

export function MovieCard({
  movie,
  onSelect,
}: {
  movie: Movie;
  onSelect: (movieId: number) => void;
}) {
  const [imgError, setImgError] = useState(false);

  return (
    <article
      className="group flex flex-col bg-[#141216] border border-white/10 rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37]/40 cursor-pointer"
      onClick={() => onSelect(movie.id)}
    >
      <div className="relative aspect-[3/4] w-full bg-[#1B171E] overflow-hidden">
        {!imgError && movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={`${movie.title} theatrical poster`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#23151A] to-[#0E0C10]">
            <Film className="w-10 h-10 text-[#D4AF37]/70 mb-3" />
            <span className="font-display text-lg font-semibold text-[#F5F2EB]">
              {movie.title}
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#141216] via-[#141216]/50 to-transparent pointer-events-none" />
      </div>

      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div>
          <p className="text-xs text-[#A9A299] truncate">
            {movie.genre} <span aria-hidden="true">·</span> {movie.language}{' '}
            <span aria-hidden="true">·</span> {formatDuration(movie.durationMin)}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-[#F5F2EB] group-hover:text-[#D4AF37] transition-colors line-clamp-1">
            {movie.title}
          </h3>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <span className="inline-flex items-center gap-1 font-mono tabular-nums text-[#D4AF37]">
            <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
            {movie.rating}
          </span>
          <span className="text-[#A9A299] font-mono tabular-nums">
            {movie.status === 'coming_soon' ? `Opens ${movie.releaseDate}` : movie.certificate}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(movie.id);
          }}
          className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap bg-[#1F1A22] text-[#F5F2EB] border border-white/10 group-hover:bg-[#D4AF37] group-hover:text-[#0A090C] group-hover:border-[#D4AF37]"
        >
          {movie.status === 'coming_soon' ? 'View Details' : 'Book Tickets'}
        </button>
      </div>
    </article>
  );
}
