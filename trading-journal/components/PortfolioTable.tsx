'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Asset } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  STOCKS: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  REAL_ESTATE_US: 'bg-green-500/20 text-green-400 border border-green-500/30',
  INDIA_LAND: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  CRYPTO: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  ALTERNATIVE: 'bg-teal-500/20 text-teal-400 border border-teal-500/30',
  CASH: 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const CATEGORY_LABELS: Record<string, string> = {
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

type SortKey = 'rank' | 'name' | 'category' | 'current_value' | 'cost_basis' | 'gain_loss' | 'gain_loss_pct' | 'date_acquired';

function fmt(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

interface Props {
  assets: AssetWithCalc[];
  filter: string;
}

export default function PortfolioTable({ assets, filter }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const filtered = filter === 'ALL' ? assets : assets.filter((a) => a.category === filter);

  const sorted = [...filtered].sort((a, b) => {
    let av: number | string | null = 0;
    let bv: number | string | null = 0;

    switch (sortKey) {
      case 'rank': av = a.rank; bv = b.rank; break;
      case 'name': av = a.name; bv = b.name; break;
      case 'category': av = a.category; bv = b.category; break;
      case 'current_value': av = a.current_value; bv = b.current_value; break;
      case 'cost_basis': av = a.cost_basis ?? -Infinity; bv = b.cost_basis ?? -Infinity; break;
      case 'gain_loss': av = a.gain_loss ?? -Infinity; bv = b.gain_loss ?? -Infinity; break;
      case 'gain_loss_pct': av = a.gain_loss_pct ?? -Infinity; bv = b.gain_loss_pct ?? -Infinity; break;
      case 'date_acquired': av = a.date_acquired ?? ''; bv = b.date_acquired ?? ''; break;
    }

    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    const an = av as number;
    const bn = bv as number;
    return sortDir === 'asc' ? an - bn : bn - an;
  });

  const totalValue = filtered.reduce((s, a) => s + a.current_value, 0);
  const totalCostBasis = filtered.reduce((s, a) => s + (a.cost_basis ?? 0), 0);
  const totalGainLoss = totalValue - totalCostBasis;

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'rank' ? 'asc' : 'desc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-slate-600 ml-1">↕</span>;
    return <span className="text-sky-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const thClass = 'px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors select-none whitespace-nowrap';

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full min-w-[700px]">
        <thead className="bg-slate-900 border-b border-slate-800">
          <tr>
            <th className={thClass} onClick={() => handleSort('rank')}>
              # <SortIcon col="rank" />
            </th>
            <th className={thClass} onClick={() => handleSort('name')}>
              Name <SortIcon col="name" />
            </th>
            <th className={thClass} onClick={() => handleSort('category')}>
              Category <SortIcon col="category" />
            </th>
            <th className={`${thClass} text-right`} onClick={() => handleSort('current_value')}>
              Value <SortIcon col="current_value" />
            </th>
            <th className={`${thClass} text-right`} onClick={() => handleSort('cost_basis')}>
              Cost Basis <SortIcon col="cost_basis" />
            </th>
            <th className={`${thClass} text-right`} onClick={() => handleSort('gain_loss')}>
              Gain/Loss <SortIcon col="gain_loss" />
            </th>
            <th className={thClass} onClick={() => handleSort('date_acquired')}>
              Acquired <SortIcon col="date_acquired" />
            </th>
            <th className={thClass}>Location</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {sorted.map((asset) => {
            const gl = asset.gain_loss;
            const glPct = asset.gain_loss_pct;
            const isGain = gl != null && gl >= 0;

            return (
              <tr key={asset.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-3 py-3 text-slate-500 text-sm font-mono">{asset.rank}</td>
                <td className="px-3 py-3">
                  <Link href={`/portfolio/${asset.id}`} className="hover:text-sky-400 transition-colors">
                    <div className="font-semibold text-white text-sm">{asset.name}</div>
                    {asset.ticker && (
                      <div className="text-xs text-slate-500">{asset.ticker}</div>
                    )}
                  </Link>
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[asset.category]}`}>
                    {CATEGORY_LABELS[asset.category]}
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm font-semibold text-white">
                  {fmt(asset.current_value)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-slate-400">
                  {asset.cost_basis != null ? fmt(asset.cost_basis) : '—'}
                </td>
                <td className="px-3 py-3 text-right">
                  {gl != null ? (
                    <div>
                      <div className={`font-mono text-sm font-semibold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                        {isGain ? '+' : ''}{fmt(gl)}
                      </div>
                      {glPct != null && (
                        <div className={`text-xs ${isGain ? 'text-green-500' : 'text-red-500'}`}>
                          {isGain ? '+' : ''}{glPct.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-slate-400">
                  {asset.date_acquired ? new Date(asset.date_acquired).toLocaleDateString('en-US', { year: '2-digit', month: 'short', day: 'numeric' }) : '—'}
                </td>
                <td className="px-3 py-3 text-sm text-slate-400 max-w-[120px] truncate">
                  {asset.location || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-slate-700 bg-slate-900/80">
          <tr>
            <td colSpan={3} className="px-3 py-3 text-sm font-semibold text-slate-300">
              Total ({filtered.length} assets)
            </td>
            <td className="px-3 py-3 text-right font-mono text-sm font-bold text-white">
              {fmt(totalValue)}
            </td>
            <td className="px-3 py-3 text-right font-mono text-sm text-slate-400">
              {fmt(totalCostBasis)}
            </td>
            <td className="px-3 py-3 text-right">
              <div className={`font-mono text-sm font-bold ${totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalGainLoss >= 0 ? '+' : ''}{fmt(totalGainLoss)}
              </div>
            </td>
            <td colSpan={2} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
