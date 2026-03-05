'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { getEconomicCalendar } from '@/lib/api';

interface CalendarEvent {
  id?: number;
  name?: string;
  name_en?: string;
  country?: string;
  date?: string;
  time?: string;
  importance?: string;
  actual?: string;
  forecast?: string;
  previous?: string;
  expected_impact?: string;
  actual_impact?: string;
  is_released?: boolean;
}

const COUNTRY_FLAG: Record<string, string> = {
  US: '🇺🇸',
  EU: '🇪🇺',
  JP: '🇯🇵',
  UK: '🇬🇧',
  INTL: '🌍',
};

function formatDateLabel(dateStr: string | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tmrw';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}/${day}`;
}

export function EconomicCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEconomicCalendar()
      .then((data) => setEvents(Array.isArray(data) ? (data as CalendarEvent[]) : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <h3 className="text-xs font-semibold text-text-primary flex items-center gap-1.5 mb-2">
          <Calendar className="w-3.5 h-3.5 text-accent-primary" />
          Calendar
        </h3>
        <div className="space-y-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-bg-elevated rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <h3 className="text-xs font-semibold text-text-primary flex items-center gap-1.5 mb-2">
        <Calendar className="w-3.5 h-3.5 text-accent-primary" />
        Calendar
      </h3>
      <div className="space-y-1 max-h-52 overflow-auto">
        {events.slice(0, 10).map((evt, i) => {
          const value = evt.actual ?? evt.forecast ?? '—';
          const impact = evt.actual_impact ?? evt.expected_impact ?? '';
          const isUp = impact === 'bullish' || (typeof value === 'string' && value !== '—');
          const flag = evt.country ? COUNTRY_FLAG[evt.country] ?? '' : '';
          const name = (evt.name_en ?? evt.name ?? '—').slice(0, 18);
          const displayName = name.length >= 18 ? `${name}...` : name;
          return (
            <div
              key={evt.id ?? i}
              className="flex items-center gap-1.5 text-[11px] py-1 border-b border-border/50 last:border-0"
            >
              <span className="flex-shrink-0 w-9 text-text-muted font-mono tabular-nums">
                {formatDateLabel(evt.date)}
              </span>
              <span className="flex-shrink-0 w-8 text-text-muted font-mono tabular-nums">
                {evt.time ?? '—'}
              </span>
              <span className="flex-shrink-0">{flag}</span>
              <span className="flex-1 min-w-0 truncate text-text-secondary">{displayName}</span>
              <span className={`flex-shrink-0 font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                {isUp ? '↑' : '↓'}
              </span>
              <span className="flex-shrink-0 font-mono text-text-primary truncate max-w-12">{String(value)}</span>
            </div>
          );
        })}
        {events.length === 0 && (
          <p className="text-text-muted text-xs py-3">No upcoming events</p>
        )}
      </div>
    </div>
  );
}
