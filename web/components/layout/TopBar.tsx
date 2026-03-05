'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, LogOut, User, Bell } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { searchSymbols, type SymbolSearchItem } from '@/lib/api';
import { cn } from '@/lib/utils';

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchSymbols('Crypto', searchQuery, 8)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        searchRef.current && !searchRef.current.contains(e.target as Node) &&
        userRef.current && !userRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    router.replace('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-4">
      <div className="flex-1 min-w-0" />

      <div className="relative flex items-center gap-2" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search symbol..."
            className="w-48 sm:w-56 pl-9 pr-3 py-2 rounded-lg bg-bg-secondary border border-border text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          />
        </div>
        {searchOpen && (searchResults.length > 0 || searchQuery.trim()) && (
          <div className="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg border border-border bg-card shadow-lg z-50 max-h-64 overflow-auto">
            {searchResults.length === 0 ? (
              <p className="px-3 py-2 text-sm text-text-muted">No symbols found</p>
            ) : (
              searchResults.map((s, i) => (
                <Link
                  key={`${s.market ?? 'Crypto'}:${s.symbol}:${i}`}
                  href={`/market/${encodeURIComponent((s.symbol ?? '').replace('/', '-'))}?market=${encodeURIComponent(s.market ?? 'Crypto')}`}
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="block px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated"
                >
                  {s.name || s.symbol} ({s.symbol})
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setNotificationsOpen((o) => !o)}
          className="p-2 rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative" ref={userRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-secondary hover:bg-bg-elevated transition-colors text-sm"
          >
            <span className="text-text-primary truncate max-w-[120px]">
              {String(user?.username ?? user?.nickname ?? 'User')}
            </span>
            <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', userMenuOpen && 'rotate-180')} />
          </button>
          {userMenuOpen && (
            <div className="absolute right-0 mt-1 py-1 w-48 rounded-lg border border-border bg-card shadow-lg z-50">
              <Link
                href="/profile"
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary hover:bg-bg-elevated"
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-text-primary hover:bg-bg-elevated"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
