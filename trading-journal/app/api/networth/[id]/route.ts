import { NextResponse } from 'next/server';
import { updateNetworthItem, deleteNetworthItem } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const updated = updateNetworthItem(params.id, {
      name: body.name,
      category: body.category,
      asset_value: Number(body.asset_value) || 0,
      liability: Number(body.liability) || 0,
      notes: body.notes || undefined,
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    deleteNetworthItem(params.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
