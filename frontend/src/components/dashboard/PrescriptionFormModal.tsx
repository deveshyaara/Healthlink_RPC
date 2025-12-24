"use client";

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { ActionModal } from '@/components/ui/action-modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const prescriptionSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  medications: z.array(z.object({ name: z.string().min(1), dosage: z.string().optional(), frequency: z.string().optional(), duration: z.string().optional() })).min(1, 'At least one medication required'),
  instructions: z.string().optional(),
});

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PrescriptionFormValues) => Promise<void> | void;
  initial?: Partial<PrescriptionFormValues>;
}

export default function PrescriptionFormModal({ isOpen, onClose, onSubmit, initial }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: initial || { patientId: '', medications: [{ name: '', dosage: '', frequency: '', duration: '' }], instructions: '' },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'medications' });

  const _onSubmit = async (values: PrescriptionFormValues) => {
    setSubmitting(true);
    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      console.error('Prescription submit failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ActionModal
      title="Create Prescription"
      description="Add a prescription for a patient"
      isOpen={isOpen}
      onClose={onClose}
      isSubmitting={submitting}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(_onSubmit)} className="space-y-4">
        <div>
          <Label>Patient ID</Label>
          <Input placeholder="Patient ID" {...register('patientId')} />
          {errors.patientId && <p className="text-sm text-destructive">{errors.patientId.message}</p>}
        </div>

        <div>
          <Label>Medications</Label>
          <div className="space-y-2">
            {fields.map((field, idx) => (
              <div key={field.id} className="grid grid-cols-4 gap-2">
                <Input placeholder="Name" {...register(`medications.${idx}.name` as const)} />
                <Input placeholder="Dosage" {...register(`medications.${idx}.dosage` as const)} />
                <Input placeholder="Frequency" {...register(`medications.${idx}.frequency` as const)} />
                <Input placeholder="Duration" {...register(`medications.${idx}.duration` as const)} />
                <div className="col-span-4 text-right">
                  <Button variant="ghost" size="sm" onClick={() => remove(idx)}>Remove</Button>
                </div>
              </div>
            ))}
            <Button type="button" onClick={() => append({ name: '', dosage: '', frequency: '', duration: '' })}>Add Medication</Button>
          </div>
        </div>

        <div>
          <Label>Instructions</Label>
          <Input placeholder="Instructions (optional)" {...register('instructions')} />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Saving...' : 'Save Prescription'}</Button>
        </div>
      </form>
    </ActionModal>
  );
}
