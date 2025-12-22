'use client';
import React from 'react';
import useCurrentUser from '../../hooks/useCurrentUser';
import DoctorTools from '../../components/DoctorTools';

export default function DoctorDashboard(): JSX.Element {
  const { user, loading } = useCurrentUser();

  if (loading) {return <div className="p-6">Loading...</div>;}
  if (!user) {return <div className="p-6">Not signed in</div>;}

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Doctor Dashboard</h2>
      <div className="mt-4 max-w-xl">
        <DoctorTools doctorAddress={user.address || ''} />
      </div>
    </div>
  );
}
