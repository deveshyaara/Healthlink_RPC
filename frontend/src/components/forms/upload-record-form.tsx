'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Loader2, Upload, FileText } from 'lucide-react';
import { storageApi, recordsApi } from '@/lib/api-client';

// Zod validation schema
const uploadRecordSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title too long'),
  recordType: z.enum(['Lab Report', 'Prescription', 'X-Ray', 'MRI Scan', 'CT Scan', 'Consultation Notes', 'Vaccination Record', 'Other'], {
    required_error: 'Please select a record type',
  }),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description too long'),
  tags: z.string().optional(),
  file: z.instanceof(FileList)
    .refine((files) => files.length > 0, 'Please select a file')
    .refine((files) => files[0]?.size <= 5 * 1024 * 1024, 'File size must be less than 5MB'),
});

type UploadRecordFormData = z.infer<typeof uploadRecordSchema>;

interface UploadRecordFormProps {
    patientId: string;
    onSuccess: () => void;
    onCancel?: () => void;
    onSubmitting?: (isSubmitting: boolean) => void;
}

/**
 * UploadRecordForm Component
 *
 * Form for patients to upload new health records
 * Uses React Hook Form + Zod for type-safe validation
 *
 * @param patientId - The ID of the patient uploading the record
 * @param onSuccess - Callback when upload succeeds (for refreshing list)
 * @param onCancel - Optional callback for cancel button
 * @param onSubmitting - Callback to notify parent of submission state
 */
export function UploadRecordForm({
  patientId,
  onSuccess,
  onCancel,
  onSubmitting,
}: UploadRecordFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<UploadRecordFormData>({
    resolver: zodResolver(uploadRecordSchema),
  });

  const recordType = watch('recordType');

  const onSubmit = async (data: UploadRecordFormData) => {
    setIsSubmitting(true);
    onSubmitting?.(true);

    try {
      const file = data.file[0];

      // Upload file and get SHA-256 hash
      const uploadResult = await storageApi.upload(file, (progress) => {
        setUploadProgress(progress * 0.8); // File upload is 80% of the process
      });
      const realHash = uploadResult.hash; // Real SHA-256 hash from backend

      setUploadProgress(85);

      // Build metadata object and payload matching backend expectations
      const metadataObj = {
        title: data.title,
        description: data.description,
        tags: data.tags ? data.tags.split(',').map((t) => t.trim()) : [],
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
      };

      const recordPayload = {
        recordId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `rec-${Date.now()}-${Math.floor(Math.random()*10000)}`,
        patientId,
        // `User` type defines `id` only — prefer that instead of non-standard `userId`
        doctorId: user?.role === 'doctor' ? user.id : '',
        recordType: data.recordType,
        ipfsHash: realHash,
        metadata: JSON.stringify(metadataObj),
      };

      const _response = await recordsApi.create(recordPayload);

      setUploadProgress(100);

      // Import toast dynamically
      const { toast } = await import('sonner');
      toast.success('Health Record Uploaded', {
        description: `${data.title} has been added to your records`,
      });

      // Reset form and call success callback
      reset();
      onSuccess();

    } catch (error) {
      console.error('Failed to upload record:', error);

      const { toast } = await import('sonner');
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload record';
      toast.error('Upload Failed', {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
      onSubmitting?.(false);
      setUploadProgress(0);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Title Field */}
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium">
                    Record Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          placeholder="e.g., Blood Test Results - January 2025"
          {...register('title')}
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      {/* Record Type Field */}
      <div className="space-y-2">
        <Label htmlFor="recordType" className="text-sm font-medium">
                    Record Type <span className="text-red-500">*</span>
        </Label>
        <Select
          value={recordType}
          onValueChange={(value) => setValue('recordType', value as typeof recordType)}
          disabled={isSubmitting}
        >
          <SelectTrigger id="recordType">
            <SelectValue placeholder="Select record type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Lab Report">Lab Report</SelectItem>
            <SelectItem value="Prescription">Prescription</SelectItem>
            <SelectItem value="X-Ray">X-Ray</SelectItem>
            <SelectItem value="MRI Scan">MRI Scan</SelectItem>
            <SelectItem value="CT Scan">CT Scan</SelectItem>
            <SelectItem value="Consultation Notes">Consultation Notes</SelectItem>
            <SelectItem value="Vaccination Record">Vaccination Record</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {errors.recordType && (
          <p className="text-sm text-red-500">{errors.recordType.message}</p>
        )}
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium">
                    Description <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="description"
          placeholder="Provide details about this record..."
          rows={3}
          {...register('description')}
          disabled={isSubmitting}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Tags Field */}
      <div className="space-y-2">
        <Label htmlFor="tags" className="text-sm font-medium">
                    Tags (Optional)
        </Label>
        <Input
          id="tags"
          placeholder="e.g., diabetes, cardiology, annual-checkup (comma-separated)"
          {...register('tags')}
          disabled={isSubmitting}
        />
        <p className="text-xs text-muted-foreground">
                    Separate multiple tags with commas
        </p>
      </div>

      {/* File Upload Field */}
      <div className="space-y-2">
        <Label htmlFor="file" className="text-sm font-medium">
                    Upload File <span className="text-red-500">*</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            {...register('file')}
            disabled={isSubmitting}
            className="cursor-pointer"
          />
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        </div>
        {errors.file && (
          <p className="text-sm text-red-500">{errors.file.message as string}</p>
        )}
        <p className="text-xs text-muted-foreground">
                    Accepted formats: PDF, JPG, PNG, DOC, DOCX. Max size: 5MB
        </p>
      </div>

      {/* Upload Progress */}
      {isSubmitting && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-government-blue transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

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
                            Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
                            Upload Record
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
