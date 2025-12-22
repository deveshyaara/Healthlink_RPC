'use client';
import React, { useEffect, useState } from 'react';
import { MedicalRecord, Appointment } from '@/lib/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function PatientMyHealth({ patientAddress }: { patientAddress: string }) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // For current user, use alias endpoints that return current user's data
        const recEndpoint = API_BASE ? `${API_BASE}/api/medical-records` : '/api/medical-records';
        const aptEndpoint = API_BASE ? `${API_BASE}/api/appointments` : '/api/appointments';
        const [rRes, aRes] = await Promise.all([fetch(recEndpoint, { credentials: 'include' }), fetch(aptEndpoint, { credentials: 'include' })]);
        const rJson = rRes.ok ? await rRes.json() : [];
        const aJson = aRes.ok ? await aRes.json() : [];
        if (mounted) {
          setRecords(rJson || []);
          setAppointments(aJson || []);
        }
      } catch {
        if (mounted) { setRecords([]); setAppointments([]); }
      } finally {
        if (mounted) {setLoading(false);}
      }
    })();
    return () => { mounted = false; };
  }, [patientAddress]);

  if (!patientAddress) {return <div className="text-sm text-gray-500">No patient selected</div>;}

  return (
    <div className="space-y-4">
      <div className="bg-white rounded shadow p-4">
        <h4 className="font-medium">My Records</h4>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {records.length === 0 && <li className="text-sm text-gray-500">No records found</li>}
            {records.map((r, i) => (
              <li key={i} className="p-2 border rounded">
                <div className="text-sm font-medium">{r.fileName || r.name || 'Record'}</div>
                <div className="text-xs text-gray-600">Doctor: {r.doctorName || r.doctor || r.attending}</div>
                <div className="text-xs text-gray-600">IPFS: {r.ipfsHash || r.hash}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bg-white rounded shadow p-4">
        <h4 className="font-medium">Appointments</h4>
        {loading ? (
          <div className="text-sm text-gray-500">Loading…</div>
        ) : (
          <ul className="mt-2 space-y-2">
            {appointments.length === 0 && <li className="text-sm text-gray-500">No appointments</li>}
            {appointments.map((a: Appointment) => (
              <li key={a.id || a.appointmentId || Math.random()} className="p-2 border rounded">
                <div className="text-sm font-medium">With: {a.doctorName || a.doctor}</div>
                <div className="text-xs text-gray-600">When: {a.time ? new Date(a.time * 1000).toLocaleString() : a.time}</div>
                <div className="text-xs text-gray-600">Details: {a.details}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
