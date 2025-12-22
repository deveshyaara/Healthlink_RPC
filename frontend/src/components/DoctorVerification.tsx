'use client';
import React, { useState, useEffect } from 'react';
import { doctorsApi, walletApi } from '../lib/api-client';

interface Doctor {
  address: string;
  name?: string;
  email?: string;
  role?: string;
  verified?: boolean;
}

export default function DoctorVerification(): JSX.Element {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [identities, setIdentities] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load verified doctors
      const verifiedDoctors = await doctorsApi.getVerified();
      setDoctors(verifiedDoctors || []);

      // Load all identities to find unverified doctors
      const allIdentities = await walletApi.getIdentities();
      const identityList = allIdentities?.identities || allIdentities || [];
      setIdentities(identityList);
    } catch (error) {
      console.error('Failed to load doctor data:', error);
      setMessage('Failed to load doctor data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerifyDoctor = async (doctorAddress: string) => {
    setVerifying(doctorAddress);
    setMessage(null);

    try {
      await doctorsApi.verify(doctorAddress);
      setMessage(`Doctor ${doctorAddress} verified successfully`);
      // Reload data to reflect changes
      await loadData();
    } catch (error: any) {
      console.error('Failed to verify doctor:', error);
      setMessage(error?.message || 'Failed to verify doctor');
    } finally {
      setVerifying(null);
    }
  };

  // Get unverified doctors (those in identities but not in verified doctors)
  const getUnverifiedDoctors = () => {
    const verifiedAddresses = new Set(doctors.map(d => d.address));
    return identities.filter(identity =>
      !verifiedAddresses.has(identity.address) &&
      identity.role === 'doctor'
    );
  };

  const unverifiedDoctors = getUnverifiedDoctors();

  return (
    <div className="bg-white rounded shadow p-4">
      <h3 className="font-medium mb-4">Doctor Verification</h3>

      {message && (
        <div className={`mb-4 p-3 rounded ${
          message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {/* Unverified Doctors Section */}
      <div className="mb-6">
        <h4 className="font-medium mb-3 text-gray-700">Pending Verification</h4>
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : unverifiedDoctors.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No doctors pending verification</div>
        ) : (
          <div className="space-y-2">
            {unverifiedDoctors.map((doctor) => (
              <div key={doctor.address} className="flex items-center justify-between p-3 border rounded">
                <div>
                  <div className="font-medium">{doctor.name || doctor.email || 'Unknown Doctor'}</div>
                  <div className="text-sm text-gray-500">{doctor.address}</div>
                </div>
                <button
                  onClick={() => handleVerifyDoctor(doctor.address)}
                  disabled={verifying === doctor.address}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {verifying === doctor.address ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Verified Doctors Section */}
      <div>
        <h4 className="font-medium mb-3 text-gray-700">Verified Doctors ({doctors.length})</h4>
        {doctors.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No verified doctors</div>
        ) : (
          <div className="space-y-2">
            {doctors.map((doctor) => (
              <div key={doctor.address} className="flex items-center justify-between p-3 border rounded bg-green-50">
                <div>
                  <div className="font-medium">{doctor.name || doctor.email || 'Verified Doctor'}</div>
                  <div className="text-sm text-gray-500">{doctor.address}</div>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">Verified</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
