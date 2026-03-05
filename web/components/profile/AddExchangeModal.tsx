'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import { addExchange } from '@/lib/api/profile-membership';
import { toast } from 'sonner';

const EXCHANGE_GROUPS: { label: string; options: string[] }[] = [
  { label: 'Crypto Exchange', options: ['Binance', 'OKX', 'Bitget', 'Bybit', 'Coinbase', 'Kraken', 'KuCoin', 'Gate.io', 'Bitfinex'] },
  { label: 'US Stocks (IBKR)', options: ['Interactive Brokers (IBKR)'] },
  { label: 'Forex (MetaTrader 5)', options: ['MetaTrader 5'] },
];

const EXCHANGE_ID_MAP: Record<string, string> = {
  'Binance': 'binance',
  'OKX': 'okx',
  'Bitget': 'bitget',
  'Bybit': 'bybit',
  'Coinbase': 'coinbaseexchange',
  'Kraken': 'kraken',
  'KuCoin': 'kucoin',
  'Gate.io': 'gate',
  'Bitfinex': 'bitfinex',
  'Interactive Brokers (IBKR)': 'ibkr',
  'MetaTrader 5': 'mt5',
};

interface AddExchangeModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function AddExchangeModal({ open, onClose, onSaved }: AddExchangeModalProps) {
  const [exchange, setExchange] = useState('');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [saving, setSaving] = useState(false);

  const exchangeId = exchange ? (EXCHANGE_ID_MAP[exchange] ?? exchange.toLowerCase().replace(/\s+/g, '_')) : '';
  const isCrypto = EXCHANGE_GROUPS[0].options.includes(exchange);
  const isIbkr = exchange.includes('IBKR');
  const isMt5 = exchange.includes('MetaTrader');

  const reset = () => {
    setExchange('');
    setName('');
    setApiKey('');
    setApiSecret('');
    setPassphrase('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeId) {
      toast.error('Select an exchange');
      return;
    }
    setSaving(true);
    try {
      const config: Record<string, unknown> = {};
      if (isCrypto) {
        config.api_key = apiKey;
        config.api_secret = apiSecret;
        if (['OKX', 'Coinbase'].includes(exchange)) config.passphrase = passphrase;
      } else if (isIbkr) {
        config.host = apiKey || '127.0.0.1';
        config.port = apiSecret ? Number(apiSecret) : 7497;
        config.client_id = passphrase ? Number(passphrase) : 1;
      } else if (isMt5) {
        config.server = apiKey;
        config.login = apiSecret;
        config.password = passphrase;
      }
      await addExchange({ exchange: exchangeId, name: name || undefined, config });
      toast.success('Exchange account added');
      reset();
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (reset(), onClose())}>
      <DialogContent className="max-w-md border-[var(--border)] bg-[var(--bg-card)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)]">Add Exchange Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)]">Select Exchange</label>
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
            >
              <option value="">Select Exchange</option>
              {EXCHANGE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)]">Account Name (Optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Account"
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
            />
          </div>
          {isCrypto && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">API Key *</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API Key"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">API Secret *</label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter API Secret"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </div>
              {['OKX', 'Coinbase'].includes(exchange) && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)]">Passphrase (if required)</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter passphrase"
                    className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                  />
                </div>
              )}
            </>
          )}
          {isIbkr && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Host *</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="127.0.0.1"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Port *</label>
                <input
                  type="text"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="7497"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Client ID *</label>
                <input
                  type="text"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="1"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </div>
            </>
          )}
          {isMt5 && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Server *</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="MetaQuotes-Demo"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Login *</label>
                <input
                  type="text"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="12345678"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Password *</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Password"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-2 focus:ring-[var(--gold)]/20"
                />
              </div>
            </>
          )}
          <DialogFooter className="gap-2 pt-4">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--cta-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--cta-hover)] disabled:opacity-50"
            >
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
