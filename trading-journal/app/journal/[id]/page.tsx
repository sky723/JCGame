'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Trade, TradeFormData } from '@/lib/types';

const EXIT_REASONS = [
  'Thesis Complete',
  'Stop Hit',
  'Time Stop',
  'Opportunity Cost',
  'Risk Management',
  'Partial Profit',
] as const;

const GRADES = ['A+', 'A', 'B', 'C', 'D', 'F'] as const;

type ExitReason = typeof EXIT_REASONS[number];
type Grade = typeof GRADES[number];

interface ExitForm {
  exit_price: string;
  exit_date: string;
  exit_reason: ExitReason | '';
  followed_plan: boolean;
  exit_notes: string;
  lessons_learned: string;
  what_worked: string;
  what_failed: string;
  grade: Grade | '';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const gradeColors: Record<string, string> = {
  'A+': 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
  A: 'bg-green-500/20 border-green-500 text-green-400',
  B: 'bg-sky-500/20 border-sky-500 text-sky-400',
  C: 'bg-yellow-500/20 border-yellow-500 text-yellow-400',
  D: 'bg-orange-500/20 border-orange-500 text-orange-400',
  F: 'bg-red-500/20 border-red-500 text-red-400',
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  );
}

export default function TradeDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNew = searchParams.get('new') === '1';

  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [submittingExit, setSubmittingExit] = useState(false);
  const [exitError, setExitError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [exitForm, setExitForm] = useState<ExitForm>({
    exit_price: '',
    exit_date: today,
    exit_reason: '',
    followed_plan: true,
    exit_notes: '',
    lessons_learned: '',
    what_worked: '',
    what_failed: '',
    grade: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/trades/${params.id}`);
        if (!res.ok) {
          router.push('/');
          return;
        }
        const data = await res.json();
        setTrade(data);
      } catch {
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id, router]);

  function updateExit<K extends keyof ExitForm>(key: K, value: ExitForm[K]) {
    setExitForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleExit(e: React.FormEvent) {
    e.preventDefault();
    if (!trade) return;

    if (!exitForm.exit_price || parseFloat(exitForm.exit_price) <= 0) {
      setExitError('Exit price is required');
      return;
    }
    if (!exitForm.exit_reason) {
      setExitError('Exit reason is required');
      return;
    }

    setExitError('');
    setSubmittingExit(true);

    try {
      const payload: Partial<TradeFormData> = {
        status: 'CLOSED',
        exit_price: parseFloat(exitForm.exit_price),
        exit_date: exitForm.exit_date || today,
        exit_reason: exitForm.exit_reason as ExitReason,
        followed_plan: exitForm.followed_plan ? 1 : 0,
        exit_notes: exitForm.exit_notes.trim() || undefined,
        lessons_learned: exitForm.lessons_learned.trim() || undefined,
        what_worked: exitForm.what_worked.trim() || undefined,
        what_failed: exitForm.what_failed.trim() || undefined,
        grade: (exitForm.grade as Grade) || undefined,
      };

      const res = await fetch(`/api/trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to close trade');
      }

      const updated = await res.json();
      setTrade(updated);
    } catch (err) {
      setExitError(err instanceof Error ? err.message : 'Failed to close trade');
    } finally {
      setSubmittingExit(false);
    }
  }

  async function handleDelete() {
    if (!trade) return;
    setDeleting(true);
    try {
      await fetch(`/api/trades/${trade.id}`, { method: 'DELETE' });
      router.push('/');
    } catch {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!trade) return null;

  const isProfitable = (trade.pnl ?? 0) > 0;
  const isClosed = trade.status === 'CLOSED';
  const pnlSign = isProfitable ? '+' : '';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">${trade.symbol}</h1>
              <p className="text-xs text-slate-500">{trade.entry_date}</p>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-500/20"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* New trade notification */}
        {isNew && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-green-400 text-sm">
            Trade logged! Notifications sent if configured.
          </div>
        )}

        {/* P&L Banner */}
        {isClosed && trade.pnl != null && (
          <div
            className={`rounded-2xl p-4 border ${
              isProfitable
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 mb-1">Final P&amp;L</p>
                <p className={`text-3xl font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                  {pnlSign}{formatCurrency(trade.pnl)}
                </p>
              </div>
              <div className="text-right">
                {trade.pnl_pct != null && (
                  <p className={`text-lg font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
                    {pnlSign}{trade.pnl_pct.toFixed(2)}%
                  </p>
                )}
                {trade.grade && (
                  <span className={`mt-1 inline-block px-3 py-1 rounded-lg text-sm font-bold border ${gradeColors[trade.grade] || ''}`}>
                    Grade: {trade.grade}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Trade Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-bold text-xl">{trade.symbol}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
              trade.direction === 'LONG'
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }`}>
              {trade.direction}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              trade.status === 'OPEN' ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-700 text-slate-400'
            }`}>
              {trade.status}
            </span>
            {trade.setup_type && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">
                {trade.setup_type}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Entry Price" value={formatCurrency(trade.entry_price)} />
            <InfoRow label="Shares" value={trade.shares} />
            <InfoRow label="Stop Loss" value={trade.stop_loss ? formatCurrency(trade.stop_loss) : null} />
            <InfoRow label="Target" value={trade.target_price ? formatCurrency(trade.target_price) : null} />
            <InfoRow label="Risk/Reward" value={trade.risk_reward != null ? `${trade.risk_reward.toFixed(2)}:1` : null} />
            <InfoRow label="Max $ Risk" value={trade.max_loss_dollars != null ? formatCurrency(trade.max_loss_dollars) : null} />
            {trade.account_pct != null && <InfoRow label="Account %" value={`${trade.account_pct}%`} />}
            {trade.market_conditions && <InfoRow label="Market" value={trade.market_conditions} />}
            {trade.exit_price != null && <InfoRow label="Exit Price" value={formatCurrency(trade.exit_price)} />}
            {trade.exit_date && <InfoRow label="Exit Date" value={trade.exit_date} />}
          </div>
        </div>

        {/* Psychology */}
        {(trade.emotional_state != null || trade.confidence_level != null) && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Psychology</p>
            <div className="grid grid-cols-2 gap-4">
              {trade.emotional_state != null && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Emotional State</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full"
                        style={{ width: `${(trade.emotional_state / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white">{trade.emotional_state}/10</span>
                  </div>
                </div>
              )}
              {trade.confidence_level != null && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Confidence</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full"
                        style={{ width: `${(trade.confidence_level / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-white">{trade.confidence_level}/10</span>
                  </div>
                </div>
              )}
            </div>
            {trade.followed_plan != null && (
              <div className="mt-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  trade.followed_plan ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {trade.followed_plan ? 'Followed the plan' : 'Did not follow plan'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Entry Thesis */}
        {trade.entry_thesis && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Entry Thesis</p>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{trade.entry_thesis}</p>
          </div>
        )}

        {/* Technical + Fundamental */}
        {(trade.technical_setup || trade.fundamental_catalyst) && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            {trade.technical_setup && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-medium">Technical Setup</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{trade.technical_setup}</p>
              </div>
            )}
            {trade.fundamental_catalyst && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 font-medium">Fundamental Catalyst</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{trade.fundamental_catalyst}</p>
              </div>
            )}
          </div>
        )}

        {/* Post-Trade Analysis (if closed) */}
        {isClosed && (trade.lessons_learned || trade.what_worked || trade.what_failed) && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Post-Trade Analysis</p>
            {trade.exit_reason && <InfoRow label="Exit Reason" value={trade.exit_reason} />}
            {trade.exit_notes && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Exit Notes</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{trade.exit_notes}</p>
              </div>
            )}
            {trade.what_worked && (
              <div>
                <p className="text-xs text-slate-500 mb-1">What Worked</p>
                <p className="text-sm text-green-300 whitespace-pre-wrap">{trade.what_worked}</p>
              </div>
            )}
            {trade.what_failed && (
              <div>
                <p className="text-xs text-slate-500 mb-1">What Failed</p>
                <p className="text-sm text-red-300 whitespace-pre-wrap">{trade.what_failed}</p>
              </div>
            )}
            {trade.lessons_learned && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Lessons Learned</p>
                <p className="text-sm text-sky-300 whitespace-pre-wrap">{trade.lessons_learned}</p>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {trade.tags && (
          <div className="flex flex-wrap gap-2">
            {trade.tags.split(',').map((tag) => tag.trim()).filter(Boolean).map((tag) => (
              <span key={tag} className="px-2 py-1 bg-slate-800 text-slate-400 rounded-full text-xs border border-slate-700">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Exit Form */}
        {!isClosed && (
          <form onSubmit={handleExit} className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-4 font-medium">Close This Trade</p>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Exit Price *</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      value={exitForm.exit_price}
                      onChange={(e) => updateExit('exit_price', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Exit Date</label>
                    <input
                      type="date"
                      value={exitForm.exit_date}
                      onChange={(e) => updateExit('exit_date', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Exit Reason *</label>
                  <select
                    value={exitForm.exit_reason}
                    onChange={(e) => updateExit('exit_reason', e.target.value as ExitReason | '')}
                    required
                  >
                    <option value="">Select exit reason...</option>
                    {EXIT_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Did you follow your plan?</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateExit('followed_plan', true)}
                      className={`flex-1 h-10 rounded-xl text-xs font-medium border transition-all ${
                        exitForm.followed_plan
                          ? 'bg-green-500/20 border-green-500 text-green-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      Yes ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => updateExit('followed_plan', false)}
                      className={`flex-1 h-10 rounded-xl text-xs font-medium border transition-all ${
                        !exitForm.followed_plan
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      No ✗
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Exit Notes</label>
                  <textarea
                    rows={2}
                    placeholder="What happened? Why did you exit here?"
                    value={exitForm.exit_notes}
                    onChange={(e) => updateExit('exit_notes', e.target.value)}
                    className="resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Lessons Learned</label>
                  <textarea
                    rows={3}
                    placeholder="What will you do differently next time? What did this trade teach you?"
                    value={exitForm.lessons_learned}
                    onChange={(e) => updateExit('lessons_learned', e.target.value)}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">What Worked</label>
                    <textarea
                      rows={2}
                      placeholder="Good decisions..."
                      value={exitForm.what_worked}
                      onChange={(e) => updateExit('what_worked', e.target.value)}
                      className="resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">What Failed</label>
                    <textarea
                      rows={2}
                      placeholder="Mistakes made..."
                      value={exitForm.what_failed}
                      onChange={(e) => updateExit('what_failed', e.target.value)}
                      className="resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Grade This Trade</label>
                  <div className="flex gap-2 flex-wrap">
                    {GRADES.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => updateExit('grade', exitForm.grade === g ? '' : g)}
                        className={`flex-1 min-w-[40px] h-10 rounded-xl text-xs font-bold border transition-all ${
                          exitForm.grade === g
                            ? gradeColors[g]
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {exitError && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                    {exitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingExit}
                  className="w-full h-14 bg-sky-500 hover:bg-sky-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-base rounded-xl transition-all"
                >
                  {submittingExit ? 'Closing Trade...' : 'Log Exit & Notify'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-2">Delete Trade?</h3>
            <p className="text-sm text-slate-400 mb-6">
              This will permanently delete the trade for {trade.symbol}. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 h-12 bg-slate-800 rounded-xl text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-12 bg-red-500 rounded-xl text-white font-bold disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
