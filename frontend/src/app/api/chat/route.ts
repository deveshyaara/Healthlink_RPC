import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Mark as runtime-only


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const backendUrl = `${apiUrl}/api/chat`;

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify(body),
    });

    const responseData = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(responseData, { status: backendResponse.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Chat POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
