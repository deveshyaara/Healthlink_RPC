"use client";

import { useEffect, useState } from 'react';
import { ActionModal } from '@/components/ui/action-modal';
import { UploadRecordForm } from '@/components/forms/upload-record-form';
import { getApiBaseUrl } from '@/lib/env-utils';
import { authUtils } from '@/lib/auth-utils';

interface PatientSummary {
  id: string;
  email?: string;
  name?: string;
}

interface UploadRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadRecordModal({ isOpen, onClose }: UploadRecordModalProps) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPatients = async () => {
      setLoading(true);
      try {
        const base = getApiBaseUrl();
        const token = authUtils.getToken();
        const res = await fetch(`${base}/api/v1/healthcare/patients`, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) {
          // treat non-2xx as empty list for UI resilience
          setPatients([]);
          return;
        }

        const json = await res.json().catch(() => null);
        // backend may return { success: true, patients: [...] } or { success: true, data: [...] } or raw array
        let list: any = [];
        if (!json) list = [];
        else if (Array.isArray(json)) list = json;
        else if (json.success === true && (Array.isArray(json.patients) || Array.isArray(json.data))) {
          list = json.patients || json.data || [];
        } else if (json.data && Array.isArray(json.data)) list = json.data;
        else list = json.patients || [];

        // normalize
        const mapped: PatientSummary[] = (list || []).map((p: any) => ({ id: p.id || p.patientId || p.walletAddress || '', email: p.email, name: p.name || p.fullName || '' }))
          .filter((p: PatientSummary) => p.id);

        setPatients(mapped);
        if (mapped.length > 0) setSelectedPatient(mapped[0].id);
      } catch (err) {
        console.error('[UploadRecordModal] failed to fetch patients', err);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [isOpen]);

  return (
    <ActionModal
      title="Upload Patient Record"
      description="Upload a medical record for one of your patients"
      isOpen={isOpen}
      onClose={onClose}
      isSubmitting={isSubmitting}
      maxWidth="lg"
    >
      {/* Patient select placed above the form */}
      <div className="mb-4">
        <label className="block text-sm font-medium">Select Patient</label>
        <select
          value={selectedPatient}
          onChange={(e) => setSelectedPatient(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 px-2 py-2"
          disabled={loading || patients.length === 0}
        >
          {patients.length === 0 && <option value="">No patients available</option>}
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.name || p.email || p.id}</option>
          ))}
        </select>
      </div>

      <UploadRecordForm
        patientId={selectedPatient}
        onSuccess={() => {
          onClose();
        }}
        onCancel={onClose}
        onSubmitting={setIsSubmitting}
      />
    </ActionModal>
  );
}
