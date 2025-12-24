"use client";

import { useState } from 'react';
import { ActionModal } from '@/components/ui/action-modal';
import { UploadRecordForm } from '@/components/forms/upload-record-form';

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
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);


  return (
    <ActionModal
      title="Upload Patient Record"
      description="Upload a medical record for one of your patients"
      isOpen={isOpen}
      onClose={onClose}
      isSubmitting={isSubmitting}
      maxWidth="lg"
    >
      <div className="mb-4">
        <label className="block text-sm font-medium">Patient Email</label>
        <input
          type="email"
          name="patientEmail"
          value={patientEmail}
          onChange={(e) => setPatientEmail(e.target.value)}
          placeholder="patient@example.com"
          className="mt-1 block w-full rounded-md border-gray-300 px-2 py-2"
        />
      </div>

      <UploadRecordForm
        patientEmail={patientEmail}
        onSuccess={() => {
          onClose();
        }}
        onCancel={onClose}
        onSubmitting={setIsSubmitting}
      />
    </ActionModal>
  );
}
