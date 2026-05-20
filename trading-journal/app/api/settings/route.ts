import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/db';
import type { Settings } from '@/lib/types';

export async function GET() {
  try {
    const settings = getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<Settings>;
    saveSettings(body);
    const updated = getSettings();
    return NextResponse.json(updated);
  } catch (error) {
    console.error('POST /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
