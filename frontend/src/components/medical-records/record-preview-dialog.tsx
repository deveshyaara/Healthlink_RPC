'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface MedicalRecord {
    recordId: string;
    patientId: string;
    fileType: string;
    fileName: string;
    fileUrl?: string;
    ipfsHash?: string;
    uploadedAt: string;
}

interface RecordPreviewDialogProps {
    record: MedicalRecord | null;
    open: boolean;
    onClose: () => void;
}

export function RecordPreviewDialog({ record, open, onClose }: RecordPreviewDialogProps) {
    const [loading, setLoading] = useState(false);

    if (!record) return null;

    const isImage = record.fileType?.toLowerCase().includes('image') ||
        record.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPDF = record.fileType?.toLowerCase().includes('pdf') ||
        record.fileName?.endsWith('.pdf');

    const handleDownload = async () => {
        setLoading(true);
        try {
            // If we have a direct URL, use it
            if (record.fileUrl) {
                window.open(record.fileUrl, '_blank');
            } else if (record.ipfsHash) {
                // Construct IPFS URL
                window.open(`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`, '_blank');
            }
        } catch (error) {
            console.error('Download failed:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            {record.fileName || 'Medical Record'}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownload}
                                disabled={loading}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                            </Button>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-4 overflow-auto max-h-[calc(90vh-120px)]">
                    {isImage && (record.fileUrl || record.ipfsHash) && (
                        <img
                            src={record.fileUrl || `https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
                            alt={record.fileName}
                            className="w-full h-auto rounded-lg"
                        />
                    )}

                    {isPDF && (record.fileUrl || record.ipfsHash) && (
                        <iframe
                            src={record.fileUrl || `https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
                            className="w-full h-[600px] rounded-lg border"
                            title={record.fileName}
                        />
                    )}

                    {!isImage && !isPDF && (
                        <div className="text-center py-12">
                            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground mb-4">
                                Preview not available for this file type
                            </p>
                            <Button onClick={handleDownload} disabled={loading}>
                                <Download className="h-4 w-4 mr-2" />
                                Download to View
                            </Button>
                        </div>
                    )}

                    {/* Record Metadata */}
                    <div className="mt-6 p-4 bg-muted rounded-lg space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-muted-foreground">Record ID</p>
                                <p className="font-mono">{record.recordId}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">File Type</p>
                                <p>{record.fileType || 'Unknown'}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Upload Date</p>
                                <p>{new Date(record.uploadedAt).toLocaleDateString()}</p>
                            </div>
                            {record.ipfsHash && (
                                <div>
                                    <p className="text-muted-foreground">IPFS Hash</p>
                                    <p className="font-mono text-xs truncate">{record.ipfsHash}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Preview button component for use in tables/lists
interface PreviewButtonProps {
    record: MedicalRecord;
    onPreview: (record: MedicalRecord) => void;
}

export function PreviewButton({ record, onPreview }: PreviewButtonProps) {
    return (
        <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(record)}
            className="gap-2"
        >
            <Eye className="h-4 w-4" />
            Preview
        </Button>
    );
}
