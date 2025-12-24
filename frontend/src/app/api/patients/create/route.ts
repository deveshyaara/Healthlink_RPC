import { NextRequest, NextResponse } from 'next/server';

interface CreatePatientRequest {
  email: string;
  name: string;
  walletAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePatientRequest = await request.json();
    const { email, name, walletAddress } = body;

    // Validate required fields - only name, email, and walletAddress are required
    if (!email || !name || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, walletAddress' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Call the backend API to create the patient
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const backendUrl = `${apiUrl}/api/v1/healthcare/patients`;

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: Add authentication headers when auth is implemented
      },
      body: JSON.stringify({
        patientAddress: walletAddress,
        name,
        email,
        ipfsHash: `patient-${email}-${Date.now()}`, // This will be overridden by backend
      }),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json();
      return NextResponse.json(
        { error: errorData.error || 'Failed to create patient' },
        { status: backendResponse.status }
      );
    }

    const result = await backendResponse.json();

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: result.data?.id || walletAddress,
          email,
          name,
          walletAddress,
          ipfsHash: result.data?.ipfsHash || '',
          createdAt: new Date().toISOString(),
        },
      },
      message: 'Patient created successfully with minimal information. Additional details can be added when creating appointments or prescriptions.',
    });

  } catch (error) {
    console.error('Patient creation error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
