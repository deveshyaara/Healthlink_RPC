import { NextRequest, NextResponse } from 'next/server';

interface RouteContext {
    params: Promise<{ consentId: string }>;
}

export async function PATCH(
    request: NextRequest,
    context: RouteContext
) {
    try {
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        const { consentId } = await context.params;

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const backendUrl = `${apiUrl}/api/patient/consents/${consentId}/revoke`;

        const backendResponse = await fetch(backendUrl, {
            method: 'PATCH',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        const responseData = await backendResponse.json();

        if (!backendResponse.ok) {
            return NextResponse.json(responseData, { status: backendResponse.status });
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Consent revoke API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
