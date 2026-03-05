'use client';

/**
 * Indicator toggle row for ChartSection — SMA EMA RSI MACD BB ATR CCI W%R MFI ADX OBV ADOSC AD KDJ.
 * Active: gold border (dark) or mint border (light). Inactive: muted.
 */

const INDICATORS = [
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

export interface IndicatorTogglesProps {
  active: Set<string>;
  onToggle: (name: string) => void;
  dark?: boolean;
}

export function IndicatorToggles({ active, onToggle, dark = true }: IndicatorTogglesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {INDICATORS.map((name) => {
        const isOn = active.has(name);
        return (
          <button
            key={name}
            type="button"
            onClick={() => onToggle(name)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isOn
                ? dark
                  ? 'text-[#D4A843] border-[#D4A843] bg-[#D4A843]/10'
                  : 'text-[#2DD4A8] border-[#2DD4A8] bg-[#2DD4A8]/10'
                : 'text-[#6B7280] border-[#2A3040] bg-transparent hover:bg-[#181C25] hover:text-[#9CA3AF]'
            }`}
            aria-pressed={isOn}
            aria-label={isOn ? `${name} on` : `${name} off`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
