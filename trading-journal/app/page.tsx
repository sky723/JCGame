'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TradeCard from '@/components/TradeCard';
import StatCard from '@/components/StatCard';
import type { Trade, TradeStats } from '@/lib/types';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function DashboardPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tradesRes, statsRes] = await Promise.all([
          fetch('/api/trades'),
          fetch('/api/stats'),
        ]);
        const tradesData = await tradesRes.json();
        const statsData = await statsRes.json();
        setTrades(Array.isArray(tradesData) ? tradesData : []);
        setStats(statsData);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const openTrades = trades.filter((t) => t.status === 'OPEN');
  const recentClosed = trades.filter((t) => t.status === 'CLOSED').slice(0, 10);

  const pnlColor =
    !stats || stats.totalPnl === 0
      ? 'text-white'
      : stats.totalPnl > 0
      ? 'text-green-400'
      : 'text-red-400';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-xl font-bold text-white">Sky Folio Journal</h1>
            <p className="text-xs text-slate-500">Professional Trading Journal</p>
          </div>
          <Link
            href="/settings"
            className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* Stats Row */}
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-20 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total P&L"
              value={formatCurrency(stats.totalPnl)}
              subtitle={`${stats.totalTrades} total trades`}
              valueColor={pnlColor}
            />
            <StatCard
              label="Win Rate"
              value={`${stats.winRate.toFixed(1)}%`}
              subtitle={`Avg grade: ${stats.avgGrade}`}
              valueColor={stats.winRate >= 50 ? 'text-green-400' : 'text-red-400'}
            />
            <StatCard
              label="Open Trades"
              value={stats.openTrades}
              subtitle="Active positions"
              valueColor="text-sky-400"
            />
            <StatCard
              label="Avg R/R"
              value={`${stats.avgRR.toFixed(2)}:1`}
              subtitle={`Best: ${formatCurrency(stats.bestTrade)}`}
              valueColor={stats.avgRR >= 2 ? 'text-green-400' : stats.avgRR >= 1 ? 'text-yellow-400' : 'text-red-400'}
            />
          </div>
        ) : null}

        {/* Open Positions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium">
              Open Positions ({openTrades.length})
            </h2>
            {openTrades.length > 0 && (
              <Link href="/analytics" className="text-xs text-sky-400 hover:text-sky-300">
                Analytics →
              </Link>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-28 animate-pulse" />
              ))}
            </div>
          ) : openTrades.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-slate-400 text-sm">No open positions</p>
              <p className="text-slate-600 text-xs mt-1">Tap + to log a new trade</p>
            </div>
          ) : (
            <div className="space-y-3">
              {openTrades.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </div>

        {/* Recent Closed Trades */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase tracking-wider text-slate-500 font-medium">
              Recent Trades ({recentClosed.length})
            </h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl h-28 animate-pulse" />
              ))}
            </div>
          ) : recentClosed.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-3">📈</div>
              <p className="text-slate-400 text-sm">No closed trades yet</p>
              <p className="text-slate-600 text-xs mt-1">Your trade history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentClosed.map((trade) => (
                <TradeCard key={trade.id} trade={trade} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <Link
        href="/journal/new"
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-xl shadow-green-500/30 transition-all duration-200 active:scale-95"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
