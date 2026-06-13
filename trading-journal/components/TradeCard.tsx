'use client';

import Link from 'next/link';
import type { Trade } from '@/lib/types';

interface TradeCardProps {
  trade: Trade;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getDaysHeld(entryDate: string, exitDate?: string | null): number {
  const start = new Date(entryDate).getTime();
  const end = exitDate ? new Date(exitDate).getTime() : Date.now();
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

const gradeColors: Record<string, string> = {
  'A+': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'A': 'bg-green-500/20 text-green-400 border-green-500/30',
  'B': 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  'C': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'D': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'F': 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function TradeCard({ trade }: TradeCardProps) {
  const isProfitable = (trade.pnl ?? 0) > 0;
  const daysHeld = getDaysHeld(trade.entry_date, trade.exit_date);
  const truncatedThesis = trade.entry_thesis
    ? trade.entry_thesis.substring(0, 80) + (trade.entry_thesis.length > 80 ? '...' : '')
    : null;

  return (
    <Link href={`/journal/${trade.id}`} className="block">
      <div className="trade-card bg-slate-900 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-white">{trade.symbol}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                trade.direction === 'LONG'
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}
            >
              {trade.direction}
            </span>
            {trade.setup_type && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 border border-slate-700">
                {trade.setup_type}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {trade.grade && (
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                  gradeColors[trade.grade] || 'bg-slate-700 text-slate-400'
                }`}
              >
                {trade.grade}
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                trade.status === 'OPEN'
                  ? 'bg-sky-500/20 text-sky-400'
                  : trade.status === 'CLOSED'
                  ? 'bg-slate-700 text-slate-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}
            >
              {trade.status}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500">Entry</span>
            <span className="text-sm font-medium text-white">
              {formatCurrency(trade.entry_price)} × {trade.shares}
            </span>
          </div>

          {trade.status === 'CLOSED' && trade.pnl != null ? (
            <div className="flex flex-col gap-0.5 items-end">
              <span className="text-xs text-slate-500">P&amp;L</span>
              <span
                className={`text-sm font-bold ${
                  isProfitable ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {isProfitable ? '+' : ''}
                {formatCurrency(trade.pnl)}
                {trade.pnl_pct != null && (
                  <span className="text-xs ml-1 opacity-75">
                    ({isProfitable ? '+' : ''}
                    {trade.pnl_pct.toFixed(1)}%)
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 items-end">
              {trade.stop_loss != null && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">SL:</span>
                  <span className="text-xs text-red-400">{formatCurrency(trade.stop_loss)}</span>
                </div>
              )}
              {trade.target_price != null && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">Target:</span>
                  <span className="text-xs text-green-400">{formatCurrency(trade.target_price)}</span>
                </div>
              )}
              {trade.risk_reward != null && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">R/R:</span>
                  <span
                    className={`text-xs font-medium ${
                      trade.risk_reward >= 2
                        ? 'text-green-400'
                        : trade.risk_reward >= 1
                        ? 'text-yellow-400'
                        : 'text-red-400'
                    }`}
                  >
                    {trade.risk_reward.toFixed(1)}:1
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {truncatedThesis && (
          <p className="text-xs text-slate-400 mt-3 leading-relaxed border-t border-slate-800 pt-3">
            {truncatedThesis}
          </p>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-600">
            {daysHeld === 0 ? 'Today' : `${daysHeld}d held`}
          </span>
          <span className="text-xs text-slate-600">{trade.entry_date}</span>
        </div>
      </div>
    </Link>
  );
}
