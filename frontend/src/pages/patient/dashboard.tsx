"use client";
import React from "react";
import useCurrentUser from "../../hooks/useCurrentUser";
import PatientMyHealth from "../../components/PatientMyHealth";

export default function PatientDashboard(): JSX.Element {
  const { user, loading } = useCurrentUser();

  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <div className="p-6">Not signed in</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold">Patient Dashboard</h2>
      <div className="mt-4">
        <PatientMyHealth patientAddress={user.address || ""} />
      </div>
    </div>
  );
}
