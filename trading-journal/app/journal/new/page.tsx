'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { TradeFormData } from '@/lib/types';

const SETUP_TYPES = ['Momentum', 'Breakout', 'Reversal', 'Swing', 'Event-Driven', 'Mean-Reversion'] as const;
const MARKET_CONDITIONS = ['Bullish', 'Bearish', 'Choppy', 'News-Driven', 'Volatile'] as const;
const EXIT_REASONS = ['Thesis Complete', 'Stop Hit', 'Time Stop', 'Opportunity Cost', 'Risk Management', 'Partial Profit'] as const;

type SetupType = typeof SETUP_TYPES[number];
type MarketCondition = typeof MARKET_CONDITIONS[number];
type ExitReason = typeof EXIT_REASONS[number];

interface FormState {
  symbol: string;
  direction: 'LONG' | 'SHORT';
  setup_type: SetupType | '';
  market_conditions: MarketCondition | '';
  entry_date: string;
  entry_price: string;
  shares: string;
  account_pct: string;
  stop_loss: string;
  target_price: string;
  entry_thesis: string;
  technical_setup: string;
  fundamental_catalyst: string;
  emotional_state: number;
  confidence_level: number;
  is_chasing: boolean;
  in_my_plan: boolean;
  exit_reason: ExitReason | '';
  exit_notes: string;
  tags: string;
}

function calcRR(direction: 'LONG' | 'SHORT', entry: number, stop: number, target: number): number | null {
  if (!entry || !stop || !target) return null;
  if (direction === 'LONG') {
    const reward = target - entry;
    const risk = entry - stop;
    return risk !== 0 ? reward / risk : null;
  } else {
    const reward = entry - target;
    const risk = stop - entry;
    return risk !== 0 ? reward / risk : null;
  }
}

function calcMaxLoss(shares: number, entry: number, stop: number): number | null {
  if (!shares || !entry || !stop) return null;
  return Math.abs(shares * (entry - stop));
}

export default function NewTradePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState<FormState>({
    symbol: '',
    direction: 'LONG',
    setup_type: '',
    market_conditions: '',
    entry_date: today,
    entry_price: '',
    shares: '',
    account_pct: '',
    stop_loss: '',
    target_price: '',
    entry_thesis: '',
    technical_setup: '',
    fundamental_catalyst: '',
    emotional_state: 5,
    confidence_level: 7,
    is_chasing: false,
    in_my_plan: true,
    exit_reason: '',
    exit_notes: '',
    tags: '',
  });

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const entryPrice = parseFloat(form.entry_price) || 0;
  const stopLoss = parseFloat(form.stop_loss) || 0;
  const targetPrice = parseFloat(form.target_price) || 0;
  const shares = parseFloat(form.shares) || 0;

  const rr = calcRR(form.direction, entryPrice, stopLoss, targetPrice);
  const maxLoss = calcMaxLoss(shares, entryPrice, stopLoss);

  const rrColor =
    rr == null
      ? 'text-slate-400'
      : rr >= 2
      ? 'text-green-400'
      : rr >= 1
      ? 'text-yellow-400'
      : 'text-red-400';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.symbol.trim()) {
      setError('Symbol is required');
      return;
    }
    if (!form.entry_price || parseFloat(form.entry_price) <= 0) {
      setError('Entry price is required');
      return;
    }
    if (!form.entry_thesis.trim()) {
      setError('Entry thesis is required — this is the most important field!');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const payload: TradeFormData = {
        symbol: form.symbol.toUpperCase().trim(),
        direction: form.direction,
        status: 'OPEN',
        entry_date: form.entry_date || today,
        entry_price: parseFloat(form.entry_price),
        shares: shares || undefined,
        account_pct: form.account_pct ? parseFloat(form.account_pct) : undefined,
        stop_loss: stopLoss || undefined,
        target_price: targetPrice || undefined,
        setup_type: (form.setup_type as SetupType) || undefined,
        market_conditions: (form.market_conditions as MarketCondition) || undefined,
        entry_thesis: form.entry_thesis.trim(),
        technical_setup: form.technical_setup.trim() || undefined,
        fundamental_catalyst: form.fundamental_catalyst.trim() || undefined,
        emotional_state: form.emotional_state,
        confidence_level: form.confidence_level,
        followed_plan: form.in_my_plan ? 1 : 0,
        exit_reason: (form.exit_reason as ExitReason) || undefined,
        exit_notes: form.exit_notes.trim() || undefined,
        tags: form.tags.trim() || undefined,
      };

      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create trade');
      }

      const trade = await res.json();
      router.push(`/journal/${trade.id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trade');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Log New Trade</h1>
            <p className="text-xs text-slate-500">Think before you trade</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-4 space-y-6">

        {/* Section 1: The Trade */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">The Trade</p>
          <div className="space-y-3">
            {/* Symbol */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Symbol *</label>
              <input
                type="text"
                placeholder="AAPL"
                value={form.symbol}
                onChange={(e) => update('symbol', e.target.value.toUpperCase())}
                className="text-2xl font-bold tracking-widest"
                style={{ textTransform: 'uppercase' }}
                autoCapitalize="characters"
                autoComplete="off"
                required
              />
            </div>

            {/* Direction */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Direction</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => update('direction', 'LONG')}
                  className={`flex-1 h-12 rounded-xl font-bold text-sm border transition-all ${
                    form.direction === 'LONG'
                      ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  📈 LONG
                </button>
                <button
                  type="button"
                  onClick={() => update('direction', 'SHORT')}
                  className={`flex-1 h-12 rounded-xl font-bold text-sm border transition-all ${
                    form.direction === 'SHORT'
                      ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  📉 SHORT
                </button>
              </div>
            </div>

            {/* Setup Type */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Setup Type</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {SETUP_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => update('setup_type', form.setup_type === type ? '' : type)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      form.setup_type === type
                        ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Market Conditions */}
            <div>
              <label className="text-xs text-slate-400 mb-2 block">Market Conditions</label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {MARKET_CONDITIONS.map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => update('market_conditions', form.market_conditions === cond ? '' : cond)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                      form.market_conditions === cond
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Entry Date */}
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Entry Date</label>
              <input
                type="date"
                value={form.entry_date}
                onChange={(e) => update('entry_date', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Risk Management */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Risk Management</p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Entry Price *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={form.entry_price}
                  onChange={(e) => update('entry_price', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Shares / Qty</label>
                <input
                  type="number"
                  placeholder="100"
                  step="0.01"
                  min="0"
                  value={form.shares}
                  onChange={(e) => update('shares', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Account % (optional)</label>
              <input
                type="number"
                placeholder="e.g. 5%"
                step="0.1"
                min="0"
                max="100"
                value={form.account_pct}
                onChange={(e) => update('account_pct', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Stop Loss</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={form.stop_loss}
                  onChange={(e) => update('stop_loss', e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Target Price</label>
                <input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  value={form.target_price}
                  onChange={(e) => update('target_price', e.target.value)}
                />
              </div>
            </div>

            {/* R/R Display */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-slate-500 mb-1">Risk/Reward</p>
                  <p className={`text-2xl font-bold ${rrColor}`}>
                    {rr != null ? `${rr.toFixed(2)}:1` : '—'}
                  </p>
                  {rr != null && (
                    <p className={`text-xs mt-0.5 ${rrColor}`}>
                      {rr >= 2 ? 'Excellent' : rr >= 1 ? 'Acceptable' : 'Poor — reconsider'}
                    </p>
                  )}
                </div>
                {maxLoss != null && (
                  <div className="text-center flex-1 border-l border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Max $ Risk</p>
                    <p className="text-xl font-bold text-red-400">
                      ${maxLoss.toFixed(0)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">if stop hit</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Your Thesis — THE MOST IMPORTANT */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1 font-medium">Your Thesis</p>
          <p className="text-xs text-sky-400 mb-3">The most important section — think before you trade</p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Why are you entering this trade? *
              </label>
              <div className="relative">
                <textarea
                  rows={6}
                  placeholder="What is the primary catalyst? What does the chart tell you? What's the market doing? What's your variant perception? Why will this trade work? What are you seeing that others are not?"
                  value={form.entry_thesis}
                  onChange={(e) => update('entry_thesis', e.target.value)}
                  className="resize-none text-base leading-relaxed border-2 border-sky-500/30 focus:border-sky-500 bg-slate-900 rounded-xl p-4"
                  required
                />
                <div className="absolute bottom-3 right-3 text-xs text-slate-600">
                  {form.entry_thesis.length} chars
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Technical Setup
              </label>
              <textarea
                rows={3}
                placeholder="Key levels, chart patterns, indicators, volume analysis..."
                value={form.technical_setup}
                onChange={(e) => update('technical_setup', e.target.value)}
                className="resize-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">
                Fundamental Catalyst
              </label>
              <textarea
                rows={3}
                placeholder="News, earnings, macro tailwinds/headwinds, sector rotation..."
                value={form.fundamental_catalyst}
                onChange={(e) => update('fundamental_catalyst', e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Psychology Check */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Psychology Check</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">
                  Emotional State: <span className="text-white font-medium">{form.emotional_state}/10</span>
                </label>
                <span className="text-xs text-slate-500">
                  {form.emotional_state <= 2
                    ? '😰 Fearful'
                    : form.emotional_state <= 4
                    ? '😟 Cautious'
                    : form.emotional_state <= 6
                    ? '😐 Neutral'
                    : form.emotional_state <= 8
                    ? '😊 Confident'
                    : '🤑 Greedy'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={form.emotional_state}
                onChange={(e) => update('emotional_state', parseInt(e.target.value))}
                className="w-full"
                style={{
                  background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${(form.emotional_state - 1) * (100 / 9)}%, #334155 ${(form.emotional_state - 1) * (100 / 9)}%, #334155 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>1 Fearful</span>
                <span>5 Neutral</span>
                <span>10 Greedy</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-slate-400">
                  Confidence Level: <span className="text-white font-medium">{form.confidence_level}/10</span>
                </label>
                <span className="text-xs text-slate-500">
                  {form.confidence_level <= 3
                    ? 'Low'
                    : form.confidence_level <= 6
                    ? 'Medium'
                    : 'High'}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                value={form.confidence_level}
                onChange={(e) => update('confidence_level', parseInt(e.target.value))}
                className="w-full"
                style={{
                  background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${(form.confidence_level - 1) * (100 / 9)}%, #334155 ${(form.confidence_level - 1) * (100 / 9)}%, #334155 100%)`,
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-2 block">Am I chasing?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => update('is_chasing', true)}
                    className={`flex-1 h-10 rounded-xl text-xs font-medium border transition-all ${
                      form.is_chasing
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Yes ⚠️
                  </button>
                  <button
                    type="button"
                    onClick={() => update('is_chasing', false)}
                    className={`flex-1 h-10 rounded-xl text-xs font-medium border transition-all ${
                      !form.is_chasing
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    No ✓
                  </button>
                </div>
                {form.is_chasing && (
                  <p className="text-xs text-red-400 mt-1">Warning: Chasing is a common mistake!</p>
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-2 block">In my plan?</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => update('in_my_plan', true)}
                    className={`flex-1 h-10 rounded-xl text-xs font-medium border transition-all ${
                      form.in_my_plan
                        ? 'bg-green-500/20 border-green-500 text-green-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Yes ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => update('in_my_plan', false)}
                    className={`flex-1 h-10 rounded-xl text-xs font-medium border transition-all ${
                      !form.in_my_plan
                        ? 'bg-red-500/20 border-red-500 text-red-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    No ⚠️
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Exit Plan */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">
            Exit Plan (Pre-Planned)
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Planned Exit Reason</label>
              <select
                value={form.exit_reason}
                onChange={(e) => update('exit_reason', e.target.value as ExitReason | '')}
              >
                <option value="">Select planned exit reason...</option>
                {EXIT_REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Exit Notes / Plan</label>
              <textarea
                rows={3}
                placeholder="What conditions will make you exit? What would invalidate your thesis?"
                value={form.exit_notes}
                onChange={(e) => update('exit_notes', e.target.value)}
                className="resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Tags</label>
              <input
                type="text"
                placeholder="e.g. earnings, sector-rotation, AI"
                value={form.tags}
                onChange={(e) => update('tags', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="pb-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-14 bg-green-500 hover:bg-green-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-base rounded-xl transition-all duration-200 shadow-lg shadow-green-500/20 disabled:shadow-none"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Logging Entry...
              </span>
            ) : (
              'Log Entry & Notify'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
