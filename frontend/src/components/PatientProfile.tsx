'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { patientsApi, Patient } from '@/lib/api-client';

interface PatientData extends Patient {
  patientId: string;
  publicData: {
    name: string;
    age: number;
    gender: string;
    ipfsHash: string;
  };
  exists?: boolean;
}

export function PatientProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientData = async () => {
      if (!user?.walletAddress) {
        setError('Wallet address not available');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const result = await patientsApi.get(user.walletAddress);

        if (result) {
          setPatientData(result);
        } else {
          throw new Error('Patient data not found');
        }
      } catch (err) {
        console.error('Error fetching patient data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load patient data');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [user?.walletAddress]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Patient Profile
          </CardTitle>
          <CardDescription>Your blockchain identity and medical data hash</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading patient data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !patientData?.exists) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Patient Profile
          </CardTitle>
          <CardDescription>Your blockchain identity and medical data hash</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {error || 'Patient record not found on blockchain'}
            </p>
            <p className="text-sm text-muted-foreground">
              Contact your doctor to create your patient record if you haven&apos;t been registered yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Patient Profile
        </CardTitle>
        <CardDescription>
          Your blockchain identity and medical data hash. Share these with doctors for medical services.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Patient ID */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Patient ID (Wallet Address)</label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs break-all">
              {patientData.patientId}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(patientData.patientId, 'Patient ID')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* IPFS Hash */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Medical Data Hash</label>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs break-all">
              {patientData.publicData.ipfsHash}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(patientData.publicData.ipfsHash, 'Medical Data Hash')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{patientData.publicData.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Age</p>
            <p className="font-medium">{patientData.publicData.age}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-medium">{patientData.publicData.gender}</p>
          </div>
        </div>

        <div className="text-xs text-muted-foreground pt-2">
          Created: {patientData.createdAt ? new Date(typeof patientData.createdAt === 'number' ? patientData.createdAt * 1000 : patientData.createdAt).toLocaleDateString() : 'Unknown'}
        </div>
      </CardContent>
    </Card>
  );
}
