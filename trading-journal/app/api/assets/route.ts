import { NextRequest, NextResponse } from 'next/server';
import { getDb, getAssets, createAsset } from '@/lib/db';
import type { Asset } from '@/lib/types';

const SEED_DATA: Omit<Asset, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    name: 'Apple Inc',
    ticker: 'AAPL',
    category: 'STOCKS',
    sub_category: 'Tech',
    current_value: 85000,
    cost_basis: 60000,
    quantity: 450,
    unit: 'shares',
    location: 'US Market',
    currency: 'USD',
    fx_rate: 1,
    status: 'ACTIVE',
  },
  {
    name: 'NVIDIA',
    ticker: 'NVDA',
    category: 'STOCKS',
    sub_category: 'Semiconductors',
    current_value: 42000,
    cost_basis: 18000,
    quantity: 40,
    unit: 'shares',
    location: 'US Market',
    currency: 'USD',
    fx_rate: 1,
    status: 'ACTIVE',
  },
  {
    name: 'Bitcoin',
    ticker: 'BTC',
    category: 'CRYPTO',
    sub_category: 'Layer 1',
    current_value: 38000,
    cost_basis: 22000,
    quantity: 0.55,
    unit: 'BTC',
    location: 'Coinbase',
    currency: 'USD',
    fx_rate: 1,
    status: 'ACTIVE',
  },
  {
    name: 'SF Rental Condo',
    ticker: undefined,
    category: 'REAL_ESTATE_US',
    sub_category: 'Residential',
    current_value: 720000,
    cost_basis: 580000,
    quantity: 1100,
    unit: 'sqft',
    location: 'San Francisco, CA',
    currency: 'USD',
    fx_rate: 1,
    status: 'ACTIVE',
  },
  {
    name: 'Hyderabad Land',
    ticker: undefined,
    category: 'INDIA_LAND',
    sub_category: 'Residential Plot',
    current_value: 95000,
    cost_basis: 45000,
    quantity: 2400,
    unit: 'sqft',
    location: 'Hyderabad, India',
    currency: 'INR',
    fx_rate: 0.012,
    status: 'ACTIVE',
  },
  {
    name: 'Mumbai Flat',
    ticker: undefined,
    category: 'INDIA_LAND',
    sub_category: 'Apartment',
    current_value: 180000,
    cost_basis: 120000,
    quantity: 900,
    unit: 'sqft',
    location: 'Mumbai, India',
    currency: 'INR',
    fx_rate: 0.012,
    status: 'ACTIVE',
  },
  {
    name: 'Gold ETF',
    ticker: 'GLD',
    category: 'ALTERNATIVE',
    sub_category: 'Precious Metals',
    current_value: 28000,
    cost_basis: 24000,
    quantity: 200,
    unit: 'shares',
    location: 'US Market',
    currency: 'USD',
    fx_rate: 1,
    status: 'ACTIVE',
  },
  {
    name: 'Ethereum',
    ticker: 'ETH',
    category: 'CRYPTO',
    sub_category: 'Layer 1',
    current_value: 15000,
    cost_basis: 9000,
    quantity: 5.5,
    unit: 'ETH',
    location: 'Metamask',
    currency: 'USD',
    fx_rate: 1,
    status: 'ACTIVE',
  },
];

function seedIfEmpty(): void {
  const database = getDb();
  const count = (
    database.prepare('SELECT COUNT(*) as count FROM assets').get() as { count: number }
  ).count;

  if (count === 0) {
    for (const item of SEED_DATA) {
      createAsset(item);
    }
  }
}

export async function GET() {
  try {
    seedIfEmpty();
    const assets = getAssets();

    const ranked = assets.map((asset, index) => ({
      ...asset,
      rank: index + 1,
      gain_loss:
        asset.cost_basis != null ? asset.current_value - asset.cost_basis : null,
      gain_loss_pct:
        asset.cost_basis != null && asset.cost_basis > 0
          ? ((asset.current_value - asset.cost_basis) / asset.cost_basis) * 100
          : null,
    }));

    return NextResponse.json({ assets: ranked });
  } catch (error) {
    console.error('GET /api/assets error:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.category || body.current_value == null) {
      return NextResponse.json(
        { error: 'name, category, and current_value are required' },
        { status: 400 }
      );
    }

    const gain_loss =
      body.cost_basis != null ? body.current_value - body.cost_basis : null;
    const gain_loss_pct =
      body.cost_basis != null && body.cost_basis > 0
        ? (gain_loss! / body.cost_basis) * 100
        : null;

    const asset = createAsset({
      name: body.name,
      ticker: body.ticker || undefined,
      category: body.category,
      sub_category: body.sub_category || undefined,
      current_value: Number(body.current_value),
      cost_basis: body.cost_basis != null ? Number(body.cost_basis) : undefined,
      quantity: body.quantity != null ? Number(body.quantity) : undefined,
      unit: body.unit || undefined,
      location: body.location || undefined,
      currency: body.currency || 'USD',
      fx_rate: body.fx_rate != null ? Number(body.fx_rate) : 1,
      notes: body.notes || undefined,
      date_acquired: body.date_acquired || undefined,
      status: 'ACTIVE',
    });

    return NextResponse.json({ asset, gain_loss, gain_loss_pct }, { status: 201 });
  } catch (error) {
    console.error('POST /api/assets error:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}
