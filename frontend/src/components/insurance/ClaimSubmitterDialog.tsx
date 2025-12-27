'use client';

import { useState, useEffect } from 'react';
import { Plus, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { insuranceAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';

interface ClaimSubmitterDialogProps {
    onSuccess?: () => void;
}

export function ClaimSubmitterDialog({ onSuccess }: ClaimSubmitterDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [policies, setPolicies] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        policyId: '',
        claimedAmount: '',
        description: '',
        supportingDocs: [] as string[],
    });

    useEffect(() => {
        if (open) {
            loadPolicies();
        }
    }, [open]);

    const loadPolicies = async () => {
        try {
            // Get patient ID from user session
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const user = JSON.parse(userStr);
                if (user.id) {
                    const response = await insuranceAPI.getPatientPolicies(user.id) as any;
                    setPolicies(response.data || []);
                }
            }
        } catch (error) {
            console.error('Failed to load policies:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await insuranceAPI.submitClaim({
                policyId: formData.policyId,
                claimedAmount: parseFloat(formData.claimedAmount),
                supportingDocs: formData.supportingDocs,
            }) as any;

            toast.success('Insurance claim submitted successfully');
            toast.success(`Claim ID: ${response.data?.claimId || 'Generated'}`);
            setOpen(false);
            setFormData({ policyId: '', claimedAmount: '', description: '', supportingDocs: [] });
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to submit claim');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        // In a real app, you would upload to IPFS/cloud storage here
        // For now, just show a placeholder
        toast.info('File upload feature coming soon (IPFS integration)');

        // Placeholder: simulate file upload
        const uploadedHashes = Array.from(files).map((file) => `ipfs://${file.name}-hash`);
        setFormData({ ...formData, supportingDocs: [...formData.supportingDocs, ...uploadedHashes] });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Submit Claim
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Submit Insurance Claim</DialogTitle>
                    <DialogDescription>
                        File a new insurance claim for treatment expenses
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="policyId">Insurance Policy *</Label>
                            <Select
                                value={formData.policyId}
                                onValueChange={(value) => setFormData({ ...formData, policyId: value })}
                                required
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select policy" />
                                </SelectTrigger>
                                <SelectContent>
                                    {policies.map((policy) => (
                                        <SelectItem key={policy.id} value={policy.id}>
                                            {policy.policyNumber} - {policy.provider?.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="claimedAmount">Claimed Amount (₹) *</Label>
                            <Input
                                id="claimedAmount"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                value={formData.claimedAmount}
                                onChange={(e) => setFormData({ ...formData, claimedAmount: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Details about the claim..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="documents">Supporting Documents</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="documents"
                                    type="file"
                                    multiple
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => document.getElementById('documents')?.click()}
                                    className="w-full"
                                >
                                    <FileUp className="mr-2 h-4 w-4" />
                                    Upload Documents
                                </Button>
                            </div>
                            {formData.supportingDocs.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    {formData.supportingDocs.length} file(s) selected
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading || !formData.policyId || !formData.claimedAmount}>
                            {loading ? 'Submitting...' : 'Submit Claim'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
