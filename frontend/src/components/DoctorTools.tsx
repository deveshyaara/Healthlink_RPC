'use client';
import React, { useState } from 'react';
import { authUtils } from '@/lib/auth-utils';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export default function DoctorTools({ doctorAddress }: { doctorAddress: string }) {
  const [drug, setDrug] = useState('');
  const [dosage, setDosage] = useState('');
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function submitPrescription(e: React.FormEvent) {
    e.preventDefault();
    if (!drug || !dosage) {return setNotice('Fill drug and dosage');}
    const payload = { doctorAddress, drug, dosage, duration };
    try {
      setLoading(true);
      const token = authUtils.getToken();
      const endpoint = API_BASE ? `${API_BASE}/api/prescriptions` : '/api/prescriptions';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
      if (!res.ok) {throw new Error('Failed');}
      setNotice('Prescription created');
      setDrug(''); setDosage(''); setDuration('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error';
      setNotice(errorMessage);
    } finally { setLoading(false); }
  }

  async function scheduleForSelf(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData(e.currentTarget as HTMLFormElement);
    const patientAddress = String(form.get('patient') || '');
    const time = String(form.get('time') || '');
    const details = String(form.get('details') || '');
    if (!patientAddress || !time) {return setNotice('Fill patient and time');}
    const unix = Math.floor(new Date(time).getTime() / 1000);
    try {
      setLoading(true);
      const token = authUtils.getToken();
      const endpoint = API_BASE ? `${API_BASE}/api/v1/healthcare/appointments` : '/api/v1/healthcare/appointments';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify({ appointmentId: `appt-${Date.now()}`, patientId: patientAddress, doctorAddress, timestamp: unix, reason: details, notes: '' }) });
      setNotice('Appointment scheduled');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error';
      setNotice(errorMessage);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded shadow p-4">
        <h4 className="font-medium">Prescription Writer</h4>
        <form onSubmit={submitPrescription} className="space-y-2 mt-3">
          <input value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="Drug" className="w-full rounded border px-2 py-1" />
          <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="Dosage" className="w-full rounded border px-2 py-1" />
          <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="Duration" className="w-full rounded border px-2 py-1" />
          <div><button className="px-3 py-1 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Working...' : 'Create'}</button></div>
        </form>
        {notice && <div className="text-sm mt-2">{notice}</div>}
      </div>

      <div className="bg-white rounded shadow p-4">
        <h4 className="font-medium">Schedule (Doctor)</h4>
        <form onSubmit={scheduleForSelf} className="space-y-2 mt-3">
          <input name="patient" placeholder="Patient address" className="w-full rounded border px-2 py-1" />
          <input name="time" type="datetime-local" className="w-full rounded border px-2 py-1" />
          <input name="details" placeholder="Notes" className="w-full rounded border px-2 py-1" />
          <div><button className="px-3 py-1 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Scheduling...' : 'Schedule'}</button></div>
        </form>
      </div>
    </div>
  );
}
