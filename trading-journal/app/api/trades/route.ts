import { NextRequest, NextResponse } from 'next/server';
import { getTrades, createTrade } from '@/lib/db';
import { sendTradeNotification } from '@/lib/notifications';
import type { TradeFormData } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const symbol = searchParams.get('symbol') || undefined;

    const trades = getTrades({ status, symbol });
    return NextResponse.json(trades);
  } catch (error) {
    console.error('GET /api/trades error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TradeFormData;

    if (!body.symbol || !body.direction) {
      return NextResponse.json(
        { error: 'Symbol and direction are required' },
        { status: 400 }
      );
    }

    const trade = createTrade(body);

    // Send notification asynchronously (don't block response)
    sendTradeNotification(trade, 'ENTRY').catch(console.error);

    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    console.error('POST /api/trades error:', error);
    return NextResponse.json(
      { error: 'Failed to create trade' },
      { status: 500 }
    );
  }
}
