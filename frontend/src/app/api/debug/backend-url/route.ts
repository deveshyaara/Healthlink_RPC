import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const value = process.env.NEXT_PUBLIC_API_URL || null;

    return NextResponse.json({ success: true, NEXT_PUBLIC_API_URL: value });
  } catch (err) {
    console.error('Debug backend-url route failed:', err);
    return NextResponse.json({ success: false, error: 'Failed to read env var' }, { status: 500 });
  }
}
