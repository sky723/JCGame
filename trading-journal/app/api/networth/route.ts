import { NextResponse } from 'next/server';
import { getNetworthItems, createNetworthItem } from '@/lib/db';

export async function GET() {
  try {
    const items = getNetworthItems();
    return NextResponse.json(items);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const item = createNetworthItem({
      name: body.name,
      category: body.category,
      asset_value: Number(body.asset_value) || 0,
      liability: Number(body.liability) || 0,
      notes: body.notes || undefined,
      sort_order: 0,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
