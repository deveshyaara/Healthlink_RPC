'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { User } from 'lucide-react';

interface PatientIdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (patientId: string) => void;
  title?: string;
  description?: string;
}

export function PatientIdDialog({
  open,
  onOpenChange,
  onSubmit,
  title = 'Enter Patient ID',
  description = 'Please enter the patient ID to continue',
}: PatientIdDialogProps) {
  const [patientId, setPatientId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!patientId.trim()) {
      setError('Patient ID is required');
      return;
    }

    if (patientId.length < 3) {
      setError('Patient ID must be at least 3 characters');
      return;
    }

    onSubmit(patientId.trim());
    setPatientId('');
    setError('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setPatientId('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        handleCancel();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input
                id="patientId"
                placeholder="e.g., PATIENT_001"
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  setError('');
                }}
                className={error ? 'border-red-500' : ''}
                autoFocus
              />
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit">
              Continue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
