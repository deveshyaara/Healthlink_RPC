'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { medicalRecordsApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { ErrorBanner } from '@/components/ui/error-banner';
import { Users, Search, Eye, FileText, PlusCircle } from 'lucide-react';
import Link from 'next/link';

interface Patient {
  patientId: string;
  name: string;
  email?: string;
  lastVisit?: string;
  recordCount?: number;
  status?: string;
}

/**
 * Doctor: My Patients Page
 * Shows list of all patients the doctor has treated/created records for
 */
export default function DoctorPatientsPage() {
  const { user: _user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setError(null);
        setLoading(true);

        // Get all medical records created by this doctor
        const records = await medicalRecordsApi.getAll();

        // Extract unique patients from records
        const patientMap = new Map<string, Patient>();

        if (Array.isArray(records)) {
          records.forEach((record: { id: string; patientId: string; diagnosis: string; patientName?: string; patientEmail?: string; createdAt?: string; timestamp?: string }) => {
            const patientId = record.patientId;
            if (patientId) {
              if (!patientMap.has(patientId)) {
                patientMap.set(patientId, {
                  patientId: patientId,
                  name: record.patientName || patientId,
                  email: record.patientEmail,
                  lastVisit: record.createdAt || record.timestamp,
                  recordCount: 1,
                  status: 'Active',
                });
              } else {
                const existing = patientMap.get(patientId)!;
                existing.recordCount = (existing.recordCount || 0) + 1;
                // Update last visit if newer
                if (record.createdAt && (!existing.lastVisit || record.createdAt > existing.lastVisit)) {
                  existing.lastVisit = record.createdAt;
                }
              }
            }
          });
        }

        const patientList = Array.from(patientMap.values());
        setPatients(patientList);
        setFilteredPatients(patientList);
      } catch (err) {
        console.error('Failed to fetch patients:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load patients';
        setError(errorMessage);
        setPatients([]);
        setFilteredPatients([]);
      } finally {
        setLoading(false);
      }
    };

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
        actionButton={{
          label: 'Upload New Record',
          icon: PlusCircle,
          onClick: () => {
            // Navigate to records page with upload action
            window.location.href = '/dashboard/records';
          },
        }}
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
                      <Link href={`/dashboard/records?patientId=${patient.patientId}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View Records
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
