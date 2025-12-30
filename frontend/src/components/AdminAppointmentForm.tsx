'use client';
import React, { useState } from 'react';
import { appointmentsApi } from '../lib/api-client';

export default function AdminAppointmentForm(): JSX.Element {
  const [patientEmail, setPatientEmail] = useState('');
  const [doctorAddress, setDoctorAddress] = useState('');
  const [time, setTime] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotice(null);
    if (!patientEmail || !doctorAddress || !time) {
      setNotice('Please fill patient, doctor and date/time.');
      return;
    }

    // Client-side validation: Ensure appointment is not in the past
    const appointmentDate = new Date(time);
    const now = new Date();

    if (isNaN(appointmentDate.getTime())) {
      setNotice('Invalid date format. Please select a valid date and time.');
      return;
    }

    if (appointmentDate < now) {
      setNotice('Appointment cannot be scheduled in the past. Please select a future date and time.');
      return;
    }

    const unix = Math.floor(appointmentDate.getTime() / 1000);
    const payload = {
      appointmentId: `appt-${Date.now()}`,
      patientEmail: patientEmail,
      doctorAddress,
      timestamp: unix,
      reason: details,
      notes: ''
    };

    try {
      setLoading(true);
      await appointmentsApi.create(payload);
      setNotice('Appointment scheduled');
      setPatientEmail('');
      setDoctorAddress('');
      setTime('');
      setDetails('');
    } catch (_err: unknown) {
      const errorMessage = _err instanceof Error ? _err.message : 'Error';
      setNotice(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg bg-white rounded-lg shadow p-6">
      <h4 className="text-lg font-semibold mb-4">Book Appointment (Admin)</h4>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Patient Email</label>
          <input
            value={patientEmail}
            onChange={(e) => setPatientEmail(e.target.value)}
            placeholder="patient@example.com"
            type="email"
            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Doctor Address</label>
          <input
            value={doctorAddress}
            onChange={(e) => setDoctorAddress(e.target.value)}
            placeholder="0x..."
            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Date & Time</label>
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            min={new Date().toISOString().slice(0, 16)} // Prevent past dates in picker
            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Details</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Reason or notes"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Scheduling...' : 'Schedule'}
          </button>
        </div>

        {notice && <div className="text-sm text-gray-700">{notice}</div>}
      </form>
    </div>
  );
}
