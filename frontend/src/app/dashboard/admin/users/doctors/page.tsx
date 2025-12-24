'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { requireRole } from '@/lib/auth/requireRole';

export default function DoctorsPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    // Check authorization
    if (!requireRole(user, 'ADMIN')) {
      return;
    }

    fetchDoctors();
  }, [user]);

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/v1/admin/users/doctors');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Doctors</h1>
      {/* Render doctors list */}
    </div>
  );
}