/* eslint-disable no-console */
/**
 * CreatePrescriptionDialog Component
 *
 * Dialog wrapper for creating prescriptions on the blockchain
 * Integrates with the Prescriptions smart contract
 *
 * Usage: Import and use in doctor dashboard for quick prescription creation
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Pill, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CreatePrescriptionDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    prescriptionId: '',
    patientId: '',
    medication: '',
    dosage: '',
    instructions: '',
  });

  const resetForm = () => {
    setFormData({
      prescriptionId: '',
      patientId: '',
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
      // Step 1: Check MetaMask
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
      const contractResponse = await fetch('/contracts/Prescriptions.json');
      if (!contractResponse.ok) {
        throw new Error('Failed to load Prescriptions contract ABI');
      }
      const contractData = await contractResponse.json();

      console.log('🔍 Step 3: Contract ABI loaded ✅');

      // Step 4: Get contract address
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_PRESCRIPTIONS;
      if (!contractAddress) {
        throw new Error('Prescriptions contract address not configured');
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
      if (!formData.prescriptionId || !formData.patientId || !formData.medication || !formData.dosage) {
        throw new Error('Please fill in all required fields');
      }

      console.log('🔍 Step 6: Arguments validated ✅');

      // Step 7: Log exact arguments
      console.log('\n📤 Transaction Arguments:');
      console.log(`   prescriptionId: "${formData.prescriptionId}"`);
      console.log(`   patientId: "${formData.patientId}"`);
      console.log(`   doctorId: "${doctorAddress}"`);
      console.log(`   medication: "${formData.medication}"`);
      console.log(`   dosage: "${formData.dosage}"`);
      console.log(`   instructions: "${formData.instructions}"`);

      // Step 8: Check DOCTOR_ROLE
      const DOCTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE'));

      // Load HealthLink contract to check role
      const healthlinkResponse = await fetch('/contracts/HealthLink.json');
      const healthlinkData = await healthlinkResponse.json();
      const healthlinkAddress = process.env.NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS;
      const healthlinkContract = new ethers.Contract(
        healthlinkAddress!,
        healthlinkData.abi,
        provider
      );

      console.log('\n🔍 Step 7: Checking DOCTOR_ROLE...');
      const hasRole = await healthlinkContract.hasRole(DOCTOR_ROLE, doctorAddress);
      console.log(`   Has Role: ${hasRole ? '✅ YES' : '❌ NO'}`);

      if (!hasRole) {
        throw new Error(
          `Your wallet (${doctorAddress}) does not have DOCTOR_ROLE. ` +
          'Please run the grant-roles script to grant permissions.'
        );
      }

      // Step 9: Send transaction
      console.log('\n⏳ Step 8: Sending transaction...');

      const tx = await contract.createPrescription(
        formData.prescriptionId,
        formData.patientId,
        doctorAddress,
        formData.medication,
        formData.dosage,
        formData.instructions
      );

      console.log(`   📤 Transaction Hash: ${tx.hash}`);
      console.log('   ⏳ Waiting for confirmation...');

      // Step 10: Wait for confirmation
      const receipt = await tx.wait();

      console.log('   ✅ Transaction confirmed!');
      console.log(`   🧱 Block Number: ${receipt.blockNumber}`);
      console.log(`   ⛽ Gas Used: ${receipt.gasUsed.toString()}`);

      // Success!
      toast({
        title: 'Prescription Created',
        description: `Prescription ${formData.prescriptionId} for patient ${formData.patientId} has been created successfully.`,
      });

      // Reset and close
      resetForm();
      setOpen(false);

    } catch (err) {
      console.error('\n❌ Transaction failed:', err);

      let errorMessage = 'Failed to create prescription';

      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas fees';
        } else if (err.message.includes('Reverted') || err.message.includes('revert')) {
          errorMessage = 'Transaction reverted. You may not have permission to create prescriptions.';
        } else if (err.message.includes('DOCTOR_ROLE')) {
          errorMessage = err.message;
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
