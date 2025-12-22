import { NextRequest, NextResponse } from 'next/server';

interface CreatePatientRequest {
  email: string;
  name: string;
  age: number;
  gender: string;
  walletAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreatePatientRequest = await request.json();
    const { email, name, age, gender, walletAddress } = body;

    // Validate required fields
    if (!email || !name || age === undefined || !gender || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, age, gender, walletAddress' },
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

    // Validate age
    const parsedAge = parseInt(String(age), 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      return NextResponse.json(
        { error: 'Age must be a valid number between 0 and 150' },
        { status: 400 }
      );
    }

    // Call the backend API to create the patient
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
        age: parsedAge,
        gender,
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
          age: parsedAge,
          gender,
          walletAddress,
          ipfsHash: result.data?.ipfsHash || '',
          createdAt: new Date().toISOString(),
        },
      },
      message: 'Patient created successfully',
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
