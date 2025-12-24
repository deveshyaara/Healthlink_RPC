'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { requireRole } from '@/lib/auth/requireRole';

export default function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);

  useEffect(() => {
    // Check authorization
    if (!requireRole({ user } as any, 'ADMIN')) {
      return;
    }

    fetchPatients();
  }, [user]);

  const fetchPatients = async () => {
    try {
      const response = await fetch('/api/v1/admin/users/patients');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Patients</h1>
      {/* Render patients list */}
    </div>
  );
}