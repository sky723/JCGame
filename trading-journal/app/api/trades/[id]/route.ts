import { NextRequest, NextResponse } from 'next/server';
import { getTradeById, updateTrade, deleteTrade } from '@/lib/db';
import { sendTradeNotification } from '@/lib/notifications';
import type { TradeFormData } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const trade = getTradeById(params.id);
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }
    return NextResponse.json(trade);
  } catch (error) {
    console.error('GET /api/trades/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch trade' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = getTradeById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const body = (await request.json()) as Partial<TradeFormData>;
    const wasOpen = existing.status === 'OPEN';
    const updated = updateTrade(params.id, body);
    const isNowClosed = updated.status === 'CLOSED';

    if (wasOpen && isNowClosed) {
      sendTradeNotification(updated, 'EXIT').catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/trades/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = getTradeById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    deleteTrade(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/trades/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
