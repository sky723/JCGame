'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

const inputClass = 'bg-slate-800 border border-slate-700 rounded-xl p-3 text-white w-full placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors';
const labelClass = 'block text-sm font-medium text-slate-300 mb-1';
const sectionClass = 'space-y-4 bg-slate-900 rounded-2xl border border-slate-800 p-4';

export default function NewAssetPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.current_value || isNaN(Number(form.current_value))) { setError('Current Value is required and must be a number.'); return; }

    setSubmitting(true);
    try {
      const body = {
        name: form.name.trim(),
        ticker: form.ticker.trim() || undefined,
        category: form.category,
        sub_category: form.sub_category.trim() || undefined,
        current_value: Number(form.current_value),
        cost_basis: form.cost_basis ? Number(form.cost_basis) : undefined,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        unit: form.unit.trim() || undefined,
        location: form.location.trim() || undefined,
        currency: form.currency,
        fx_rate: form.fx_rate ? Number(form.fx_rate) : 1,
        date_acquired: form.date_acquired || undefined,
        notes: form.notes.trim() || undefined,
      };

      const res = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create asset');
      }

      router.push('/portfolio');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSubmitting(false);
    }
  }

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
          <h1 className="text-xl font-bold text-white">Add Asset</h1>
          <p className="text-slate-400 text-sm">New portfolio holding</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Basic Info</h2>

          <div>
            <label className={labelClass}>
              Name <span className="text-red-400">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Apple Inc, Bitcoin, Mumbai Flat"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Ticker / Symbol</label>
            <input
              name="ticker"
              value={form.ticker}
              onChange={handleChange}
              placeholder="e.g. AAPL, BTC (optional)"
              className={inputClass}
            />
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
            <input
              name="sub_category"
              value={form.sub_category}
              onChange={handleChange}
              placeholder="e.g. Tech, Residential, DeFi"
              className={inputClass}
            />
          </div>
        </div>

        {/* Valuation */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Valuation</h2>

          <div>
            <label className={labelClass}>
              Current Value (USD) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              name="current_value"
              value={form.current_value}
              onChange={handleChange}
              placeholder="0.00"
              min="0"
              step="any"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Cost Basis (USD)</label>
            <input
              type="number"
              name="cost_basis"
              value={form.cost_basis}
              onChange={handleChange}
              placeholder="0.00 — what you paid"
              min="0"
              step="any"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="any"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Unit</label>
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                placeholder="shares, sqft, BTC"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Currency & FX */}
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
            <input
              type="number"
              name="fx_rate"
              value={form.fx_rate}
              onChange={handleChange}
              placeholder="1"
              min="0"
              step="any"
              className={inputClass}
            />
            <p className="text-xs text-slate-500 mt-1">
              For INR: current rate ~0.012 USD per ₹1. Enter the multiplier to convert to USD.
            </p>
          </div>
        </div>

        {/* Location & Dates */}
        <div className={sectionClass}>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Details</h2>

          <div>
            <label className={labelClass}>Location</label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Cupertino, CA · Mumbai, India"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Date Acquired</label>
            <input
              type="date"
              name="date_acquired"
              value={form.date_acquired}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Any additional notes..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full h-12 bg-sky-500 hover:bg-sky-400 disabled:bg-sky-800 disabled:text-sky-600 text-white font-semibold rounded-xl transition-all"
        >
          {submitting ? 'Saving...' : 'Add to Portfolio'}
        </button>
      </form>
    </div>
  );
}
