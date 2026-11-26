import { useState } from 'react';
import { LogOut, Menu, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppView } from '../types';

interface TopBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAuthModal: (mode?: 'login' | 'register') => void;
}

export function TopBar({
  activeView,
  onNavigate,
  onOpenAuthModal,
}: TopBarProps) {
  const { profile, firebaseUser, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems: Array<{ id: AppView; label: string }> = [
    { id: 'home', label: 'Home' },
    { id: 'movies', label: 'Movies' },
    { id: 'theatres', label: 'Theatres' },
    { id: 'bookings', label: 'My Bookings' },
    ...(profile?.role === 'admin' ? [{ id: 'admin' as AppView, label: 'Admin' }] : []),
  ];

  const handleNav = (id: AppView) => {
    setMenuOpen(false);
    onNavigate(id);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0A090C]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav('home')}
          className="font-display text-2xl font-bold tracking-[0.14em] text-[#F5F2EB] hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
        >
          CINEVERSE
        </button>

        {/* Zone 2: Concise single-line text nav links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive =
              activeView === item.id ||
              (item.id === 'movies' &&
                ['movie-details', 'seats', 'payment', 'confirmation'].includes(
                  activeView
                ));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#D4AF37] ${
                  isActive
                    ? 'text-[#D4AF37] border-[#D4AF37]'
                    : 'text-[#C8C2B8] border-transparent hover:text-[#F5F2EB] hover:border-white/30'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Auth actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNav('bookings')}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-white/15 bg-[#161319] text-[#F5F2EB] hover:border-[#D4AF37]/60 transition-colors whitespace-nowrap shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="max-w-[120px] truncate">
                  {profile?.name || firebaseUser?.displayName || 'Account'}
                </span>
              </button>
              <button
                type="button"
                onClick={logout}
                aria-label="Sign out"
                title="Sign out"
                className="hidden sm:inline-flex items-center justify-center p-2 rounded-lg text-[#B5AEA4] hover:text-white hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="px-3.5 py-2 text-xs font-medium rounded-lg border border-white/15 text-[#F5F2EB] hover:border-[#D4AF37]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => onOpenAuthModal('register')}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#D4AF37] text-[#0A090C] hover:bg-[#E5C150] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
              >
                Create Account
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden p-2 rounded-lg text-[#C8C2B8] hover:text-white hover:bg-white/5"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0E0C10] px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeView === item.id
                  ? 'bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'text-[#C8C2B8] hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                logout();
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-white/5"
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </header>
  );
}
