'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

export function StatCard({ title, value, change, changeLabel, className, children }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-sm',
        className
      )}
    >
      <p className="text-sm font-medium text-text-muted">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
      {change != null && (
        <p
          className={cn(
            'mt-1 text-sm font-medium',
            change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-text-muted'
          )}
        >
          {change > 0 ? '+' : ''}
          {change}%
          {changeLabel && <span className="text-text-muted font-normal"> {changeLabel}</span>}
        </p>
      )}
      {children}
    </div>
  );
}
