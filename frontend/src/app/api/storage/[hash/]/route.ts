import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  try {
    const resolvedParams = await params;
    const hash = resolvedParams.hash;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const backendUrl = `${apiUrl}/api/storage/${hash}`;

    const backendResponse = await fetch(backendUrl, {
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    // For file downloads, return the response as-is
    const response = new NextResponse(backendResponse.body);
    response.headers.set('Content-Type', backendResponse.headers.get('Content-Type') || 'application/octet-stream');
    response.headers.set('Content-Disposition', backendResponse.headers.get('Content-Disposition') || 'attachment');

    return response;
  } catch (error) {
    console.error('Storage download GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
