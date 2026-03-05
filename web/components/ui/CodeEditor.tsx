'use client';

import { cn } from '@/lib/utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string | number;
  disabled?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  placeholder = '',
  className,
  minHeight = 200,
  disabled = false,
}: CodeEditorProps) {
  const style = typeof minHeight === 'number'
    ? { minHeight: `${minHeight}px` }
    : { minHeight };

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      spellCheck={false}
      className={cn(
        'w-full rounded-lg border border-border bg-bg-secondary px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50',
        className
      )}
      style={style}
    />
  );
}
