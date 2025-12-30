'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { labApi } from '@/lib/api/lab';
import { Loader2, Upload } from 'lucide-react';

interface UploadResultsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    labId: string;
    testId: string;
    testName: string;
    patientName: string;
    onSuccess?: () => void;
}

export function UploadResultsDialog({
    isOpen,
    onClose,
    labId,
    testId,
    testName,
    patientName,
    onSuccess,
}: UploadResultsDialogProps) {
    const [results, setResults] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!results.trim()) {
            toast.error('Please enter test results');
            return;
        }

        try {
            setIsSubmitting(true);

            await labApi.uploadResults(labId, testId, {
                results: results.trim(),
                notes: notes.trim() || undefined,
            });

            toast.success('Test results uploaded successfully');
            setResults('');
            setNotes('');
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Failed to upload results:', error);
            toast.error(error.message || 'Failed to upload test results');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setResults('');
            setNotes('');
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Upload Test Results</DialogTitle>
                    <DialogDescription>
                        Upload results for <strong>{testName}</strong> - Patient: <strong>{patientName}</strong>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="results">Test Results *</Label>
                        <Textarea
                            id="results"
                            value={results}
                            onChange={(e) => setResults(e.target.value)}
                            placeholder="Enter detailed test results..."
                            rows={12}
                            className="font-mono text-sm"
                            required
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                            Include all relevant measurements, values, and observations
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Additional Notes (Optional)</Label>
                        <Textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any additional notes or observations..."
                            rows={4}
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Results
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
