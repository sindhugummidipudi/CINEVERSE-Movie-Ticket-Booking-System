import { Search } from 'lucide-react';
import type { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface MoviesDirectoryViewProps {
  movies: Movie[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGenre: string;
  onGenreChange: (g: string) => void;
  selectedLanguage: string;
  onLanguageChange: (l: string) => void;
  statusFilter: 'all' | 'now_showing' | 'coming_soon';
  onStatusFilterChange: (s: 'all' | 'now_showing' | 'coming_soon') => void;
  onSelectMovie: (id: number) => void;
}

export function MoviesDirectoryView({
  movies,
  loading,
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  selectedLanguage,
  onLanguageChange,
  statusFilter,
  onStatusFilterChange,
  onSelectMovie,
}: MoviesDirectoryViewProps) {
  const genres = ['All', ...Array.from(new Set(movies.map((m) => m.genre))).sort()];
  const languages = [
    'All',
    ...Array.from(new Set(movies.map((m) => m.language))).sort(),
  ];

  const filtered = movies.filter((m) => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (selectedGenre !== 'All' && m.genre !== selectedGenre) return false;
    if (selectedLanguage !== 'All' && m.language !== selectedLanguage) return false;
    if (searchQuery.trim()) {
      const needle = searchQuery.trim().toLowerCase();
      if (
        !`${m.title} ${m.genre} ${m.language} ${m.director}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs font-medium text-[#D4AF37]">Film Program</p>
          <h1 className="mt-1 font-display text-4xl font-semibold text-[#F5F2EB]">
            All Movies
          </h1>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#141216] border border-white/10">
          {(
            [
              { id: 'all', label: 'All Titles' },
              { id: 'now_showing', label: 'Now Showing' },
              { id: 'coming_soon', label: 'Coming Soon' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-[#D4AF37] text-[#0A090C]'
                  : 'text-[#B5AEA4] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-[#9C958B] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by title, director, or genre..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141216] border border-white/10 text-sm text-[#F5F2EB] placeholder:text-[#7D766E] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={selectedGenre}
            onChange={(e) => onGenreChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141216] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
          >
            {genres.map((g) => (
              <option key={g} value={g}>
                {g === 'All' ? 'All Genres' : g}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#141216] border border-white/10 text-sm text-[#F5F2EB] focus:outline-none focus:border-[#D4AF37]"
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {l === 'All' ? 'All Languages' : l}
              </option>
            ))}
          </select>
        </div>
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
      ) : filtered.length === 0 ? (
        <div className="py-16 rounded-xl border border-white/10 bg-[#141216] text-center space-y-3">
          <p className="text-base font-medium text-[#F5F2EB]">
            No movies match your criteria
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onGenreChange('All');
              onLanguageChange('All');
              onStatusFilterChange('all');
            }}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] text-[#0A090C] text-xs font-semibold"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((movie) => (
            <MovieCard key={movie.id} movie={movie} onSelect={onSelectMovie} />
          ))}
        </div>
      )}
    </div>
  );
}
