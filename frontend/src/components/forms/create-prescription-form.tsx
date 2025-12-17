'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Loader2, Pill, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Zod validation schema for a single medication
const medicationSchema = z.object({
  name: z.string().min(2, 'Medication name required').max(100, 'Name too long'),
  dosage: z.string().min(1, 'Dosage required (e.g., 500mg)'),
  frequency: z.string().min(1, 'Frequency required (e.g., twice daily)'),
  duration: z.string().min(1, 'Duration required (e.g., 7 days)'),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(1000, 'Quantity too large'),
  instructions: z.string().min(3, 'Instructions required').max(500, 'Instructions too long'),
});

// Zod validation schema for the entire prescription form
const createPrescriptionSchema = z.object({
  patientId: z.string().min(1, 'Please select a patient'),
  diagnosis: z.string().optional(),
  appointmentId: z.string().optional(),
  medications: z.array(medicationSchema).min(1, 'Add at least one medication'),
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
 * Supports multiple medications in a single prescription
 *
 * @param doctorId - The ID of the doctor creating the prescription
 * @param defaultPatientId - Optional pre-selected patient ID
 * @param onSuccess - Callback when prescription creation succeeds
 * @param onCancel - Optional callback for cancel button
 * @param onSubmitting - Callback to notify parent of submission state
 */
export function CreatePrescriptionForm({
  doctorId,
  defaultPatientId,
  onSuccess,
  onCancel,
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
      patientId: defaultPatientId || '',
      medications: [{
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 1,
        instructions: '',
      }],
    },
  });

  const patientId = watch('patientId');
  const medications = watch('medications');

  // Fetch doctor's patient list
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        // Import dynamically to avoid circular dependencies
        const { medicalRecordsApi } = await import('@/lib/api-client');
        const records = await medicalRecordsApi.getAll();

        // Extract unique patients from records
        const patientMap = new Map();
        if (Array.isArray(records)) {
          records.forEach((record: { id: string; patientId: string; diagnosis: string; patientName?: string; patientEmail?: string }) => {
            if (record.patientId && !patientMap.has(record.patientId)) {
              patientMap.set(record.patientId, {
                patientId: record.patientId,
                patientName: record.patientName || record.patientId,
                email: record.patientEmail || 'N/A',
              });
            }
          });
        }

        setPatients(Array.from(patientMap.values()));
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    fetchPatients();
  }, []);

  const addMedication = () => {
    const currentMedications = medications || [];
    setValue('medications', [
      ...currentMedications,
      {
        name: '',
        dosage: '',
        frequency: '',
        duration: '',
        quantity: 1,
        instructions: '',
      },
    ]);
  };

  const removeMedication = (index: number) => {
    const currentMedications = medications || [];
    if (currentMedications.length > 1) {
      setValue('medications', currentMedications.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (data: CreatePrescriptionFormData) => {
    setIsSubmitting(true);
    onSubmitting?.(true);

    try {
      // Create prescription payload
      const prescriptionPayload = {
        prescriptionId: `RX${Date.now()}`,
        patientId: data.patientId,
        doctorId: doctorId,
        medications: data.medications,
        diagnosis: data.diagnosis || undefined,
        appointmentId: data.appointmentId || undefined,
      };

      // Import dynamically to avoid circular dependencies
      const { prescriptionsApi } = await import('@/lib/api-client');
      const _response = await prescriptionsApi.create(prescriptionPayload);

      // Import toast dynamically
      const { toast } = await import('sonner');
      toast.success('Prescription Created', {
        description: `Prescription for ${data.patientId} has been created with ${data.medications.length} medication(s)`,
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
        <Label htmlFor="patientId" className="text-sm font-medium">
                    Patient <span className="text-red-500">*</span>
        </Label>
        {loadingPatients ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
                        Loading patients...
          </div>
        ) : (
          <Select
            value={patientId}
            onValueChange={(value) => setValue('patientId', value)}
            disabled={isSubmitting || !!defaultPatientId}
          >
            <SelectTrigger id="patientId">
              <SelectValue placeholder="Select a patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((patient) => (
                <SelectItem key={patient.patientId} value={patient.patientId}>
                  {patient.patientName} ({patient.patientId})
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
        {errors.patientId && (
          <p className="text-sm text-red-500">{errors.patientId.message}</p>
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

      {/* Medications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
                        Medications <span className="text-red-500">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMedication}
            disabled={isSubmitting}
          >
            <Plus className="mr-1 h-3 w-3" />
                        Add Medication
          </Button>
        </div>

        {medications?.map((_, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-4 bg-neutral-50 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-government-blue">
                                Medication {index + 1}
              </span>
              {medications.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMedication(index)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Medication Name */}
              <div className="space-y-2">
                <Label htmlFor={`medications.${index}.name`} className="text-xs">
                                    Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`medications.${index}.name`}
                  placeholder="e.g., Amoxicillin"
                  {...register(`medications.${index}.name`)}
                  disabled={isSubmitting}
                />
                {errors.medications?.[index]?.name && (
                  <p className="text-xs text-red-500">
                    {errors.medications[index]?.name?.message}
                  </p>
                )}
              </div>

              {/* Dosage */}
              <div className="space-y-2">
                <Label htmlFor={`medications.${index}.dosage`} className="text-xs">
                                    Dosage <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`medications.${index}.dosage`}
                  placeholder="e.g., 500mg"
                  {...register(`medications.${index}.dosage`)}
                  disabled={isSubmitting}
                />
                {errors.medications?.[index]?.dosage && (
                  <p className="text-xs text-red-500">
                    {errors.medications[index]?.dosage?.message}
                  </p>
                )}
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label htmlFor={`medications.${index}.frequency`} className="text-xs">
                                    Frequency <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`medications.${index}.frequency`}
                  placeholder="e.g., Twice daily"
                  {...register(`medications.${index}.frequency`)}
                  disabled={isSubmitting}
                />
                {errors.medications?.[index]?.frequency && (
                  <p className="text-xs text-red-500">
                    {errors.medications[index]?.frequency?.message}
                  </p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor={`medications.${index}.duration`} className="text-xs">
                                    Duration <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`medications.${index}.duration`}
                  placeholder="e.g., 7 days"
                  {...register(`medications.${index}.duration`)}
                  disabled={isSubmitting}
                />
                {errors.medications?.[index]?.duration && (
                  <p className="text-xs text-red-500">
                    {errors.medications[index]?.duration?.message}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor={`medications.${index}.quantity`} className="text-xs">
                                    Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`medications.${index}.quantity`}
                  type="number"
                  min="1"
                  placeholder="e.g., 14"
                  {...register(`medications.${index}.quantity`, { valueAsNumber: true })}
                  disabled={isSubmitting}
                />
                {errors.medications?.[index]?.quantity && (
                  <p className="text-xs text-red-500">
                    {errors.medications[index]?.quantity?.message}
                  </p>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <Label htmlFor={`medications.${index}.instructions`} className="text-xs">
                                Instructions <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id={`medications.${index}.instructions`}
                placeholder="e.g., Take with food. Avoid alcohol."
                rows={2}
                {...register(`medications.${index}.instructions`)}
                disabled={isSubmitting}
              />
              {errors.medications?.[index]?.instructions && (
                <p className="text-xs text-red-500">
                  {errors.medications[index]?.instructions?.message}
                </p>
              )}
            </div>
          </div>
        ))}

        {errors.medications && typeof errors.medications.message === 'string' && (
          <p className="text-sm text-red-500">{errors.medications.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
                        Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-government-blue hover:bg-government-blue/90"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
            </>
          ) : (
            <>
              <Pill className="mr-2 h-4 w-4" />
                            Create Prescription
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
