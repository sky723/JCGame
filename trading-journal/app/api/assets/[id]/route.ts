import { NextRequest, NextResponse } from 'next/server';
import { getAssetById, updateAsset, deleteAsset } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const asset = getAssetById(params.id);
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    const gain_loss =
      asset.cost_basis != null ? asset.current_value - asset.cost_basis : null;
    const gain_loss_pct =
      asset.cost_basis != null && asset.cost_basis > 0
        ? (gain_loss! / asset.cost_basis) * 100
        : null;
    return NextResponse.json({ asset, gain_loss, gain_loss_pct });
  } catch (error) {
    console.error('GET /api/assets/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const asset = updateAsset(params.id, body);
    const gain_loss =
      asset.cost_basis != null ? asset.current_value - asset.cost_basis : null;
    const gain_loss_pct =
      asset.cost_basis != null && asset.cost_basis > 0
        ? (gain_loss! / asset.cost_basis) * 100
        : null;
    return NextResponse.json({ asset, gain_loss, gain_loss_pct });
  } catch (error) {
    console.error('PATCH /api/assets/[id] error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update asset';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    deleteAsset(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/assets/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
