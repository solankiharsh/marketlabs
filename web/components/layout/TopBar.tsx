'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, LogOut, User, Bell, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { searchSymbols, getStrategyNotifications, markNotificationRead, markAllNotificationsRead, type SymbolSearchItem } from '@/lib/api';
import { cn } from '@/lib/utils';

type NotificationItem = Record<string, unknown> & { id?: number; is_read?: number; message?: string; content?: string; created_at?: number };

export function TopBar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SymbolSearchItem[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

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

  const NOTIFICATIONS_TIMEOUT_MS = 10000;

  const fetchNotifications = useCallback(() => {
    setNotificationsLoading(true);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), NOTIFICATIONS_TIMEOUT_MS)
    );
    Promise.race([getStrategyNotifications({ limit: 30 }), timeoutPromise])
      .then((r) => setNotifications((r.items ?? []) as NotificationItem[]))
      .catch(() => setNotifications([]))
      .finally(() => setNotificationsLoading(false));
  }, []);

  useEffect(() => {
    if (notificationsOpen) fetchNotifications();
  }, [notificationsOpen, fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    getStrategyNotifications({ limit: 50 })
      .then((r) => setNotifications((r.items ?? []) as NotificationItem[]))
      .catch(() => setNotifications([]));
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        searchRef.current && !searchRef.current.contains(target) &&
        userRef.current && !userRef.current.contains(target) &&
        notificationsRef.current && !notificationsRef.current.contains(target)
      ) {
        setSearchOpen(false);
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n)));
    } catch {}
  };

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
        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => setNotificationsOpen((o) => !o)}
            className="p-2 rounded-lg text-text-muted hover:bg-bg-elevated hover:text-text-primary relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 max-h-[min(24rem,70vh)] rounded-lg border border-border bg-card shadow-lg z-50 flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="font-medium text-text-primary text-sm">Notifications</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchNotifications}
                    disabled={notificationsLoading}
                    className="p-1.5 rounded text-text-muted hover:bg-bg-elevated hover:text-text-primary disabled:opacity-50"
                    aria-label="Refresh notifications"
                  >
                    <RefreshCw className={cn('h-4 w-4', notificationsLoading && 'animate-spin')} />
                  </button>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="text-xs text-accent-primary hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
              </div>
              <ul className="overflow-auto flex-1 py-1">
                {notificationsLoading ? (
                  <li className="px-3 py-4 text-center text-sm text-text-muted">Loading…</li>
                ) : notifications.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-text-muted">No notifications</li>
                ) : (
                  notifications.map((n) => {
                    const isRead = !!n.is_read;
                    const msg = String(n.message ?? n.content ?? '—');
                    return (
                      <li
                        key={String(n.id)}
                        className={cn(
                          'px-3 py-2 text-sm border-b border-border/50 last:border-0',
                          !isRead && 'bg-accent-primary/5'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={isRead ? 'text-text-muted' : 'text-text-primary'}>{msg}</span>
                          {n.id != null && !isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkOneRead(Number(n.id))}
                              className="text-xs text-accent-primary hover:underline shrink-0"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          )}
        </div>

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
