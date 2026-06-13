'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import type { Asset } from '@/lib/types';

const CATEGORIES = [
  { value: 'STOCKS', label: 'Stocks' },
  { value: 'REAL_ESTATE_US', label: 'Real Estate (US)' },
  { value: 'INDIA_LAND', label: 'India Land' },
  { value: 'CRYPTO', label: 'Crypto' },
  { value: 'ALTERNATIVE', label: 'Alternative' },
  { value: 'CASH', label: 'Cash' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
];

const CATEGORY_LABELS: Record<string, string> = {
  STOCKS: 'Stocks',
  REAL_ESTATE_US: 'Real Estate',
  INDIA_LAND: 'India Land',
  CRYPTO: 'Crypto',
  ALTERNATIVE: 'Alternative',
  CASH: 'Cash',
};

const inputClass = 'bg-slate-800 border border-slate-700 rounded-xl p-3 text-white w-full placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors';
const labelClass = 'block text-sm font-medium text-slate-300 mb-1';
const sectionClass = 'space-y-4 bg-slate-900 rounded-2xl border border-slate-800 p-4';

function fmt(v: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
}

type AssetWithCalc = Asset & { gain_loss: number | null; gain_loss_pct: number | null };

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [asset, setAsset] = useState<AssetWithCalc | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    ticker: '',
    category: 'STOCKS',
    sub_category: '',
    current_value: '',
    cost_basis: '',
    quantity: '',
    unit: '',
    location: '',
    currency: 'USD',
    fx_rate: '1',
    date_acquired: '',
    notes: '',
  });

  useEffect(() => {
    fetch(`/api/assets/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.asset) {
          const a: AssetWithCalc = data.asset;
          setAsset({ ...a, gain_loss: data.gain_loss, gain_loss_pct: data.gain_loss_pct });
          setForm({
            name: a.name,
            ticker: a.ticker || '',
            category: a.category,
            sub_category: a.sub_category || '',
            current_value: String(a.current_value),
            cost_basis: a.cost_basis != null ? String(a.cost_basis) : '',
            quantity: a.quantity != null ? String(a.quantity) : '',
            unit: a.unit || '',
            location: a.location || '',
            currency: a.currency || 'USD',
            fx_rate: a.fx_rate != null ? String(a.fx_rate) : '1',
            date_acquired: a.date_acquired || '',
            notes: a.notes || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.current_value || isNaN(Number(form.current_value))) { setError('Current Value is required.'); return; }

    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        ticker: form.ticker.trim() || null,
        category: form.category,
        sub_category: form.sub_category.trim() || null,
        current_value: Number(form.current_value),
        cost_basis: form.cost_basis ? Number(form.cost_basis) : null,
        quantity: form.quantity ? Number(form.quantity) : null,
        unit: form.unit.trim() || null,
        location: form.location.trim() || null,
        currency: form.currency,
        fx_rate: form.fx_rate ? Number(form.fx_rate) : 1,
        date_acquired: form.date_acquired || null,
        notes: form.notes.trim() || null,
      };

      const res = await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update');
      }
      router.push('/portfolio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

  async function handleMarkSold() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SOLD' }),
      });
      if (!res.ok) throw new Error('Failed to mark as sold');
      router.push('/portfolio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as sold');
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/portfolio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">Asset not found.</p>
        <Link href="/portfolio" className="text-sky-400 hover:underline">Back to Portfolio</Link>
      </div>
    );
  }

  const gainLoss = asset.gain_loss;
  const gainLossPct = asset.gain_loss_pct;
  const isGain = gainLoss != null && gainLoss >= 0;

  return (
    <div className="min-h-screen bg-slate-950 pb-28">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 pt-12 pb-4 flex items-center gap-3">
        <Link href="/portfolio" className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white">{asset.name}</h1>
          <p className="text-slate-400 text-sm">{CATEGORY_LABELS[asset.category]}{asset.ticker ? ` · ${asset.ticker}` : ''}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
            <div className="text-slate-400 text-xs mb-1">Value</div>
            <div className="text-white font-bold text-sm">{fmt(asset.current_value)}</div>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
            <div className="text-slate-400 text-xs mb-1">Cost</div>
            <div className="text-white font-bold text-sm">{asset.cost_basis != null ? fmt(asset.cost_basis) : '—'}</div>
          </div>
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-3">
            <div className="text-slate-400 text-xs mb-1">Gain/Loss</div>
            {gainLoss != null ? (
              <div className={`font-bold text-sm ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                {isGain ? '+' : ''}{fmt(gainLoss)}
                {gainLossPct != null && (
                  <span className="text-xs font-normal ml-1">({gainLossPct.toFixed(1)}%)</span>
                )}
              </div>
            ) : (
              <div className="text-slate-600 text-sm">—</div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Basic Info</h2>
          <div>
            <label className={labelClass}>Name *</label>
            <input name="name" value={form.name} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ticker / Symbol</label>
            <input name="ticker" value={form.ticker} onChange={handleChange} placeholder="optional" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Category</label>
            <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Sub-category</label>
            <input name="sub_category" value={form.sub_category} onChange={handleChange} placeholder="e.g. Tech, Residential" className={inputClass} />
          </div>
        </div>

        {/* Valuation */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Valuation</h2>
          <div>
            <label className={labelClass}>Current Value (USD) *</label>
            <input type="number" name="current_value" value={form.current_value} onChange={handleChange} min="0" step="any" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cost Basis (USD)</label>
            <input type="number" name="cost_basis" value={form.cost_basis} onChange={handleChange} min="0" step="any" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity</label>
              <input type="number" name="quantity" value={form.quantity} onChange={handleChange} min="0" step="any" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <input name="unit" value={form.unit} onChange={handleChange} placeholder="shares, sqft" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Currency */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Currency</h2>
          <div>
            <label className={labelClass}>Currency</label>
            <select name="currency" value={form.currency} onChange={handleChange} className={inputClass}>
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>FX Rate (to USD)</label>
            <input type="number" name="fx_rate" value={form.fx_rate} onChange={handleChange} min="0" step="any" className={inputClass} />
            <p className="text-xs text-slate-500 mt-1">For INR: current rate ~0.012 USD per ₹1</p>
          </div>
        </div>

        {/* Details */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Details</h2>
          <div>
            <label className={labelClass}>Location</label>
            <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Cupertino, CA" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date Acquired</label>
            <input type="date" name="date_acquired" value={form.date_acquired} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className={`${inputClass} resize-none`} />
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-800 disabled:text-sky-600 text-white font-semibold rounded-xl transition-all"
          >
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>

          <button
            type="button"
            onClick={handleMarkSold}
            disabled={submitting || asset.status === 'SOLD'}
            className="w-full h-12 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 disabled:opacity-40 font-semibold rounded-xl transition-all"
          >
            {asset.status === 'SOLD' ? 'Already Sold' : 'Mark as Sold'}
          </button>

          {!showDeleteConfirm ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={submitting}
              className="w-full h-12 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 disabled:opacity-40 font-semibold rounded-xl transition-all"
            >
              Delete Asset
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
              <p className="text-red-400 text-sm text-center font-medium">Are you sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 h-10 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 h-10 bg-red-500 hover:bg-red-400 text-white rounded-xl text-sm font-semibold transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
