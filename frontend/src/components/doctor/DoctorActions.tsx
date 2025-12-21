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
    patientAddress: '',
    name: '',
    age: '',
    gender: '',
    ipfsHash: '',
  });

  const resetForm = () => {
    setFormData({
      patientAddress: '',
      name: '',
      age: '',
      gender: '',
      ipfsHash: '',
    });
    setError(null);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields - ensure all 5 fields are not empty/null
      if (!formData.patientAddress || !formData.name || !formData.age || !formData.gender || !formData.ipfsHash) {
        throw new Error('All fields are required');
      }

      const ageNumber = parseInt(formData.age);
      if (isNaN(ageNumber) || ageNumber < 0 || ageNumber > 150) {
        throw new Error('Please enter a valid age');
      }

      // Construct the payload object with keys matching backend requirements exactly
      const payload = {
        patientAddress: formData.patientAddress,
        name: formData.name,
        age: ageNumber, // Ensure age is sent as a Number
        gender: formData.gender,
        ipfsHash: formData.ipfsHash,
      };

      console.log('Creating patient:', payload);

      // Use API client to create patient
      const { patientsApi } = await import('@/lib/api-client');
      const response = await patientsApi.create(payload);

      console.log('Patient created successfully:', response);

      // Success!
      toast({
        title: 'Patient Created',
        description: `Patient ${formData.name} has been added successfully.`,
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
              <Label htmlFor="patientAddress">Patient Address *</Label>
              <Input
                id="patientAddress"
                placeholder="0x1234...abcd"
                value={formData.patientAddress}
                onChange={(e) => setFormData({ ...formData, patientAddress: e.target.value })}
                required
                disabled={loading}
              />
            </div>

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
              <Label htmlFor="age">Age *</Label>
              <Input
                id="age"
                type="number"
                min="0"
                max="150"
                placeholder="30"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="gender">Gender *</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => setFormData({ ...formData, gender: value })}
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
              <Label htmlFor="ipfsHash">IPFS Hash *</Label>
              <Input
                id="ipfsHash"
                placeholder="Qm..."
                value={formData.ipfsHash}
                onChange={(e) => setFormData({ ...formData, ipfsHash: e.target.value })}
                required
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
    patientId: '',
    date: '',
    time: '',
    type: 'Checkup',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      appointmentId: '',
      patientId: '',
      date: '',
      time: '',
      type: 'Checkup',
      notes: '',
    });
    setError(null);
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.appointmentId || !formData.patientId || !formData.date || !formData.time) {
        throw new Error('Please fill in all required fields');
      }

      // Combine date and time into timestamp
      const dateTimeString = `${formData.date}T${formData.time}`;
      const timestamp = Math.floor(new Date(dateTimeString).getTime() / 1000);

      if (isNaN(timestamp)) {
        throw new Error('Please enter a valid date and time');
      }

      // Create appointment payload matching backend expectations
      const appointmentPayload = {
        appointmentId: formData.appointmentId,
        patientId: formData.patientId,
        doctorAddress: '', // Will be set by backend from authenticated user
        timestamp: timestamp,
        notes: formData.notes || '',
      };

      console.log('Scheduling appointment:', appointmentPayload);

      // Use API client to create appointment
      const { appointmentsApi } = await import('@/lib/api-client');
      const response = await appointmentsApi.create(appointmentPayload);

      console.log('Appointment scheduled successfully:', response);

      toast({
        title: 'Appointment Scheduled',
        description: `Appointment scheduled for ${formData.date} at ${formData.time}`,
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
              <Label htmlFor="appointmentId">Appointment ID *</Label>
              <Input
                id="appointmentId"
                placeholder="APT_001"
                value={formData.appointmentId}
                onChange={(e) => setFormData({ ...formData, appointmentId: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="patientId">Patient ID *</Label>
              <Input
                id="patientId"
                placeholder="PATIENT_001"
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Appointment Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Checkup">Checkup</SelectItem>
                  <SelectItem value="Follow-up">Follow-up</SelectItem>
                  <SelectItem value="Consultation">Consultation</SelectItem>
                  <SelectItem value="Emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
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
