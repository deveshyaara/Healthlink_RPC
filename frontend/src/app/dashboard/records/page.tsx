 'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ActionModal } from '@/components/ui/action-modal';
import { UploadRecordForm } from '@/components/forms/upload-record-form';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, Search, UploadCloud, Download, Eye, Share2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { medicalRecordsApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { authUtils } from '@/lib/auth-utils';

interface MedicalRecord {
  recordId: string;
  patientId: string;
  doctorId: string;
  recordType: string;
  ipfsHash: string;
  description?: string;  // Optional - might not be present
  isConfidential?: boolean;
  tags?: string[];  // Optional - might not be present
  createdAt?: string;
}

interface RecordDetails extends MedicalRecord {
  // Additional fields that might be returned by getRecord
  content?: string;
  fileSize?: number;
  mimeType?: string;
}

export default function RecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<RecordDetails | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const searchParams = useSearchParams();

  // Check if user can upload records (patients can upload their own records)
  const canUploadRecords = user?.role === 'patient' || user?.role === 'doctor' || user?.role === 'admin';

  // Fetch records function that can be called for refresh
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const patientEmailParam = searchParams?.get('patientEmail');

      // If a patientEmail query param is present, fetch records for that patient (fallback to patientId when email absent)
      if (patientEmailParam) {
        const lookup = decodeURIComponent(patientEmailParam);
        const response = await medicalRecordsApi.getByPatient(lookup);
        // Normalize response to array
        let recordsData: MedicalRecord[] = [];
        if (Array.isArray(response)) {
          recordsData = response;
        } else if (response && typeof response === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recordsData = Array.isArray((response as any).data) ? (response as any).data : (Array.isArray((response as any).records) ? (response as any).records : []);
        }
        setRecords(recordsData);
      } else {
        const response = await medicalRecordsApi.getAll();

        // Handle different response formats
        let recordsData: MedicalRecord[] = [];

        if (Array.isArray(response)) {
          recordsData = response;
        } else if (response && typeof response === 'object') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ('data' in response && Array.isArray((response as any).data)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recordsData = (response as any).data;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } else if ('records' in response && Array.isArray((response as any).records)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recordsData = (response as any).records;
          }
        }

        setRecords(recordsData);
      }
    } catch {
      toast.error('Failed to Load Records', {
        description: 'Unable to connect to the server. Please check your connection.',
      });
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
    // Re-run when query params change
  }, [searchParams]);

  const handleViewDetails = async (record: MedicalRecord) => {
    setLoadingDetails(true);
    try {
      const details = await medicalRecordsApi.getRecord(record.recordId, 'Viewing record details');
      setSelectedRecord({ ...record, ...(details && typeof details === 'object' ? details : {}) });
      setShowDetailsDialog(true);
    } catch {
      // Show basic info if details fetch fails
      setSelectedRecord(record);
      setShowDetailsDialog(true);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDownload = async (record: MedicalRecord) => {
    try {
      // Check if record has ipfsHash (which is now our storage hash)
      if (!record.ipfsHash) {
        toast.error('Download Failed', {
          description: 'This record has no associated file.',
        });
        return;
      }

      // Get auth token
      const token = authUtils.getToken();
      if (!token) {
        toast.error('Authentication Required', {
          description: 'Please login to download files.',
        });
        return;
      }

      // Construct API URL for storage endpoint
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const downloadUrl = `${apiBaseUrl}/api/storage/${record.ipfsHash}`;

      // Fetch file from storage API
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${response.statusText} - ${errorText}`);
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${record.recordId}_${record.recordType}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download Started', {
        description: `Downloading ${filename}...`,
      });
    } catch (error) {
      console.error('Failed to download record:', error);
      toast.error('Download Failed', {
        description: error instanceof Error ? error.message : 'Unable to download the file. Please try again.',
      });
    }
  };

  const handleShare = (record: MedicalRecord) => {
    // For now, just copy record ID to clipboard
    navigator.clipboard.writeText(record.recordId).then(() => {
      toast.success('Record ID Copied', {
        description: 'Record ID has been copied to your clipboard.',
      });
    }).catch(() => {
      toast.error('Copy Failed', {
        description: 'Unable to copy record ID to clipboard.',
      });
    });
  };

  const handleUploadSuccess = async () => {
    // Close modal
    setShowUploadDialog(false);

    // Show success message
    toast.success('Record Uploaded Successfully', {
      description: 'Your health record has been added to the blockchain.',
    });

    // Refresh the records list
    await fetchRecords();
  };

  // Removed unused _handleFileSelect function

  const filteredRecords = records.filter(record => {
    if (!searchTerm) {return true;}

    const searchLower = searchTerm.toLowerCase();
    const descriptionMatch = record.description?.toLowerCase().includes(searchLower) || false;
    const tagsMatch = record.tags?.some(tag => tag.toLowerCase().includes(searchLower)) || false;
    const recordTypeMatch = record.recordType?.toLowerCase().includes(searchLower) || false;
    const recordIdMatch = record.recordId?.toLowerCase().includes(searchLower) || false;

    return descriptionMatch || tagsMatch || recordTypeMatch || recordIdMatch;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Health Records</CardTitle>
          <p className="text-muted-foreground">Loading your medical documents...</p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline text-2xl">Health Records</CardTitle>
              <p className="text-muted-foreground">Manage and view your medical documents.</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {canUploadRecords && user?.id ? (
                <Button onClick={() => setShowUploadDialog(true)}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                                    Upload
                </Button>
              ) : (
                <Button disabled title={`You must be logged in to upload records (Current role: ${user?.role || 'unknown'})`}>
                  <UploadCloud className="mr-2 h-4 w-4" />
                                    Upload
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record ID</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Date</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      <p className="text-muted-foreground">Loading your health records...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex flex-col items-center justify-center">
                      <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Records Found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm
                          ? `No records match "${searchTerm}". Try a different search term.`
                          : 'You haven\'t uploaded any health records yet. Start by uploading your first record.'}
                      </p>
                      {canUploadRecords && !searchTerm && (
                        <Button onClick={() => setShowUploadDialog(true)}>
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Upload Your First Record
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                <TableRow key={record.recordId}>
                  <TableCell className="font-medium">{record.recordId}</TableCell>
                  <TableCell>{record.description || 'No description'}</TableCell>
                  <TableCell><Badge variant="secondary">{record.recordType}</Badge></TableCell>
                  <TableCell className="flex gap-1 flex-wrap">
                    {record.tags?.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>) || <span className="text-muted-foreground text-sm">No tags</span>}
                  </TableCell>
                  <TableCell>{record.createdAt ? format(new Date(record.createdAt), 'MMM dd, yyyy') : 'N/A'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDetails(record)}>
                          <Eye className="mr-2 h-4 w-4" />
                                                    View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(record)}>
                          <Download className="mr-2 h-4 w-4" />
                                                    Download
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare(record)}>
                          <Share2 className="mr-2 h-4 w-4" />
                                                    Share
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Record Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Medical Record Details</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p>Loading record details...</p>
              </div>
            </div>
          ) : selectedRecord ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Record ID</label>
                  <p className="text-sm font-mono">{selectedRecord.recordId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Record Type</label>
                  <p><Badge variant="secondary">{selectedRecord.recordType}</Badge></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Patient ID</label>
                  <p className="text-sm font-mono">{selectedRecord.patientId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Doctor ID</label>
                  <p className="text-sm font-mono">{selectedRecord.doctorId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                  <p>{selectedRecord.createdAt ? format(new Date(selectedRecord.createdAt), 'PPP') : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Confidential</label>
                  <p>{selectedRecord.isConfidential ? 'Yes' : 'No'}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <p className="text-sm">{selectedRecord.description || 'No description provided'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                <div className="flex gap-1 flex-wrap mt-1">
                  {selectedRecord.tags && selectedRecord.tags.length > 0
                    ? selectedRecord.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)
                    : <span className="text-muted-foreground text-sm">No tags</span>
                  }
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">IPFS Hash</label>
                <p className="text-sm font-mono break-all">{selectedRecord.ipfsHash}</p>
              </div>

              {selectedRecord.content && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Content</label>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-32">
                    {typeof selectedRecord.content === 'string' ? selectedRecord.content : JSON.stringify(selectedRecord.content, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleDownload(selectedRecord)} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                                    Download
                </Button>
                <Button onClick={() => handleShare(selectedRecord)} variant="outline">
                  <Share2 className="mr-2 h-4 w-4" />
                                    Share
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Upload Record Modal - New Form System */}
      <ActionModal
        title="Upload Health Record"
        description="Upload a new medical document to your health records"
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        isSubmitting={isSubmittingForm}
        maxWidth="lg"
      >
        <UploadRecordForm
          patientEmail={(user as any)?.email || ''}
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUploadDialog(false)}
          onSubmitting={setIsSubmittingForm}
        />
      </ActionModal>
    </>
  );
}
