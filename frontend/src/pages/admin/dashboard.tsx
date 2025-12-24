'use client';
import React, { useEffect, useState } from 'react';
import AdminAppointmentForm from '../../components/AdminAppointmentForm';
import UserManager from '../../components/UserManager';
import DoctorVerification from '../../components/DoctorVerification';
import { appointmentsApi, storageApi, medicalRecordsApi, walletApi, doctorsApi } from '../../lib/api-client';
import { useToast } from '@/hooks/use-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

interface Identity {
  address?: string;
  wallet?: string;
  id?: string;
  name?: string;
  email?: string;
}

export default function AdminDashboard(): JSX.Element {
  const { toast } = useToast();

  const [patients, setPatients] = useState<Array<{ address: string; label?: string }>>([]);
  const [doctors, setDoctors] = useState<Array<{ address: string; label?: string }>>([]);
  const [_loading, setLoading] = useState(false);
  const _endpointPatients = API_BASE ? `${API_BASE}/api/v1/wallet/identities` : '/api/v1/wallet/identities';
  const _endpointDoctors = API_BASE ? `${API_BASE}/api/v1/healthcare/doctors/verified` : '/api/v1/healthcare/doctors/verified';

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [pRes, dRes] = await Promise.all([
          walletApi.getIdentities({ page: 1, pageSize: 100 }),
          doctorsApi.getVerified()
        ]);
        if (mounted) {
          const identities = pRes?.identities || pRes || [];
          setPatients(identities.map((x: Identity) => ({
            address: x.address || x.wallet || x.id,
            label: x.name || x.address || x.email
          })));
          setDoctors((dRes || []).map((x: Identity) => ({
            address: x.address || x.wallet || x.id || 'unknown',
            label: x.name || x.address || x.email
          })));
        }
      } catch {
        // ignore - show empty lists
      } finally {
        if (mounted) {setLoading(false);}
      }
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold">Admin Dashboard</h2>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <UserManager />
        </div>
        <div className="md:col-span-2">
          <DoctorVerification />
        </div>
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-medium mb-3">Proxy — Book Appointment</h3>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget as HTMLFormElement);
              const patientAddress = String(form.get('patient') || '');
              const doctorAddress = String(form.get('doctor') || '');
              const time = String(form.get('time') || '');
              const details = String(form.get('details') || '');
              if (!patientAddress || !doctorAddress || !time) {
                toast({ title: 'Missing fields', description: 'Please select patient, doctor and time', variant: 'destructive' });
                return;
              }
              try {
                const unix = Math.floor(new Date(time).getTime() / 1000);
                await appointmentsApi.create({ appointmentId: `appt-${Date.now()}`, patientId: patientAddress, doctorAddress, timestamp: unix, reason: details, notes: '' });
                toast({ title: 'Appointment created', description: 'Proxy appointment created successfully' });
              } catch (err) {
                console.error('Failed to create appointment (admin proxy):', err);
                toast({ title: 'Failed to create appointment', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium">Patient</label>
              <select name="patient" className="mt-1 block w-full rounded-md border-gray-300 px-2 py-2">
                <option value="">Select patient</option>
                {patients.map((p) => (
                  <option key={p.address} value={p.address}>{p.label || p.address}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Doctor</label>
              <select name="doctor" className="mt-1 block w-full rounded-md border-gray-300 px-2 py-2">
                <option value="">Select doctor</option>
                {doctors.map((d) => (
                  <option key={d.address} value={d.address}>{d.label || d.address}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Date & Time</label>
              <input name="time" type="datetime-local" className="mt-1 block w-full rounded-md border-gray-300 px-2 py-2" />
            </div>

            <div>
              <label className="block text-sm font-medium">Details</label>
              <input name="details" className="mt-1 block w-full rounded-md border-gray-300 px-2 py-2" />
            </div>

            <div>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded">Book</button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h3 className="font-medium mb-3">Upload Record (Proxy)</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget as HTMLFormElement);
              const patientAddress = String(form.get('patient') || '');
              const doctorAddress = String(form.get('doctor') || '');
              const file = form.get('file') as File | null;
              if (!patientAddress || !doctorAddress || !file) {
                toast({ title: 'Missing fields', description: 'Please select patient, doctor and file', variant: 'destructive' });
                return;
              }
              try {
                // upload file to storage
                const uploadResult = await storageApi.upload(file);
                const ipfsHash = uploadResult?.hash || '';
                await medicalRecordsApi.create({ patientAddress, ipfsHash, fileName: file.name, doctorAddress });
                toast({ title: 'Record uploaded', description: 'Record uploaded successfully' });
              } catch (err) {
                console.error('Failed to upload admin proxy record:', err);
                toast({ title: 'Upload failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
              }
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-sm font-medium">Patient</label>
              <select name="patient" className="mt-1 block w-full rounded-md border-gray-300 px-2 py-2">
                <option value="">Select patient</option>
                {(Array.isArray(patients) ? patients : []).map((p) => (
                  <option key={p.address} value={p.address}>{p.label || p.address}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">Attending Doctor</label>
              <select name="doctor" className="mt-1 block w-full rounded-md border-gray-300 px-2 py-2">
                <option value="">Select doctor</option>
                {(Array.isArray(doctors) ? doctors : []).map((d) => (
                  <option key={d.address} value={d.address}>{d.label || d.address}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium">File</label>
              <input name="file" type="file" className="mt-1 block w-full" />
            </div>

            <div>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded">Upload</button>
            </div>
          </form>
        </div>
      </section>

      <section className="mt-6">
        <h3 className="text-lg font-medium">Admin Tools</h3>
        <div className="mt-3">
          <AdminAppointmentForm />
        </div>
      </section>
    </div>
  );
}
