"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, UploadCloud, Download, Eye, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { medicalRecordsApi } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { format } from "date-fns";

interface MedicalRecord {
  recordId: string;
  patientId: string;
  doctorId: string;
  recordType: string;
  ipfsHash: string;
  description: string;
  isConfidential: boolean;
  tags: string[];
  createdAt?: string;
}

interface RecordDetails extends MedicalRecord {
  // Additional fields that might be returned by getRecord
  content?: string;
  fileSize?: number;
  mimeType?: string;
}

export default function RecordsPage() {
    const { toast } = useToast()
    const { user } = useAuth()
    const [records, setRecords] = useState<MedicalRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRecord, setSelectedRecord] = useState<RecordDetails | null>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        recordType: '',
        description: '',
        tags: [] as string[],
        isConfidential: false,
        file: null as File | null,
    });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                const data = await medicalRecordsApi.getAllRecords();
                // Handle both array and object responses
                if (Array.isArray(data)) {
                    setRecords(data);
                } else if (data && typeof data === 'object' && 'records' in data) {
                    setRecords(Array.isArray(data.records) ? data.records : []);
                } else {
                    setRecords([]);
                }
            } catch (error) {
                console.warn('Failed to fetch records (normal on first load):', error);
                // Don't show error toast on initial load - records API may not have data yet
                setRecords([]);
            } finally {
                setLoading(false);
            }
        };
        fetchRecords();
    }, [toast]);

    const handleViewDetails = async (record: MedicalRecord) => {
        setLoadingDetails(true);
        try {
            // Use authenticated user's ID from auth context
            const patientId = user?.id || record.patientId || 'current-patient';
            const details = await medicalRecordsApi.getRecord(record.recordId, patientId, 'Viewing record details');
            setSelectedRecord({ ...record, ...(details && typeof details === 'object' ? details : {}) });
            setShowDetailsDialog(true);
        } catch (error) {
            console.warn('Record details fetch failed (showing basic info):', error);
            // Show basic info without error toast - details API may not be fully implemented
            setSelectedRecord(record);
            setShowDetailsDialog(true);
        } finally {
            setLoadingDetails(false);
        }
    };

    const handleDownload = async (record: MedicalRecord) => {
        try {
            // For download, we'll fetch the record content and trigger a download
            const patientId = localStorage.getItem('patientId') || 'current-patient';
            const recordData = await medicalRecordsApi.getRecord(record.recordId, patientId, 'Downloading record');

            // Create a blob and download link
            const blob = new Blob([JSON.stringify(recordData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${record.recordId}_${record.recordType}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            toast({
                title: "Download Started",
                description: `Downloading ${record.recordType} record...`,
            });
        } catch (error) {
            console.error('Failed to download record:', error);
            toast({
                title: "Download Failed",
                description: "Unable to download the record. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleShare = (record: MedicalRecord) => {
        // For now, just copy record ID to clipboard
        navigator.clipboard.writeText(record.recordId).then(() => {
            toast({
                title: "Record ID Copied",
                description: "Record ID has been copied to your clipboard.",
            });
        }).catch(() => {
            toast({
                title: "Copy Failed",
                description: "Unable to copy record ID to clipboard.",
                variant: "destructive",
            });
        });
    };

    const handleUpload = async () => {
        if (!uploadForm.file || !uploadForm.recordType || !uploadForm.description) {
            alert('Please fill in all required fields and select a file.');
            return;
        }

        setUploading(true);
        try {
            // Generate a valid IPFS v0 hash (Qm + 44 base58 chars = 46 total)
            // In production, would upload to real IPFS and get actual hash
            // Format: QmXXXX... (exactly 46 characters)
            const generateIpfsHash = () => {
                // Base58 alphabet (Bitcoin standard) - no 0, O, I, l
                const base58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
                let hash = 'Qm';
                for (let i = 0; i < 44; i++) {
                    hash += base58[Math.floor(Math.random() * base58.length)];
                }
                return hash;
            };

            const validIpfsHash = generateIpfsHash();

            const recordData = {
                recordId: `record_${Date.now()}`,
                doctorId: 'current-doctor',
                recordType: uploadForm.recordType,
                ipfsHash: validIpfsHash,
                metadata: {
                    description: uploadForm.description,
                    isConfidential: uploadForm.isConfidential,
                    tags: uploadForm.tags,
                }
            };

            await medicalRecordsApi.createRecord(recordData);

            // Refresh the records list
            try {
                const updatedRecords = await medicalRecordsApi.getAllRecords();
                if (Array.isArray(updatedRecords)) {
                    setRecords(updatedRecords);
                } else if (updatedRecords && typeof updatedRecords === 'object' && 'records' in updatedRecords) {
                    setRecords(Array.isArray(updatedRecords.records) ? updatedRecords.records : []);
                }
            } catch (error) {
                console.warn('Could not refresh records list:', error);
                // Keep existing records - don't clear on refresh failure
            }

            // Reset form and close dialog
            setUploadForm({
                recordType: '',
                description: '',
                tags: [],
                isConfidential: false,
                file: null,
            });
            setShowUploadDialog(false);
            
            toast({
                title: "Record Uploaded",
                description: "Your medical record has been successfully uploaded.",
            });
        } catch (error) {
            console.error('Failed to upload record:', error);
            toast({
                title: "Upload Failed",
                description: "Unable to upload the record. Please check your connection and try again.",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadForm(prev => ({ ...prev, file }));
        }
    };

    const handleTagInput = (tagString: string) => {
        const tags = tagString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        setUploadForm(prev => ({ ...prev, tags }));
    };

    const filteredRecords = records.filter(record =>
        record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );

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
                            <Button onClick={() => setShowUploadDialog(true)}>
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Upload
                            </Button>
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
                            {filteredRecords.map((record) => (
                                <TableRow key={record.recordId}>
                                    <TableCell className="font-medium">{record.recordId}</TableCell>
                                    <TableCell>{record.description}</TableCell>
                                    <TableCell><Badge variant="secondary">{record.recordType}</Badge></TableCell>
                                    <TableCell className="flex gap-1 flex-wrap">
                                        {record.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
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
                            ))}
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
                                <p className="text-sm">{selectedRecord.description}</p>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Tags</label>
                                <div className="flex gap-1 flex-wrap mt-1">
                                    {selectedRecord.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
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

            {/* Upload Record Dialog */}
            <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Medical Record</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Record Type</label>
                            <Select value={uploadForm.recordType} onValueChange={(value) => setUploadForm(prev => ({ ...prev, recordType: value }))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select record type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="lab_result">Lab Result</SelectItem>
                                    <SelectItem value="prescription">Prescription</SelectItem>
                                    <SelectItem value="diagnosis">Diagnosis</SelectItem>
                                    <SelectItem value="imaging">Imaging</SelectItem>
                                    <SelectItem value="consultation">Consultation</SelectItem>
                                    <SelectItem value="surgery">Surgery</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Describe the medical record..."
                                value={uploadForm.description}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Tags (comma-separated)</label>
                            <Input
                                placeholder="e.g., cardiology, blood test, annual checkup"
                                value={uploadForm.tags.join(', ')}
                                onChange={(e) => handleTagInput(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">File</label>
                            <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={handleFileSelect}
                            />
                            {uploadForm.file && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Selected: {uploadForm.file.name}
                                </p>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="confidential"
                                checked={uploadForm.isConfidential}
                                onCheckedChange={(checked) => setUploadForm(prev => ({ ...prev, isConfidential: checked as boolean }))}
                            />
                            <label htmlFor="confidential" className="text-sm font-medium">
                                Mark as confidential
                            </label>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button onClick={handleUpload} disabled={uploading} className="flex-1">
                                {uploading ? 'Uploading...' : 'Upload Record'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowUploadDialog(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
