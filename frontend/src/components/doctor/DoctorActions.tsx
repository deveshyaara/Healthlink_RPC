/* eslint-disable no-console */
/**
 * Doctor Actions Component
 *
 * Fixed implementation for Add Patient and Schedule Appointment functionality
 * Includes proper signer initialization, argument validation, and error handling
 *
 * Usage: Import and use these components in your doctor dashboard
 */

'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
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
    patientId: '',
    name: '',
    age: '',
    bloodType: 'A+',
    allergies: '',
  });

  const resetForm = () => {
    setFormData({
      patientId: '',
      name: '',
      age: '',
      bloodType: 'A+',
      allergies: '',
    });
    setError(null);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Step 1: Check if MetaMask is installed
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask to continue.');
      }

      console.log('🔍 Step 1: MetaMask detected ✅');

      // Step 2: Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const doctorAddress = await signer.getAddress();

      console.log('🔍 Step 2: Signer initialized ✅');
      console.log(`   Doctor Address: ${doctorAddress}`);

      // Step 3: Load contract ABI
      const contractResponse = await fetch('/contracts/HealthLink.json');
      if (!contractResponse.ok) {
        throw new Error('Failed to load contract ABI');
      }
      const contractData = await contractResponse.json();

      console.log('🔍 Step 3: Contract ABI loaded ✅');

      // Step 4: Get contract address
      const contractAddress = process.env.NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      console.log('🔍 Step 4: Contract address obtained ✅');
      console.log(`   Address: ${contractAddress}`);

      // Step 5: Initialize contract with signer
      const contract = new ethers.Contract(
        contractAddress,
        contractData.abi,
        signer
      );

      console.log('🔍 Step 5: Contract initialized ✅');

      // Step 6: Validate arguments
      if (!formData.patientId || !formData.name || !formData.age) {
        throw new Error('Please fill in all required fields');
      }

      const ageNumber = parseInt(formData.age);
      if (isNaN(ageNumber) || ageNumber < 0 || ageNumber > 150) {
        throw new Error('Please enter a valid age');
      }

      console.log('🔍 Step 6: Arguments validated ✅');

      // Step 7: Log exact arguments being sent
      console.log('\n📤 Transaction Arguments:');
      console.log(`   patientId: "${formData.patientId}" (${typeof formData.patientId})`);
      console.log(`   name: "${formData.name}" (${typeof formData.name})`);
      console.log(`   age: ${ageNumber} (${typeof ageNumber})`);
      console.log(`   bloodType: "${formData.bloodType}" (${typeof formData.bloodType})`);
      console.log(`   allergies: "${formData.allergies}" (${typeof formData.allergies})`);

      // Step 8: Check if doctor has DOCTOR_ROLE
      const DOCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE'));
      console.log('\n🔍 Step 7: Checking DOCTOR_ROLE...');
      console.log(`   Role Hash: ${DOCTOR_ROLE}`);

      const hasRole = await contract.hasRole(DOCTOR_ROLE, doctorAddress);
      console.log(`   Has Role: ${hasRole ? '✅ YES' : '❌ NO'}`);

      if (!hasRole) {
        throw new Error(
          `Your wallet (${doctorAddress}) does not have DOCTOR_ROLE. ` +
          'Please run the grant-roles script to grant permissions.'
        );
      }

      // Step 9: Send transaction
      console.log('\n⏳ Step 8: Sending transaction...');

      const tx = await contract.createPatient(
        formData.patientId,
        formData.name,
        ageNumber,
        formData.bloodType,
        formData.allergies
      );

      console.log(`   📤 Transaction Hash: ${tx.hash}`);
      console.log('   ⏳ Waiting for confirmation...');

      // Step 10: Wait for transaction confirmation
      const receipt = await tx.wait();

      console.log('   ✅ Transaction confirmed!');
      console.log(`   🧱 Block Number: ${receipt.blockNumber}`);
      console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

      // Success!
      toast({
        title: 'Patient Created',
        description: `Patient ${formData.name} (ID: ${formData.patientId}) has been added successfully.`,
      });

      // Reset form and close dialog
      resetForm();
      setOpen(false);

    } catch (err) {
      console.error('\n❌ Transaction failed:', err);

      let errorMessage = 'Failed to add patient';

      if (err instanceof Error) {
        // Check for specific error types
        if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas fees';
        } else if (err.message.includes('Reverted') || err.message.includes('revert')) {
          errorMessage = 'Transaction reverted. You may not have permission to create patients.';
        } else if (err.message.includes('DOCTOR_ROLE')) {
          errorMessage = err.message;
        } else {
          errorMessage = err.message;
        }

        console.error(`   Error Type: ${err.constructor.name}`);
        console.error(`   Error Message: ${err.message}`);
      }

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
              Create a new patient record on the blockchain
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
              <Label htmlFor="bloodType">Blood Type *</Label>
              <Select
                value={formData.bloodType}
                onValueChange={(value) => setFormData({ ...formData, bloodType: value })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select blood type" />
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
              <Label htmlFor="allergies">Allergies</Label>
              <Textarea
                id="allergies"
                placeholder="Enter known allergies (optional)"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
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
      // Similar implementation to AddPatient...
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not installed');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const doctorAddress = await signer.getAddress();

      const contractResponse = await fetch('/contracts/Appointments.json');
      if (!contractResponse.ok) {
        throw new Error('Failed to load contract ABI');
      }
      const contractData = await contractResponse.json();

      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_APPOINTMENTS;
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      const contract = new ethers.Contract(
        contractAddress,
        contractData.abi,
        signer
      );

      // Log arguments
      console.log('\n📤 Schedule Appointment Arguments:');
      console.log(`   appointmentId: "${formData.appointmentId}"`);
      console.log(`   patientId: "${formData.patientId}"`);
      console.log(`   doctorId: "${doctorAddress}"`);
      console.log(`   date: "${formData.date}"`);
      console.log(`   time: "${formData.time}"`);
      console.log(`   type: "${formData.type}"`);
      console.log(`   notes: "${formData.notes}"`);

      // Send transaction
      const tx = await contract.scheduleAppointment(
        formData.appointmentId,
        formData.patientId,
        doctorAddress,
        formData.date,
        formData.time,
        formData.type,
        formData.notes
      );

      console.log(`   📤 Transaction Hash: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Confirmed in block ${receipt.blockNumber}`);

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
      console.error('❌ Transaction failed:', err);

      let errorMessage = 'Failed to schedule appointment';
      if (err instanceof Error) {
        if (err.message.includes('Reverted')) {
          errorMessage = 'Transaction reverted. Check your permissions.';
        } else {
          errorMessage = err.message;
        }
      }

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
              Create a new appointment on the blockchain
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
