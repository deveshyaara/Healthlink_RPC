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

export function CreatePrescriptionDialog() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    prescriptionId: '',
    patientEmail: '',
    medication: '',
    dosage: '',
    instructions: '',
    expiryDate: '',
    includePatientDetails: false,
    patientAge: '',
    patientGender: '',
    patientPhone: '',
    patientEmergencyContact: '',
    patientBloodGroup: '',
    patientDateOfBirth: '',
  });

  const resetForm = () => {
    setFormData({
      prescriptionId: '',
      patientEmail: '',
      medication: '',
      dosage: '',
      instructions: '',
      expiryDate: '',
      includePatientDetails: false,
      patientAge: '',
      patientGender: '',
      patientPhone: '',
      patientEmergencyContact: '',
      patientBloodGroup: '',
      patientDateOfBirth: '',
    });
    setError(null);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.prescriptionId || !formData.patientEmail || !formData.medication || !formData.dosage) {
        throw new Error('Please fill in all required fields');
      }

      // Generate expiry timestamp (30 days from now)
      const expiryTimestamp = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

      // Create prescription payload matching backend expectations
      const prescriptionPayload: any = {
        prescriptionId: formData.prescriptionId,
        patientEmail: formData.patientEmail,
        doctorAddress: user?.id || '', // Use authenticated user's ID as doctor address
        medication: formData.medication,
        dosage: formData.dosage,
        instructions: formData.instructions || '',
        expiryTimestamp: expiryTimestamp,
      };

      // Add patient details if provided
      if (formData.includePatientDetails) {
        const patientDetails: any = {};
        
        if (formData.patientAge) patientDetails.age = parseInt(formData.patientAge);
        if (formData.patientGender) patientDetails.gender = formData.patientGender;
        if (formData.patientPhone) patientDetails.phoneNumber = formData.patientPhone;
        if (formData.patientEmergencyContact) patientDetails.emergencyContact = formData.patientEmergencyContact;
        if (formData.patientBloodGroup) patientDetails.bloodGroup = formData.patientBloodGroup;
        if (formData.patientDateOfBirth) patientDetails.dateOfBirth = formData.patientDateOfBirth;

        if (Object.keys(patientDetails).length > 0) {
          prescriptionPayload.patientDetails = patientDetails;
        }
      }

      console.log('Creating prescription:', prescriptionPayload);

      // Call healthcare API to create prescription
      const token = localStorage.getItem('authToken');
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
        description: `Prescription ${formData.prescriptionId} for patient ${formData.patientEmail} has been created successfully.`,
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includePatientDetails"
                checked={formData.includePatientDetails}
                onChange={(e) => setFormData({ ...formData, includePatientDetails: e.target.checked })}
                disabled={loading}
                className="rounded"
              />
              <Label htmlFor="includePatientDetails" className="text-sm">
                Update patient details with this prescription
              </Label>
            </div>

            {formData.includePatientDetails && (
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <h4 className="font-medium mb-3">Patient Details (Optional)</h4>
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor="patientAge">Age</Label>
                    <Input
                      id="patientAge"
                      type="number"
                      min="0"
                      max="150"
                      placeholder="30"
                      value={formData.patientAge}
                      onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="patientGender">Gender</Label>
                    <Select
                      value={formData.patientGender}
                      onValueChange={(value) => setFormData({ ...formData, patientGender: value })}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="patientPhone">Phone Number</Label>
                    <Input
                      id="patientPhone"
                      placeholder="+1-555-0123"
                      value={formData.patientPhone}
                      onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="patientEmergencyContact">Emergency Contact</Label>
                    <Input
                      id="patientEmergencyContact"
                      placeholder="Emergency contact info"
                      value={formData.patientEmergencyContact}
                      onChange={(e) => setFormData({ ...formData, patientEmergencyContact: e.target.value })}
                      disabled={loading}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="patientBloodGroup">Blood Group</Label>
                    <Select
                      value={formData.patientBloodGroup}
                      onValueChange={(value) => setFormData({ ...formData, patientBloodGroup: value })}
                      disabled={loading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="patientDateOfBirth">Date of Birth</Label>
                    <Input
                      id="patientDateOfBirth"
                      type="date"
                      value={formData.patientDateOfBirth}
                      onChange={(e) => setFormData({ ...formData, patientDateOfBirth: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}
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
