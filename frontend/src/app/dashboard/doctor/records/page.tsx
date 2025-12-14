'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ActionModal } from '@/components/ui/action-modal';
import { UploadRecordForm } from '@/components/forms/upload-record-form';
import { useState, useEffect } from 'react';
import { medicalRecordsApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { ErrorBanner } from '@/components/ui/error-banner';
import { FileText, Search, Eye, Download, Filter, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequireDoctor } from '@/components/auth/RequireRole';

interface MedicalRecord {
  recordId: string;
  patientId: string;
  patientName?: string;
  recordType: string;
  description?: string;
  createdAt?: string;
  doctorId?: string;
  doctorName?: string;
  ipfsHash?: string;
}

/**
 * Doctor: Medical Records Page (Global Search)
 * Shows all medical records across all patients with search/filter capabilities
 */
export default function DoctorRecordsPage() {
  return (
    <RequireDoctor>
      <DoctorRecordsPageContent />
    </RequireDoctor>
  );
}

function DoctorRecordsPageContent() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('all');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const fetchRecords = async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await medicalRecordsApi.getAll();
      const recordsList = Array.isArray(data) ? data : [];
      setRecords(recordsList);
      setFilteredRecords(recordsList);
    } catch (err) {
      console.error('Failed to fetch medical records:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load medical records';
      setError(errorMessage);
      setRecords([]);
      setFilteredRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    let filtered = records;

    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (record) =>
          record.recordId.toLowerCase().includes(query) ||
          record.patientId.toLowerCase().includes(query) ||
          record.patientName?.toLowerCase().includes(query) ||
          record.recordType?.toLowerCase().includes(query) ||
          record.description?.toLowerCase().includes(query),
      );
    }

    // Apply record type filter
    if (recordTypeFilter !== 'all') {
      filtered = filtered.filter((record) => record.recordType === recordTypeFilter);
    }

    setFilteredRecords(filtered);
  }, [searchQuery, recordTypeFilter, records]);

  const recordTypes = Array.from(new Set(records.map((r) => r.recordType).filter(Boolean)));

  const handleDownloadFile = async (hash: string, recordId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        return;
      }

      const response = await fetch(`http://localhost:3000/api/storage/${hash}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {throw new Error('Download failed');}

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = recordId;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Medical Records"
          description="Loading patient records..."
          icon={FileText}
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
        title="Patient Health Records"
        description="Search and manage medical records across all your patients"
        icon={FileText}
        actionButton={{
          label: 'Upload Record',
          icon: Upload,
          onClick: () => setShowUploadDialog(true),
        }}
      />

      {error && (
        <ErrorBanner
          title="Failed to Load Records"
          message={error}
          onRetry={fetchRecords}
        />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>All Medical Records ({filteredRecords.length})</CardTitle>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 w-full max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search records, patients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Select value={recordTypeFilter} onValueChange={setRecordTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Record Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {recordTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!error && filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || recordTypeFilter !== 'all'
                  ? 'No records found'
                  : 'No medical records yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || recordTypeFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Medical records will appear here once uploaded'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Record ID</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.recordId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {record.recordId}
                      </div>
                    </TableCell>
                    <TableCell>{record.patientId}</TableCell>
                    <TableCell>{record.patientName || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.recordType}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {record.description || '—'}
                    </TableCell>
                    <TableCell>
                      {record.createdAt
                        ? new Date(record.createdAt).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        {record.ipfsHash && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFile(record.ipfsHash!, record.recordId)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Record Modal */}
      <ActionModal
        title="Upload Patient Record"
        description="Upload a medical record for one of your patients"
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        isSubmitting={isSubmittingForm}
        maxWidth="lg"
      >
        <UploadRecordForm
          patientId={user?.id || ''}
          onSuccess={() => {
            setShowUploadDialog(false);
            fetchRecords();
          }}
          onCancel={() => setShowUploadDialog(false)}
          onSubmitting={setIsSubmittingForm}
        />
      </ActionModal>
    </div>
  );
}
