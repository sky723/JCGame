'use client';

import { useEffect, useState } from 'react';
import type { Trade } from '@/lib/types';

function formatCurrency(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return amount < 0 ? `-${formatted}` : formatted;
}

interface SetupStats {
  setup: string;
  count: number;
  wins: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
}

interface GradeCount {
  grade: string;
  count: number;
}

interface MonthlyPnl {
  month: string;
  pnl: number;
  trades: number;
}

export default function AnalyticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/trades');
        const data = await res.json();
        setTrades(Array.isArray(data) ? data : []);
      } catch {
        console.error('Failed to load trades');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const closedTrades = trades.filter((t) => t.status === 'CLOSED');

  // By Setup Type
  const setupMap: Record<string, Trade[]> = {};
  for (const t of closedTrades) {
    const key = t.setup_type || 'Unspecified';
    if (!setupMap[key]) setupMap[key] = [];
    setupMap[key].push(t);
  }
  const setupStats: SetupStats[] = Object.entries(setupMap).map(([setup, ts]) => {
    const wins = ts.filter((t) => (t.pnl ?? 0) > 0).length;
    const totalPnl = ts.reduce((s, t) => s + (t.pnl ?? 0), 0);
    return {
      setup,
      count: ts.length,
      wins,
      winRate: ts.length > 0 ? (wins / ts.length) * 100 : 0,
      totalPnl,
      avgPnl: ts.length > 0 ? totalPnl / ts.length : 0,
    };
  }).sort((a, b) => b.count - a.count);

  // By Direction
  const longTrades = closedTrades.filter((t) => t.direction === 'LONG');
  const shortTrades = closedTrades.filter((t) => t.direction === 'SHORT');
  const longWins = longTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const shortWins = shortTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const longPnl = longTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const shortPnl = shortTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // Grade Distribution
  const gradeMap: Record<string, number> = {};
  for (const t of closedTrades) {
    if (t.grade) {
      gradeMap[t.grade] = (gradeMap[t.grade] || 0) + 1;
    }
  }
  const gradeOrder = ['A+', 'A', 'B', 'C', 'D', 'F'];
  const gradeCounts: GradeCount[] = gradeOrder
    .filter((g) => gradeMap[g])
    .map((g) => ({ grade: g, count: gradeMap[g] }));

  // Psychology Correlation
  const winEmotions = closedTrades.filter((t) => (t.pnl ?? 0) > 0 && t.emotional_state != null);
  const lossEmotions = closedTrades.filter((t) => (t.pnl ?? 0) <= 0 && t.emotional_state != null);
  const avgWinEmotion = winEmotions.length > 0
    ? winEmotions.reduce((s, t) => s + (t.emotional_state ?? 0), 0) / winEmotions.length
    : null;
  const avgLossEmotion = lossEmotions.length > 0
    ? lossEmotions.reduce((s, t) => s + (t.emotional_state ?? 0), 0) / lossEmotions.length
    : null;

  const winConfidence = closedTrades.filter((t) => (t.pnl ?? 0) > 0 && t.confidence_level != null);
  const lossConfidence = closedTrades.filter((t) => (t.pnl ?? 0) <= 0 && t.confidence_level != null);
  const avgWinConf = winConfidence.length > 0
    ? winConfidence.reduce((s, t) => s + (t.confidence_level ?? 0), 0) / winConfidence.length
    : null;
  const avgLossConf = lossConfidence.length > 0
    ? lossConfidence.reduce((s, t) => s + (t.confidence_level ?? 0), 0) / lossConfidence.length
    : null;

  // Best/Worst Trades
  const sortedByPnl = [...closedTrades].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0));
  const best5 = sortedByPnl.slice(0, 5);
  const worst5 = sortedByPnl.slice(-5).reverse();

  // Monthly P&L
  const monthlyMap: Record<string, { pnl: number; trades: number }> = {};
  for (const t of closedTrades) {
    if (!t.exit_date && !t.entry_date) continue;
    const dateStr = t.exit_date || t.entry_date;
    const month = dateStr.substring(0, 7);
    if (!monthlyMap[month]) monthlyMap[month] = { pnl: 0, trades: 0 };
    monthlyMap[month].pnl += t.pnl ?? 0;
    monthlyMap[month].trades += 1;
  }
  const monthly: MonthlyPnl[] = Object.entries(monthlyMap)
    .map(([month, { pnl, trades }]) => ({ month, pnl, trades }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);

  // Lessons Feed
  const lessonsTradesFiltered = closedTrades.filter((t) => t.lessons_learned).slice(0, 10);

  const gradeColors: Record<string, string> = {
    'A+': 'text-emerald-400',
    A: 'text-green-400',
    B: 'text-sky-400',
    C: 'text-yellow-400',
    D: 'text-orange-400',
    F: 'text-red-400',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading analytics...</p>
      </div>
    );
  }

  if (closedTrades.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
          <h1 className="text-xl font-bold text-white max-w-lg mx-auto">Analytics</h1>
        </div>
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-slate-400">No closed trades yet.</p>
          <p className="text-slate-600 text-sm mt-2">Close some trades to see analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold text-white">Analytics</h1>
          <p className="text-xs text-slate-500">{closedTrades.length} closed trades analyzed</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">

        {/* Performance by Direction */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Long vs Short</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">LONG</span>
                <span className="text-xs text-slate-500">{longTrades.length} trades</span>
              </div>
              <p className={`text-xl font-bold ${longPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(longPnl)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {longTrades.length > 0 ? ((longWins / longTrades.length) * 100).toFixed(0) : 0}% win rate
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">SHORT</span>
                <span className="text-xs text-slate-500">{shortTrades.length} trades</span>
              </div>
              <p className={`text-xl font-bold ${shortPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(shortPnl)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {shortTrades.length > 0 ? ((shortWins / shortTrades.length) * 100).toFixed(0) : 0}% win rate
              </p>
            </div>
          </div>
        </div>

        {/* Performance by Setup Type */}
        {setupStats.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Performance by Setup</p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-4 gap-2 px-4 py-2 border-b border-slate-800">
                <span className="text-xs text-slate-500">Setup</span>
                <span className="text-xs text-slate-500 text-center">Trades</span>
                <span className="text-xs text-slate-500 text-center">Win %</span>
                <span className="text-xs text-slate-500 text-right">Avg P&L</span>
              </div>
              {setupStats.map((s, i) => (
                <div key={s.setup} className={`grid grid-cols-4 gap-2 px-4 py-3 ${i < setupStats.length - 1 ? 'border-b border-slate-800/50' : ''}`}>
                  <span className="text-xs text-white font-medium truncate">{s.setup}</span>
                  <span className="text-xs text-slate-400 text-center">{s.count}</span>
                  <span className={`text-xs font-bold text-center ${s.winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.winRate.toFixed(0)}%
                  </span>
                  <span className={`text-xs font-bold text-right ${s.avgPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(s.avgPnl)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grade Distribution */}
        {gradeCounts.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Grade Distribution</p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-end gap-3 h-24">
                {gradeCounts.map((g) => {
                  const maxCount = Math.max(...gradeCounts.map((x) => x.count));
                  const height = maxCount > 0 ? (g.count / maxCount) * 100 : 0;
                  return (
                    <div key={g.grade} className="flex flex-col items-center gap-1 flex-1">
                      <span className={`text-xs font-bold ${gradeColors[g.grade] || 'text-white'}`}>
                        {g.count}
                      </span>
                      <div
                        className={`w-full rounded-t-lg ${
                          g.grade === 'A+' || g.grade === 'A'
                            ? 'bg-green-500/60'
                            : g.grade === 'B'
                            ? 'bg-sky-500/60'
                            : g.grade === 'C'
                            ? 'bg-yellow-500/60'
                            : 'bg-red-500/60'
                        }`}
                        style={{ height: `${Math.max(height, 10)}%` }}
                      />
                      <span className={`text-xs font-bold ${gradeColors[g.grade] || 'text-white'}`}>
                        {g.grade}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Psychology Correlation */}
        {(avgWinEmotion != null || avgWinConf != null) && (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Psychology Correlation</p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              {avgWinEmotion != null && avgLossEmotion != null && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Avg Emotional State</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-green-400 w-10">Wins</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(avgWinEmotion / 10) * 100}%` }} />
                      </div>
                      <span className="text-xs text-white font-bold w-8 text-right">{avgWinEmotion.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-red-400 w-10">Losses</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(avgLossEmotion / 10) * 100}%` }} />
                      </div>
                      <span className="text-xs text-white font-bold w-8 text-right">{avgLossEmotion.toFixed(1)}</span>
                    </div>
                  </div>
                  {avgWinEmotion !== avgLossEmotion && (
                    <p className="text-xs text-slate-500 mt-2">
                      {avgWinEmotion < avgLossEmotion
                        ? 'You trade better when calm. Avoid overconfidence.'
                        : 'Higher emotion correlates with better trades in your history.'}
                    </p>
                  )}
                </div>
              )}

              {avgWinConf != null && avgLossConf != null && (
                <div>
                  <p className="text-xs text-slate-400 mb-2">Avg Confidence Level</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-green-400 w-10">Wins</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${(avgWinConf / 10) * 100}%` }} />
                      </div>
                      <span className="text-xs text-white font-bold w-8 text-right">{avgWinConf.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-red-400 w-10">Losses</span>
                      <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${(avgLossConf / 10) * 100}%` }} />
                      </div>
                      <span className="text-xs text-white font-bold w-8 text-right">{avgLossConf.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Best & Worst Trades */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Best Trades</p>
          <div className="space-y-2">
            {best5.map((t) => (
              <a key={t.id} href={`/journal/${t.id}`} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{t.symbol}</span>
                  <span className="text-xs text-slate-500">{t.setup_type || 'N/A'}</span>
                </div>
                <span className="text-green-400 font-bold text-sm">
                  +{formatCurrency(t.pnl ?? 0)}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Worst Trades</p>
          <div className="space-y-2">
            {worst5.map((t) => (
              <a key={t.id} href={`/journal/${t.id}`} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-3 hover:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{t.symbol}</span>
                  <span className="text-xs text-slate-500">{t.setup_type || 'N/A'}</span>
                </div>
                <span className="text-red-400 font-bold text-sm">
                  {formatCurrency(t.pnl ?? 0)}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Monthly P&L */}
        {monthly.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Monthly P&L</p>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {monthly.map((m, i) => (
                <div key={m.month} className={`flex items-center justify-between px-4 py-3 ${i < monthly.length - 1 ? 'border-b border-slate-800/50' : ''}`}>
                  <div>
                    <span className="text-sm text-white font-medium">
                      {new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                    <p className="text-xs text-slate-500">{m.trades} trades</p>
                  </div>
                  <span className={`text-sm font-bold ${m.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {m.pnl >= 0 ? '+' : ''}{formatCurrency(m.pnl)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lessons Learned Feed */}
        {lessonsTradesFiltered.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 font-medium">Lessons Learned</p>
            <div className="space-y-3">
              {lessonsTradesFiltered.map((t) => (
                <a key={t.id} href={`/journal/${t.id}`} className="block bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-white text-sm">{t.symbol}</span>
                    <span className="text-xs text-slate-500">{t.exit_date || t.entry_date}</span>
                    {t.grade && (
                      <span className={`text-xs font-bold ${gradeColors[t.grade] || ''}`}>{t.grade}</span>
                    )}
                  </div>
                  <p className="text-xs text-sky-300 leading-relaxed">{t.lessons_learned}</p>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
