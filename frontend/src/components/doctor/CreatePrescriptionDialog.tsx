/* eslint-disable no-console */
/**
 * CreatePrescriptionDialog Component
 *
 * Dialog wrapper for creating prescriptions using the standardized form
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Pill } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { CreatePrescriptionForm } from '@/components/forms/create-prescription-form';

export function CreatePrescriptionDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-government-blue hover:bg-government-blue/90">
          <Pill className="mr-2 h-4 w-4" />
          Create Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Prescription</DialogTitle>
          <DialogDescription>
            Create a new prescription on the blockchain
          </DialogDescription>
        </DialogHeader>

        <CreatePrescriptionForm
          doctorId={user?.id || ''}
          onSuccess={() => {
            setOpen(false);
            // Optionally trigger a global refresh if needed, but for dashboard actions usually local feedback is enough
          }}
          onCancel={() => setOpen(false)}
          onSubmitting={setIsSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
