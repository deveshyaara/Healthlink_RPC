import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
    params: Promise<{ consentId: string }>;
}

export async function GET(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        const { consentId } = await context.params;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const backendUrl = `${apiUrl}/api/patient/consents/${consentId}`;

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
        console.error('Consent GET by ID API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
