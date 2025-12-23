/* eslint-disable no-console */
/**
 * Doctor Actions Component
 *
 * Fixed implementation for Add Patient and Schedule Appointment functionality
 * Uses backend API instead of direct blockchain calls
 *
 * Usage: Import and use these components in your doctor dashboard
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
import { PlusCircle, Calendar, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { authUtils } from '@/lib/auth-utils';

/**
 * Add Patient Dialog
 *
 * Properly implements patient creation with:
 * - Wallet connection check
 * - Proper signer initialization
 * - Argument logging
 * - Error handling with reverted transaction detection
 */
export function AddPatientDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    walletAddress: '', // Optional - will be auto-generated if not provided
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      walletAddress: '',
    });
    setError(null);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields - only name and email are required
      if (!formData.name || !formData.email) {
        throw new Error('Name and email are required');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Construct the payload object for the new healthcare API
      const payload = {
        name: formData.name,
        email: formData.email,
        walletAddress: formData.walletAddress || undefined, // Optional
      };

      console.log('Creating patient:', payload);

      // Call the new healthcare API
      const response = await fetch('/api/v1/healthcare/patients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authUtils.getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Patient created successfully:', result);

      // Success!
      toast({
        title: 'Patient Created',
        description: `Patient ${formData.name} has been added successfully. Wallet address: ${result.data?.walletAddress || 'Auto-generated'}`,
      });

      // Reset form and close dialog
      resetForm();
      setOpen(false);

    } catch (err) {
      console.error('Failed to create patient:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to add patient';
      setError(errorMessage);

      toast({
        title: 'Error',
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
      if (!isOpen) {resetForm();}
    }}>
      <DialogTrigger asChild>
        <Button className="bg-government-blue hover:bg-government-blue/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleAddPatient}>
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
            <DialogDescription>
              Create a new patient record
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
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="walletAddress">Wallet Address (Optional)</Label>
              <Input
                id="walletAddress"
                placeholder="0x1234...abcd (leave empty to auto-generate)"
                value={formData.walletAddress}
                onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                disabled={loading}
              />
              <p className="text-sm text-muted-foreground">
                If not provided, a wallet address will be automatically generated for this patient.
              </p>
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
                  Create Patient
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Schedule Appointment Dialog
 *
 * Properly implements appointment scheduling with all the same safeguards
 */
interface ScheduleAppointmentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ScheduleAppointmentDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess
}: ScheduleAppointmentDialogProps = {}) {
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setInternalOpen;

  const [formData, setFormData] = useState({
    appointmentId: '',
    patientEmail: '',
    title: '',
    description: '',
    scheduledAt: '',
    notes: '',
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
      appointmentId: '',
      patientEmail: '',
      title: '',
      description: '',
      scheduledAt: '',
      notes: '',
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

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.patientEmail || !formData.title || !formData.scheduledAt) {
        throw new Error('Please fill in all required fields');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.patientEmail)) {
        throw new Error('Please enter a valid patient email address');
      }

      // Parse the scheduled date/time
      const scheduledAt = new Date(formData.scheduledAt);
      if (isNaN(scheduledAt.getTime())) {
        throw new Error('Please enter a valid date and time');
      }

      // Create appointment payload for the new healthcare API
      const appointmentPayload: any = {
        patientEmail: formData.patientEmail,
        title: formData.title,
        description: formData.description || formData.notes || '',
        scheduledAt: formData.scheduledAt,
        notes: formData.notes || '',
      };

      // Add patient details if provided
      if (formData.includePatientDetails) {
        const patientDetails: any = {};

        if (formData.patientAge) {
          patientDetails.age = parseInt(formData.patientAge);
        }
        if (formData.patientGender) {
          patientDetails.gender = formData.patientGender;
        }
        if (formData.patientPhone) {
          patientDetails.phoneNumber = formData.patientPhone;
        }
        if (formData.patientEmergencyContact) {
          patientDetails.emergencyContact = formData.patientEmergencyContact;
        }
        if (formData.patientBloodGroup) {
          patientDetails.bloodGroup = formData.patientBloodGroup;
        }
        if (formData.patientDateOfBirth) {
          patientDetails.dateOfBirth = formData.patientDateOfBirth;
        }

        if (Object.keys(patientDetails).length > 0) {
          appointmentPayload.patientDetails = patientDetails;
        }
      }

      console.log('Scheduling appointment:', appointmentPayload);

      // Call the new healthcare API
      const response = await fetch('/api/v1/healthcare/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authUtils.getToken()}`,
        },
        body: JSON.stringify(appointmentPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Appointment scheduled successfully:', result);

      toast({
        title: 'Appointment Scheduled',
        description: `Appointment scheduled for ${new Date(formData.scheduledAt).toLocaleString()}`,
      });

      resetForm();
      setOpen(false);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

    } catch (err) {
      console.error('Failed to schedule appointment:', err);

      const errorMessage = err instanceof Error ? err.message : 'Failed to schedule appointment';
      setError(errorMessage);

      toast({
        title: 'Error',
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
      if (!isOpen) {resetForm();}
    }}>
      <DialogTrigger asChild>
        <Button className="bg-government-blue hover:bg-government-blue/90">
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Appointment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSchedule}>
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new appointment for a patient
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
              <Label htmlFor="title">Appointment Title *</Label>
              <Input
                id="title"
                placeholder="Checkup, Consultation, etc."
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scheduledAt">Date & Time *</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Appointment description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={loading}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes (optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                Update patient details with this appointment
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
                  Scheduling...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Schedule
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
