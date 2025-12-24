import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const backendUrl = `${apiUrl}/api/storage/upload`;

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData,
    });

    const responseData = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(responseData, { status: backendResponse.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Storage upload POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
