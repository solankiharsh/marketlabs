'use client';

const INDICATOR_PILLS = [
  'SMA',
  'EMA',
  'RSI',
  'MACD',
  'BB',
  'ATR',
  'CCI',
  'W%R',
  'MFI',
  'ADX',
  'OBV',
  'ADOSC',
  'AD',
  'KDJ',
] as const;

interface IndicatorToggleBarProps {
  active: Set<string>;
  onToggle: (name: string) => void;
  /** Chart type / line style toggle (first [—] pill) */
  chartTypeActive?: boolean;
  onChartTypeClick?: () => void;
}

export function IndicatorToggleBar({ active, onToggle, chartTypeActive, onChartTypeClick }: IndicatorToggleBarProps) {
  const count = active.size;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {count > 0 && (
        <span className="text-xs text-text-muted mr-1" aria-live="polite">
          {count} selected
        </span>
      )}
      {onChartTypeClick && (
        <button
          type="button"
          onClick={onChartTypeClick}
          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
            chartTypeActive ? 'bg-accent-primary/20 text-accent-primary border-accent-primary/40' : 'border-border text-text-muted hover:bg-bg-elevated'
          }`}
          aria-label="Chart type / line style"
        >
          —
        </button>
      )}
      {INDICATOR_PILLS.map((name) => {
        const isOn = active.has(name);
        return (
  <button
            key={name}
            type="button"
            onClick={() => onToggle(name)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              isOn
                ? 'bg-accent-primary text-white border-accent-primary font-medium'
                : 'border-border text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
            }`}
            aria-pressed={isOn}
            aria-label={isOn ? `${name} selected` : `${name} not selected`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
