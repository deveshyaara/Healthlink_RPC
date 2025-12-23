import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = `${apiUrl}/api/v1/healthcare/doctors/verified`;

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    const responseData = await backendResponse.json();

    if (!backendResponse.ok) {
      return NextResponse.json(responseData, { status: backendResponse.status });
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Healthcare doctors verified GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
