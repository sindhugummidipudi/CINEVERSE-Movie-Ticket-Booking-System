import { ExternalLink, X } from 'lucide-react';
import type { Movie } from '../types';

export function TrailerModal({
  movie,
  onClose,
}: {
  movie: Movie | null;
  onClose: () => void;
}) {
  if (!movie) return null;

  const isValidEmbed =
    movie.trailerUrl &&
    (movie.trailerUrl.startsWith('https://www.youtube.com/embed/') ||
      movie.trailerUrl.startsWith('https://player.vimeo.com/'));

  const youtubeWatchUrl =
    movie.trailerUrl && movie.trailerUrl.startsWith('https://www.youtube.com/embed/')
      ? `https://www.youtube.com/watch?v=${movie.trailerUrl.split('/embed/')[1]?.split('?')[0]}`
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trailer-modal-title"
    >
      <div className="w-full max-w-4xl bg-[#141216] border border-white/15 rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div>
            <p className="text-xs text-[#A9A299]">Official Theatrical Preview</p>
            <h3
              id="trailer-modal-title"
              className="font-display text-xl font-semibold text-[#F5F2EB]"
            >
              {movie.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {youtubeWatchUrl && (
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-xs font-medium text-[#D6D0C6] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Watch on YouTube
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close trailer"
              className="p-2 rounded-lg text-[#A9A299] hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="aspect-video w-full bg-black relative">
          {isValidEmbed ? (
            <iframe
              src={movie.trailerUrl}
              title={`${movie.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center">
              <p className="text-base font-medium text-[#F5F2EB]">
                Theatrical preview reel unavailable in offline mode
              </p>
              <p className="mt-1 text-sm text-[#A9A299] max-w-md">
                {movie.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
