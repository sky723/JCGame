'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BubbleChart from '@/components/BubbleChart';
import PortfolioTable from '@/components/PortfolioTable';
import type { Asset } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  STOCKS: '#3b82f6',
  REAL_ESTATE_US: '#22c55e',
  INDIA_LAND: '#f97316',
  CRYPTO: '#a855f7',
  ALTERNATIVE: '#14b8a6',
  CASH: '#94a3b8',
};

const CATEGORY_LABELS: Record<string, string> = {
  STOCKS: 'Stocks',
  REAL_ESTATE_US: 'Real Estate',
  INDIA_LAND: 'India Land',
  CRYPTO: 'Crypto',
  ALTERNATIVE: 'Alternative',
  CASH: 'Cash',
};

const FILTER_TABS = ['ALL', 'STOCKS', 'REAL_ESTATE_US', 'INDIA_LAND', 'CRYPTO', 'ALTERNATIVE', 'CASH'];
const FILTER_LABELS: Record<string, string> = {
  ALL: 'All',
  STOCKS: 'Stocks',
  REAL_ESTATE_US: 'Real Estate',
  INDIA_LAND: 'India Land',
  CRYPTO: 'Crypto',
  ALTERNATIVE: 'Alternative',
  CASH: 'Cash',
};

type AssetWithCalc = Asset & {
  rank: number;
  gain_loss: number | null;
  gain_loss_pct: number | null;
};

function fmt(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

function fmtCompact(v: number): string {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return fmt(v);
}

export default function PortfolioPage() {
  const [assets, setAssets] = useState<AssetWithCalc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'chart' | 'table'>('chart');
  const [filterCat, setFilterCat] = useState('ALL');

  useEffect(() => {
    fetch('/api/assets')
      .then((r) => r.json())
      .then((data) => {
        setAssets(data.assets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalValue = assets.reduce((s, a) => s + a.current_value, 0);
  const totalCostBasis = assets.reduce((s, a) => s + (a.cost_basis ?? 0), 0);
  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Category breakdown
  const byCategory: Record<string, { value: number; count: number }> = {};
  for (const asset of assets) {
    if (!byCategory[asset.category]) byCategory[asset.category] = { value: 0, count: 0 };
    byCategory[asset.category].value += asset.current_value;
    byCategory[asset.category].count += 1;
  }
  const categories = Object.entries(byCategory).sort((a, b) => b[1].value - a[1].value);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-28">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-white">Sky Folio</h1>
        <p className="text-slate-400 text-sm">Portfolio Overview</p>
      </div>

      {/* Stats banner */}
      <div className="px-4 py-4 space-y-3">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
          <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Portfolio Value</div>
          <div className="text-3xl font-bold text-white">{fmtCompact(totalValue)}</div>
          <div className={`text-sm font-semibold mt-1 ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalGainLoss >= 0 ? '+' : ''}{fmtCompact(totalGainLoss)}
            {' '}
            <span className="font-normal text-xs">
              ({totalGainLoss >= 0 ? '+' : ''}{totalGainLossPct.toFixed(1)}% total return)
            </span>
          </div>
        </div>

        {/* Allocation breakdown */}
        {categories.length > 0 && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
            <div className="text-slate-400 text-xs uppercase tracking-wider mb-3">Allocation</div>
            <div className="space-y-2">
              {categories.map(([cat, data]) => {
                const pct = totalValue > 0 ? (data.value / totalValue) * 100 : 0;
                const color = CATEGORY_COLORS[cat] || '#64748b';
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-300 font-medium">{CATEGORY_LABELS[cat]}</span>
                      <span className="text-xs text-slate-400">{pct.toFixed(1)}% · {fmt(data.value)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="px-4 mb-4">
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('chart')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'chart'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setTab('table')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'table'
                ? 'bg-sky-500 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Chart tab */}
      {tab === 'chart' && (
        <div className="px-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
            <BubbleChart assets={assets} />
          </div>
        </div>
      )}

      {/* Table tab */}
      {tab === 'table' && (
        <div className="px-4">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {FILTER_TABS.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  filterCat === cat
                    ? 'bg-sky-500 border-sky-500 text-white'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {FILTER_LABELS[cat]}
              </button>
            ))}
          </div>
          <PortfolioTable assets={assets} filter={filterCat} />
        </div>
      )}

      {/* FAB */}
      <Link
        href="/portfolio/new"
        className="fixed bottom-24 right-5 w-14 h-14 bg-sky-500 hover:bg-sky-400 rounded-full flex items-center justify-center shadow-lg shadow-sky-500/30 transition-all z-40"
        aria-label="Add new asset"
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </Link>
    </div>
  );
}
