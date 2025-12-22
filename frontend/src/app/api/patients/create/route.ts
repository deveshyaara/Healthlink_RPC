import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import pinataSDK from '@pinata/sdk';

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for backend operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize Pinata client
const pinata = new pinataSDK(
  process.env.PINATA_API_KEY!,
  process.env.PINATA_SECRET_API_KEY!
);

interface CreatePatientRequest {
  email: string;
  name: string;
  age: number;
  gender: string;
  walletAddress: string;
  // Additional metadata can be added here
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
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

    // Step 1: Check if patient with this email already exists

    const { data: existingPatient, error: checkError } = await supabase
      .from('patients')
      .select('id, email')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      return NextResponse.json(
        { error: 'Database error while checking patient existence' },
        { status: 500 }
      );
    }

    if (existingPatient) {
      return NextResponse.json(
        { error: 'Patient with this email already exists' },
        { status: 409 }
      );
    }

    // Step 2: Upload patient metadata to IPFS

    const patientMetadata = {
      email,
      name,
      age: parsedAge,
      gender,
      walletAddress,
      createdAt: new Date().toISOString(),
      // Add any additional metadata here
    };

    let ipfsHash: string;

    try {
      const pinataResult = await pinata.pinJSONToIPFS(patientMetadata, {
        pinataMetadata: {
          name: `patient-${email}-${Date.now()}`,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      });

      ipfsHash = pinataResult.IpfsHash;
    } catch (_ipfsError) { // eslint-disable-line @typescript-eslint/no-unused-vars
      return NextResponse.json(
        { error: 'Failed to upload patient data to IPFS' },
        { status: 500 }
      );
    }

    // Step 3: Insert patient record into Supabase

    const { data: newPatient, error: insertError } = await supabase
      .from('patients')
      .insert({
        email,
        name,
        age: parsedAge,
        gender,
        wallet_address: walletAddress,
        ipfs_hash: ipfsHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create patient record in database' },
        { status: 500 }
      );
    }

    // Optional Step 4: Prepare blockchain transaction data (if needed)
    // You can return transaction data here for the frontend to sign and submit
    // For now, we'll just return the created patient data

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          id: newPatient.id,
          email: newPatient.email,
          name: newPatient.name,
          age: newPatient.age,
          gender: newPatient.gender,
          walletAddress: newPatient.wallet_address,
          ipfsHash: newPatient.ipfs_hash,
          createdAt: newPatient.created_at,
        },
        ipfsHash,
        // transactionData: { ... } // Add blockchain transaction data here if needed
      },
      message: 'Patient created successfully',
    });

  } catch (error) {
    // Return a clean error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
