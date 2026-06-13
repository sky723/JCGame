'use client';

import { useEffect, useState, useRef } from 'react';
import type { NetworthItem, NetworthCategory } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: NetworthCategory; label: string; color: string; bg: string }[] = [
  { value: 'REAL_ESTATE', label: 'Real Estate', color: '#22c55e', bg: 'bg-green-500/20 text-green-400 border-green-500/40' },
  { value: 'STOCKS',      label: 'Stocks',      color: '#3b82f6', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { value: '401K',        label: '401k',         color: '#a855f7', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { value: 'BROKERAGE',   label: 'Brokerage',   color: '#0ea5e9', bg: 'bg-sky-500/20 text-sky-400 border-sky-500/40' },
  { value: 'IRA',         label: 'IRA',          color: '#6366f1', bg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40' },
  { value: 'CRYPTO',      label: 'Crypto',       color: '#f97316', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { value: 'CASH',        label: 'Cash',         color: '#94a3b8', bg: 'bg-slate-500/20 text-slate-400 border-slate-500/40' },
  { value: 'OTHER',       label: 'Other',        color: '#64748b', bg: 'bg-slate-600/20 text-slate-400 border-slate-600/40' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtFull(v: number): string {
  return '$' + Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ─── Bubble Chart ─────────────────────────────────────────────────────────────

interface Bubble {
  id: string;
  name: string;
  category: NetworthCategory;
  equity: number;
  rank: number;
}

function packBubbles(bubbles: (Bubble & { r: number })[]) {
  type Placed = { id: string; x: number; y: number; r: number; name: string; category: NetworthCategory; equity: number; rank: number };
  const placed: Placed[] = [];
  const W = 400, H = 340;
  const cx = W / 2, cy = H / 2;

  for (const b of bubbles) {
    if (placed.length === 0) {
      placed.push({ ...b, x: cx, y: cy });
      continue;
    }
    let done = false;
    for (let dist = 0; dist < 350 && !done; dist += 4) {
      for (let angle = 0; angle < Math.PI * 2 && !done; angle += 0.15) {
        const x = cx + dist * Math.cos(angle);
        const y = cy + dist * Math.sin(angle);
        if (x - b.r < 4 || x + b.r > W - 4 || y - b.r < 4 || y + b.r > H - 4) continue;
        const clash = placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + b.r + 3);
        if (!clash) { placed.push({ ...b, x, y }); done = true; }
      }
    }
    if (!done) placed.push({ ...b, x: Math.random() * (W - 60) + 30, y: Math.random() * (H - 60) + 30 });
  }
  return placed;
}

function BubbleChart({ items }: { items: NetworthItem[] }) {
  const positiveItems = items.filter((i) => i.asset_value - i.liability > 0);
  if (positiveItems.length === 0) return null;

  const maxEquity = Math.max(...positiveItems.map((i) => i.asset_value - i.liability));
  const MAX_R = 80, MIN_R = 22;

  const bubbles: (Bubble & { r: number })[] = positiveItems
    .map((item, idx) => {
      const equity = item.asset_value - item.liability;
      const r = Math.max(MIN_R, Math.sqrt(equity / maxEquity) * MAX_R);
      return { id: item.id, name: item.name, category: item.category, equity, rank: idx + 1, r };
    })
    .sort((a, b) => b.r - a.r);

  const placed = packBubbles(bubbles);

  return (
    <div className="overflow-x-auto">
      <svg viewBox="0 0 400 340" width="100%" style={{ minWidth: 300, maxWidth: 560 }}>
        {placed.map((b) => {
          const cat = CAT_MAP[b.category];
          const col = cat?.color ?? '#64748b';
          const fontSize = Math.max(7, Math.min(12, b.r / 4));
          const valueFontSize = Math.max(7, Math.min(11, b.r / 4.5));
          return (
            <g key={b.id}>
              <circle
                cx={b.x} cy={b.y} r={b.r}
                fill={col + '33'}
                stroke={col}
                strokeWidth={1.5}
              />
              {/* rank */}
              <text x={b.x - b.r + 5} y={b.y - b.r + 10} fontSize={7} fill={col} fontWeight="bold" opacity={0.8}>
                {b.rank}
              </text>
              {/* name */}
              <text x={b.x} y={b.y - (b.r > 35 ? 6 : 2)} textAnchor="middle" fontSize={fontSize} fill="white" fontWeight="bold">
                {b.name.length > 14 ? b.name.slice(0, 13) + '…' : b.name}
              </text>
              {/* equity */}
              {b.r > 28 && (
                <text x={b.x} y={b.y + (b.r > 35 ? 10 : 8)} textAnchor="middle" fontSize={valueFontSize} fill={col}>
                  {fmt(b.equity)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 px-1">
        {CATEGORIES.filter((c) => positiveItems.some((i) => i.category === c.value)).map((c) => (
          <div key={c.value} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
            <span className="text-[10px] text-slate-400">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Inline Row Form ──────────────────────────────────────────────────────────

interface RowFormState {
  name: string;
  category: NetworthCategory;
  asset_value: string;
  liability: string;
  notes: string;
}

const BLANK: RowFormState = { name: '', category: 'REAL_ESTATE', asset_value: '', liability: '', notes: '' };

function RowForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: RowFormState;
  onSave: (v: RowFormState) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<RowFormState>(initial ?? BLANK);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const up = (k: keyof RowFormState, v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">Name *</label>
          <input
            ref={nameRef}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm"
            placeholder="e.g. Real Estate 1, 401k - Fidelity"
            value={f.name}
            onChange={(e) => up('name', e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-slate-400 mb-1 block">Category</label>
          <select
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm"
            value={f.category}
            onChange={(e) => up('category', e.target.value as NetworthCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Asset Value ($)</label>
          <input
            type="number"
            min="0"
            step="1000"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm"
            placeholder="0"
            value={f.asset_value}
            onChange={(e) => up('asset_value', e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Liability / Loan ($)</label>
          <input
            type="number"
            min="0"
            step="1000"
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm"
            placeholder="0 (mortgage, etc.)"
            value={f.liability}
            onChange={(e) => up('liability', e.target.value)}
          />
        </div>
      </div>

      {/* Live equity preview */}
      {(f.asset_value || f.liability) && (
        <div className="flex items-center gap-2 bg-slate-900 rounded-xl px-3 py-2">
          <span className="text-xs text-slate-400">Net Equity →</span>
          <span className={`text-sm font-bold ${(Number(f.asset_value) - Number(f.liability)) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtFull(Number(f.asset_value) - Number(f.liability))}
          </span>
        </div>
      )}

      <div>
        <label className="text-xs text-slate-400 mb-1 block">Notes (optional)</label>
        <input
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm"
          placeholder="e.g. Primary home, managed by Schwab…"
          value={f.notes}
          onChange={(e) => up('notes', e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(f)}
          disabled={!f.name.trim() || saving}
          className="flex-1 h-10 bg-green-500 hover:bg-green-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-sm rounded-xl transition-all"
        >
          {saving ? 'Saving…' : 'Save Row'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 h-10 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-xl transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NetworthVaultPage() {
  const [items, setItems] = useState<NetworthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NetworthCategory | 'ALL'>('ALL');

  async function load() {
    const res = await fetch('/api/networth');
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(f: RowFormState) {
    setSaving(true);
    const res = await fetch('/api/networth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.name, category: f.category, asset_value: Number(f.asset_value) || 0, liability: Number(f.liability) || 0, notes: f.notes }),
    });
    if (res.ok) { await load(); setAdding(false); }
    setSaving(false);
  }

  async function handleEdit(id: string, f: RowFormState) {
    setSaving(true);
    const res = await fetch(`/api/networth/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: f.name, category: f.category, asset_value: Number(f.asset_value) || 0, liability: Number(f.liability) || 0, notes: f.notes }),
    });
    if (res.ok) { await load(); setEditingId(null); }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this row?')) return;
    await fetch(`/api/networth/${id}`, { method: 'DELETE' });
    await load();
  }

  // Totals
  const totalAssets = items.reduce((s, i) => s + i.asset_value, 0);
  const totalLiabilities = items.reduce((s, i) => s + i.liability, 0);
  const totalNetworth = totalAssets - totalLiabilities;

  // Category summary
  const byCat = CATEGORIES.map((c) => {
    const catItems = items.filter((i) => i.category === c.value);
    const equity = catItems.reduce((s, i) => s + i.asset_value - i.liability, 0);
    const pct = totalNetworth > 0 ? (equity / totalNetworth) * 100 : 0;
    return { ...c, equity, pct, count: catItems.length };
  }).filter((c) => c.count > 0);

  const filtered = activeFilter === 'ALL' ? items : items.filter((i) => i.category === activeFilter);
  const usedCategories = Array.from(new Set(items.map((i) => i.category)));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-sm border-b border-slate-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">Private Vault</span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-0.5">Net Worth</h1>
          </div>
          <button
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-1.5 h-9 px-3 bg-green-500 hover:bg-green-400 text-white text-sm font-bold rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Row
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 col-span-3">
            <p className="text-xs text-slate-500 mb-1">Total Net Worth</p>
            <p className={`text-3xl font-bold ${totalNetworth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtFull(totalNetworth)}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <p className="text-xs text-slate-500 mb-1">Assets</p>
            <p className="text-lg font-bold text-white">{fmt(totalAssets)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <p className="text-xs text-slate-500 mb-1">Liabilities</p>
            <p className="text-lg font-bold text-red-400">{fmt(totalLiabilities)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
            <p className="text-xs text-slate-500 mb-1">Items</p>
            <p className="text-lg font-bold text-white">{items.length}</p>
          </div>
        </div>

        {/* Allocation Bars */}
        {byCat.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">Allocation by Category</p>
            {byCat.map((c) => (
              <div key={c.value} className="flex items-center gap-3">
                <div className="w-20 text-xs text-slate-400 flex-shrink-0">{c.label}</div>
                <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
                </div>
                <div className="w-16 text-right text-xs font-medium" style={{ color: c.color }}>{fmt(c.equity)}</div>
                <div className="w-10 text-right text-xs text-slate-500">{c.pct.toFixed(0)}%</div>
              </div>
            ))}
          </div>
        )}

        {/* Add Row form */}
        {adding && (
          <RowForm
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            saving={saving}
          />
        )}

        {/* Category Filter */}
        {usedCategories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${activeFilter === 'ALL' ? 'bg-slate-700 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              All ({items.length})
            </button>
            {CATEGORIES.filter((c) => usedCategories.includes(c.value)).map((c) => (
              <button
                key={c.value}
                onClick={() => setActiveFilter(c.value)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${activeFilter === c.value ? `${c.bg} border-opacity-60` : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Grid Table */}
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-3">Holdings</p>
          {filtered.length === 0 ? (
            <div className="bg-slate-900 border border-dashed border-slate-700 rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm">No rows yet — tap Add Row to start</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((item, idx) => {
                const equity = item.asset_value - item.liability;
                const cat = CAT_MAP[item.category];
                const isEditing = editingId === item.id;

                return (
                  <div key={item.id}>
                    {isEditing ? (
                      <RowForm
                        initial={{
                          name: item.name,
                          category: item.category,
                          asset_value: String(item.asset_value),
                          liability: String(item.liability),
                          notes: item.notes ?? '',
                        }}
                        onSave={(f) => handleEdit(item.id, f)}
                        onCancel={() => setEditingId(null)}
                        saving={saving}
                      />
                    ) : (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: rank + name + category */}
                          <div className="flex items-start gap-3 min-w-0">
                            <span className="text-slate-600 text-xs font-bold mt-0.5 w-5 flex-shrink-0">
                              {activeFilter === 'ALL' ? idx + 1 : items.indexOf(item) + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-sm truncate">{item.name}</p>
                              <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cat.bg}`}>
                                {cat.label}
                              </span>
                              {item.notes && <p className="text-xs text-slate-500 mt-1 truncate">{item.notes}</p>}
                            </div>
                          </div>
                          {/* Right: values + actions */}
                          <div className="flex-shrink-0 text-right">
                            <p className={`text-base font-bold ${equity >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {fmt(equity)}
                            </p>
                            <p className="text-xs text-slate-400">Asset: {fmt(item.asset_value)}</p>
                            {item.liability > 0 && (
                              <p className="text-xs text-red-400/70">Loan: {fmt(item.liability)}</p>
                            )}
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={() => { setEditingId(item.id); setAdding(false); }}
                                className="text-xs text-slate-400 hover:text-sky-400 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Totals row */}
              {activeFilter === 'ALL' && items.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Total</span>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${totalNetworth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fmtFull(totalNetworth)}
                    </p>
                    <p className="text-xs text-slate-400">
                      Assets {fmt(totalAssets)} · Loans {fmt(totalLiabilities)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bubble Chart */}
        {items.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium mb-4">Net Worth — Bubble View</p>
            <BubbleChart items={items} />
          </div>
        )}

        {/* Bottom add button */}
        {!adding && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className="w-full h-12 border border-dashed border-slate-700 hover:border-green-500/50 hover:bg-green-500/5 text-slate-500 hover:text-green-400 text-sm font-medium rounded-2xl transition-all"
          >
            + Add another row
          </button>
        )}

      </div>
    </div>
  );
}
