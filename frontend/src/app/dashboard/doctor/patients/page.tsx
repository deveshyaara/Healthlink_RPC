'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Users, Search, Eye, FileText, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { RequireDoctor } from '@/components/auth/RequireRole';
import { ActionModal } from '@/components/ui/action-modal';
import { UploadRecordForm } from '@/components/forms/upload-record-form';
import { authUtils } from '@/lib/auth-utils';

interface Patient {
  patientId: string;
  name: string;
  email?: string;
  age?: number;
  gender?: string;
  phoneNumber?: string;
  bloodGroup?: string;
  lastVisit?: string;
  recordCount?: number;
  status?: string;
}

/**
 * Doctor: My Patients Page
 * Shows list of all patients the doctor has treated/created records for
 */
export default function DoctorPatientsPage() {
  return (
    <RequireDoctor>
      <DoctorPatientsPageContent />
    </RequireDoctor>
  );
}

function DoctorPatientsPageContent() {
  const { user: _user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [_isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedPatientEmail, setSelectedPatientEmail] = useState<string>('');

  const fetchPatients = async () => {
    try {
      setError(null);
      setLoading(true);

      // Use the new API endpoint to get patients created by this doctor
      const response = await fetch('/api/v1/healthcare/patients', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authUtils.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.statusText}`);
      }

      const data = await response.json();

      // Support new flat responses: { success: true, patients: [...] }
      let patientsArray: any[] = [];
      if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'success')) {
        if (data.success === true) {
          patientsArray = Array.isArray(data.patients) ? data.patients : (Array.isArray(data.data) ? data.data : []);
        } else {
          throw new Error(data.error || data.message || 'Failed to fetch patients');
        }
      } else {
        // Back-compat: JSend-style or raw array
        patientsArray = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      }

      const transformedPatients: Patient[] = patientsArray.map((patient: any) => ({
        patientId: patient.walletAddress, // Use wallet address as patient ID
        name: patient.name,
        email: patient.email,
        lastVisit: patient.createdAt,
        recordCount: (patient.appointments?.length || 0) + (patient.prescriptions?.length || 0) + (patient.medicalRecords?.length || 0),
        status: patient.isActive ? 'Active' : 'Inactive',
      }));

      setPatients(transformedPatients);
      setFilteredPatients(transformedPatients);
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch patients');
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPatients(patients);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = patients.filter(
        (patient) =>
          patient.patientId.toLowerCase().includes(query) ||
          patient.name.toLowerCase().includes(query) ||
          patient.email?.toLowerCase().includes(query),
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="My Patients"
          description="Loading your patient list..."
          icon={Users}
        />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Patients"
        description="Manage and view your patients' health records"
        icon={Users}
      />

      {error && (
        <ErrorBanner
          title="Failed to Load Patients"
          message={error}
          onRetry={() => window.location.reload()}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Patient List ({filteredPatients.length})</CardTitle>
            <div className="flex items-center gap-2 w-full max-w-sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!error && filteredPatients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No patients found' : 'No patients yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Start by uploading medical records for your patients'}
              </p>
              {!searchQuery && (
                <Button onClick={() => (window.location.href = '/dashboard/records')}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Upload First Record
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.patientId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {patient.patientId}
                      </div>
                    </TableCell>
                    <TableCell>{patient.name}</TableCell>
                    <TableCell>{patient.email || '—'}</TableCell>
                    <TableCell>{patient.age || '—'}</TableCell>
                    <TableCell>{patient.gender || '—'}</TableCell>
                    <TableCell>{patient.phoneNumber || '—'}</TableCell>
                    <TableCell>{patient.bloodGroup || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{patient.recordCount || 0} records</Badge>
                    </TableCell>
                    <TableCell>
                      {patient.lastVisit
                        ? new Date(patient.lastVisit).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">{patient.status || 'Active'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/records?patientEmail=${encodeURIComponent(patient.email || patient.patientId)}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            View Records
                          </Button>
                        </Link>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                              setSelectedPatientEmail(patient.email || patient.patientId);
                            setShowUploadDialog(true);
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Add Record
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Record Dialog */}
      <ActionModal
        isOpen={showUploadDialog}
        onClose={() => {
          setShowUploadDialog(false);
          setIsSubmittingForm(false);
          setSelectedPatientId('');
        }}
        title="Upload Medical Record"
        description={`Upload a new medical record for patient: ${selectedPatientEmail || 'Unknown'}`}
      >
        {selectedPatientEmail && (
          <UploadRecordForm
            patientEmail={selectedPatientEmail}
            onSuccess={() => {
              setShowUploadDialog(false);
              setIsSubmittingForm(false);
              setSelectedPatientEmail('');
              // Refresh the patients list properly
              fetchPatients();
            }}
            onSubmitting={setIsSubmittingForm}
          />
        )}
      </ActionModal>
    </div>
  );
}
