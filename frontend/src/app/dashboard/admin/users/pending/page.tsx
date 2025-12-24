'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { requireRole } from '@/lib/auth/requireRole';

export default function PendingPage() {
  const { user } = useAuth();
  const [pending, setPending] = useState([]);

  useEffect(() => {
    // Check authorization
    if (!requireRole(user, 'ADMIN')) {
      return;
    }

    fetchPending();
  }, [user]);

  const fetchPending = async () => {
    try {
      const response = await fetch('/api/v1/admin/users/pending');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPending(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pending Approvals</h1>
      {/* Render pending users list */}
    </div>
  );
}