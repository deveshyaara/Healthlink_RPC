'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Loader2, Pill } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authUtils } from '@/lib/auth-utils';

// Zod validation schema for a single medication (backend expects single medication, not array)
const medicationSchema = z.object({
  name: z.string().min(2, 'Medication name required').max(100, 'Name too long'),
  dosage: z.string().min(1, 'Dosage required (e.g., 500mg)'),
  frequency: z.string().min(1, 'Frequency required (e.g., twice daily)'),
  duration: z.string().min(1, 'Duration required (e.g., 7 days)'),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(1000, 'Quantity too large'),
  instructions: z.string().min(3, 'Instructions required').max(500, 'Instructions too long'),
});

// Zod validation schema for the entire prescription form (single medication)
const createPrescriptionSchema = z.object({
  patientEmail: z.string().email('Please enter a valid patient email'),
  diagnosis: z.string().optional(),
  appointmentId: z.string().optional(),
  medication: medicationSchema, // Single medication object, not array
});

type CreatePrescriptionFormData = z.infer<typeof createPrescriptionSchema>;

interface CreatePrescriptionFormProps {
    doctorId: string;
    defaultPatientId?: string;
    onSuccess: () => void;
    onCancel?: () => void;
    onSubmitting?: (isSubmitting: boolean) => void;
}

/**
 * CreatePrescriptionForm Component
 *
 * Form for doctors to create new prescriptions for patients
 * Uses React Hook Form + Zod for type-safe validation
 * Supports a single medication per prescription (matches backend API)
 *
 * @param doctorId - The ID of the doctor creating the prescription
 * @param defaultPatientId - Optional pre-selected patient ID
 * @param onSuccess - Callback when prescription creation succeeds
 * @param onCancel - Optional callback for cancel button
 * @param onSubmitting - Callback to notify parent of submission state
 */
export function CreatePrescriptionForm({
  doctorId,
  defaultPatientId: _defaultPatientId,
  onSuccess,
  onCancel: _onCancel,
  onSubmitting,
}: CreatePrescriptionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Array<{ patientId: string; patientName: string; email: string }>>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<CreatePrescriptionFormData>({
    resolver: zodResolver(createPrescriptionSchema),
    defaultValues: {
      patientEmail: '',
      medication: {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 1,
        instructions: '',
      },
    },
  });

  const patientEmail = watch('patientEmail');

  // Fetch doctor's patient list
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // Fetch patients from healthcare API
        const token = authUtils.getToken();
        const response = await fetch('/api/v1/healthcare/patients', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch patients');
        }

        const result = await response.json();
        const patientsData = result.data || result;

        // Transform to expected format
        const transformedPatients = patientsData.map((patient: any) => ({
          patientId: patient.id || patient.email,
          patientName: patient.name,
          email: patient.email,
        }));

        setPatients(transformedPatients);
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, []);

  const onSubmit = async (data: CreatePrescriptionFormData) => {
    setIsSubmitting(true);
    onSubmitting?.(true);

    try {
      // Create prescription payload matching backend expectations
      const prescriptionPayload = {
        prescriptionId: `RX${Date.now()}`,
        patientEmail: data.patientEmail,
        doctorAddress: doctorId, // Backend expects doctorAddress, not doctorId
        medication: data.medication.name, // Single medication string
        dosage: data.medication.dosage, // Single dosage string
        expiryTimestamp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
      };

      // Call healthcare API to create prescription
      const token = authUtils.getToken();
      const response = await fetch('/api/v1/healthcare/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(prescriptionPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create prescription');
      }

      const _result = await response.json();

      // Import toast dynamically
      const { toast } = await import('sonner');
      toast.success('Prescription Created', {
        description: `Prescription for ${data.patientEmail} has been created`,
      });

      // Reset form and call success callback
      reset();
      onSuccess();

    } catch (error) {
      console.error('Failed to create prescription:', error);

      const { toast } = await import('sonner');
      const errorMessage = error instanceof Error ? error.message : 'Failed to create prescription';
      toast.error('Creation Failed', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
      onSubmitting?.(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Patient Selection */}
      <div className="space-y-2">
        <Label htmlFor="patientEmail" className="text-sm font-medium">
                    Patient Email <span className="text-red-500">*</span>
        </Label>
        {loadingPatients ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
                        Loading patients...
          </div>
        ) : (
          <Select
            value={patientEmail}
            onValueChange={(value) => setValue('patientEmail', value)}
            disabled={isSubmitting}
          >
            <SelectTrigger id="patientEmail">
              <SelectValue placeholder="Select a patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.email} value={patient.email}>
                  {patient.patientName} ({patient.email})
                </SelectItem>
              ))}
              {patients.length === 0 && (
                <div className="p-2 text-sm text-muted-foreground">
                                    No patients found
                </div>
              )}
            </SelectContent>
          </Select>
        )}
        {errors.patientEmail && (
          <p className="text-sm text-red-500">{errors.patientEmail.message}</p>
        )}
      </div>

      {/* Diagnosis (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="diagnosis" className="text-sm font-medium">
                    Diagnosis (Optional)
        </Label>
        <Input
          id="diagnosis"
          placeholder="e.g., Acute Bronchitis, Type 2 Diabetes"
          {...register('diagnosis')}
          disabled={isSubmitting}
        />
      </div>

      {/* Medication Section (Single medication) */}
      <div className="space-y-4">
        <Label className="text-sm font-medium">
          Medication <span className="text-red-500">*</span>
        </Label>

        <div className="p-4 border rounded-lg space-y-4 bg-neutral-50 dark:bg-neutral-900">
          <div className="grid grid-cols-2 gap-4">
            {/* Medication Name */}
            <div className="space-y-2">
              <Label htmlFor="medication.name" className="text-xs">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="medication.name"
                placeholder="e.g., Amoxicillin"
                {...register('medication.name')}
                disabled={isSubmitting}
              />
              {errors.medication?.name && (
                <p className="text-xs text-red-500">
                  {errors.medication.name.message}
                </p>
              )}
            </div>

            {/* Dosage */}
            <div className="space-y-2">
              <Label htmlFor="medication.dosage" className="text-xs">
                Dosage <span className="text-red-500">*</span>
              </Label>
              <Input
                id="medication.dosage"
                placeholder="e.g., 500mg"
                {...register('medication.dosage')}
                disabled={isSubmitting}
              />
              {errors.medication?.dosage && (
                <p className="text-xs text-red-500">
                  {errors.medication.dosage.message}
                </p>
              )}
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label htmlFor="medication.frequency" className="text-xs">
                Frequency <span className="text-red-500">*</span>
              </Label>
              <Input
                id="medication.frequency"
                placeholder="e.g., twice daily"
                {...register('medication.frequency')}
                disabled={isSubmitting}
              />
              {errors.medication?.frequency && (
                <p className="text-xs text-red-500">
                  {errors.medication.frequency.message}
                </p>
              )}
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="medication.duration" className="text-xs">
                Duration <span className="text-red-500">*</span>
              </Label>
              <Input
                id="medication.duration"
                placeholder="e.g., 7 days"
                {...register('medication.duration')}
                disabled={isSubmitting}
              />
              {errors.medication?.duration && (
                <p className="text-xs text-red-500">
                  {errors.medication.duration.message}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="medication.quantity" className="text-xs">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="medication.quantity"
                type="number"
                placeholder="e.g., 14"
                {...register('medication.quantity', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.medication?.quantity && (
                <p className="text-xs text-red-500">
                  {errors.medication.quantity.message}
                </p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="medication.instructions" className="text-xs">
              Instructions <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="medication.instructions"
              placeholder="e.g., Take with food, one tablet every 12 hours"
              {...register('medication.instructions')}
              disabled={isSubmitting}
              rows={3}
            />
            {errors.medication?.instructions && (
              <p className="text-xs text-red-500">
                {errors.medication.instructions.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Prescription...
          </>
        ) : (
          <>
            <Pill className="mr-2 h-4 w-4" />
            Create Prescription
          </>
        )}
      </Button>
    </form>
  );
}
