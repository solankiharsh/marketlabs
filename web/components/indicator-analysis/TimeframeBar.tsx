'use client';

/**
 * Timeframe selector for ChartSection — 1m 5m 15m 30m 1H 4H 1D 1W.
 * Active pill uses gold (dark) or mint (light) background.
 */

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'] as const;
export type TimeframeValue = (typeof TIMEFRAMES)[number];

export interface TimeframeBarProps {
  value: TimeframeValue;
  onChange: (tf: TimeframeValue) => void;
  dark?: boolean;
}

export function TimeframeBar({ value, onChange, dark = true }: TimeframeBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {TIMEFRAMES.map((tf) => {
        const isActive = value === tf;
        return (
          <button
            key={tf}
            type="button"
            onClick={() => onChange(tf)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isActive
                ? dark
                  ? 'bg-[#D4A843] text-[#0F1117] border-[#D4A843]'
                  : 'bg-[#2DD4A8] text-white border-[#2DD4A8]'
                : 'bg-transparent text-[#6B7280] border-[#2A3040] hover:bg-[#181C25] hover:text-[#F5F5F5]'
            }`}
            aria-pressed={isActive}
            aria-label={`Timeframe ${tf}`}
          >
            {tf}
          </button>
        );
      })}
    </div>
  );
}
