/* eslint-disable no-console */
/**
 * CreatePrescriptionDialog Component
 *
 * Dialog wrapper for creating prescriptions via backend API
 * Uses the prescriptions API instead of direct blockchain calls
 *
 * Usage: Import and use in doctor dashboard for quick prescription creation
 */

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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pill, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { authUtils } from '@/lib/auth-utils';

export function CreatePrescriptionDialog() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Array<{ email: string; name: string }>>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [formData, setFormData] = useState({
    patientEmail: '',
    medication: '',
    dosage: '',
    instructions: '',
  });

  const resetForm = () => {
    setFormData({
      patientEmail: '',
      medication: '',
      dosage: '',
      instructions: '',
    });
    setError(null);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.patientEmail || !formData.medication || !formData.dosage) {
        throw new Error('Please fill in all required fields');
      }

      // Auto-generate prescription ID
      const prescriptionId = `RX-${Date.now()}`;

      // Generate expiry timestamp (30 days from now)
      const expiryTimestamp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

      // Create prescription payload matching backend expectations
      const prescriptionPayload: any = {
        prescriptionId,
        patientEmail: formData.patientEmail,
        doctorAddress: user?.id || '', // Use authenticated user's ID as doctor address
        medication: formData.medication,
        dosage: formData.dosage,
        instructions: formData.instructions || '',
        expiryTimestamp: expiryTimestamp,
      };


      console.log('Creating prescription:', prescriptionPayload);

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

      const result = await response.json();
      console.log('Prescription created successfully:', result);

      // Success!
      toast({
        title: 'Prescription Created',
        description: `Prescription ${prescriptionId} for patient ${formData.patientEmail} has been created successfully.`,
      });

      // Reset and close
      resetForm();
      setOpen(false);


    } catch (err) {
      console.error('Failed to create prescription:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to create prescription';
      setError(errorMessage);

      toast({
        title: 'Creation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="bg-government-blue hover:bg-government-blue/90">
          <Pill className="mr-2 h-4 w-4" />
          Create Prescription
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleCreatePrescription}>
          <DialogHeader>
            <DialogTitle>Create Prescription</DialogTitle>
            <DialogDescription>
              Create a new prescription on the blockchain
            </DialogDescription>
          </DialogHeader>

          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prescriptionId">Prescription ID *</Label>
              <Input
                id="prescriptionId"
                placeholder="RX_001"
                value={formData.prescriptionId}
                onChange={(e) => setFormData({ ...formData, prescriptionId: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="patientEmail">Patient Email *</Label>
              <Input
                id="patientEmail"
                type="email"
                placeholder="patient@example.com"
                value={formData.patientEmail}
                onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="medication">Medication Name *</Label>
              <Input
                id="medication"
                placeholder="Amoxicillin"
                value={formData.medication}
                onChange={(e) => setFormData({ ...formData, medication: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dosage">Dosage *</Label>
              <Input
                id="dosage"
                placeholder="500mg twice daily"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                placeholder="Take with food. Complete full course."
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>


          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Create Prescription
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
