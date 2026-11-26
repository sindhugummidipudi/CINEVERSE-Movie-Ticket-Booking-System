import type { AppView } from '../types';

export function Footer({ onNavigate }: { onNavigate: (view: AppView) => void }) {
  return (
    <footer className="border-t border-white/10 bg-[#080709] text-[#9C958B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-3">
          <span className="font-display text-2xl font-bold tracking-[0.14em] text-[#F5F2EB]">
            CINEVERSE
          </span>
          <p className="text-sm leading-relaxed max-w-sm">
            Flagship theatrical booking across IMAX Laser and Dolby Atmos
            auditoriums. Curated premieres, effortless seat selection, and
            instant digital passes.
          </p>
        </div>

        <div className="md:col-span-3 space-y-2.5 text-sm">
          <p className="text-xs font-semibold text-[#F5F2EB]">Explore</p>
          <ul className="space-y-2">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="hover:text-[#D4AF37] transition-colors"
              >
                Home
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('movies')}
                className="hover:text-[#D4AF37] transition-colors"
              >
                Movies Catalog
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('theatres')}
                className="hover:text-[#D4AF37] transition-colors"
              >
                Partner Theatres
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('bookings')}
                className="hover:text-[#D4AF37] transition-colors"
              >
                My Bookings
              </button>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4 space-y-2.5 text-sm">
          <p className="text-xs font-semibold text-[#F5F2EB]">Concierge & Box Office</p>
          <p>concierge@cineverse.cinema</p>
          <p className="font-mono tabular-nums">+91 22 4890 2100</p>
          <p className="text-xs text-[#7D766E]">
            Colaba Heritage Pier, Mumbai · Indiranagar, Bengaluru
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 py-5 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7D766E]">
        <span>© {new Date().getFullYear()} CINEVERSE Theatres. All rights reserved.</span>
        <span>Demo payment environment active for reservation previews.</span>
      </div>
    </footer>
  );
}
