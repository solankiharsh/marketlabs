'use client';

interface PaymentStepperProps {
  step: 1 | 2 | 3;
}

const STEPS = [
  { n: 1, label: 'Waiting for payment' },
  { n: 2, label: 'Payment detected' },
  { n: 3, label: 'Confirmed' },
] as const;

export function PaymentStepper({ step }: PaymentStepperProps) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s.n} className="flex flex-1 items-center">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full ${
                step >= s.n ? 'bg-[var(--cta-primary)]' : 'bg-[var(--border)]'
              }`}
            />
            <span
              className={`mt-1 text-xs ${
                step >= s.n ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`mx-2 h-0.5 flex-1 ${
                step > s.n ? 'bg-[var(--cta-primary)]' : 'bg-[var(--border)]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
