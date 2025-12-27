'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, DollarSign, FileText, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { insuranceAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';

interface ClaimReviewCardProps {
    claim: any;
    onUpdate?: () => void;
}

export function ClaimReviewCard({ claim, onUpdate }: ClaimReviewCardProps) {
    const [approveOpen, setApproveOpen] = useState(false);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [approvedAmount, setApprovedAmount] = useState(claim.claimedAmount?.toString() || '');
    const [rejectReason, setRejectReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const handleApprove = async () => {
        try {
            setProcessing(true);
            await insuranceAPI.approveClaim(claim.id, {
                approvedAmount: parseFloat(approvedAmount),
            });
            toast.success('Claim approved successfully');
            setApproveOpen(false);
            onUpdate?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve claim');
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        try {
            setProcessing(true);
            await insuranceAPI.rejectClaim(claim.id, {
                reason: rejectReason,
            });
            toast.success('Claim rejected');
            setRejectOpen(false);
            onUpdate?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject claim');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: any; label: string }> = {
            SUBMITTED: { variant: 'secondary', label: 'Submitted' },
            VERIFIED: { variant: 'default', label: 'Verified' },
            APPROVED: { variant: 'default', label: 'Approved' },
            REJECTED: { variant: 'destructive', label: 'Rejected' },
        };

        const config = statusConfig[status] || { variant: 'secondary', label: status };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const canApproveReject = claim.status === 'SUBMITTED' || claim.status === 'VERIFIED';

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="text-lg">Claim #{claim.id.slice(0, 8)}</CardTitle>
                            <p className="text-sm text-muted-foreground mt-1">
                                Policy: {claim.policy?.policyNumber || 'N/A'}
                            </p>
                        </div>
                        {getStatusBadge(claim.status)}
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Patient Info */}
                    <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Patient:</span>
                        <span>{claim.policy?.patient?.publicData?.name || 'Unknown'}</span>
                    </div>

                    {/* Claimed Amount */}
                    <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Claimed:</span>
                        <span className="text-lg font-bold">₹{claim.claimedAmount?.toLocaleString()}</span>
                    </div>

                    {/* Submitted Date */}
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Submitted:</span>
                        <span>{new Date(claim.createdAt).toLocaleDateString()}</span>
                    </div>

                    {/* Supporting Docs */}
                    {claim.supportingDocs && claim.supportingDocs.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                                <span className="font-medium">Documents:</span>
                                <p className="text-muted-foreground">{claim.supportingDocs.length} file(s)</p>
                            </div>
                        </div>
                    )}

                    {/* Approved/Rejected Amount */}
                    {claim.approvedAmount && (
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Approved:</span>
                            <span className="text-lg font-bold text-green-600">
                                ₹{claim.approvedAmount.toLocaleString()}
                            </span>
                        </div>
                    )}

                    {/* Rejection Reason */}
                    {claim.status === 'REJECTED' && claim.rejectionReason && (
                        <div className="p-3 bg-destructive/10 rounded-md text-sm">
                            <p className="font-medium text-destructive">Rejection Reason:</p>
                            <p className="text-muted-foreground mt-1">{claim.rejectionReason}</p>
                        </div>
                    )}
                </CardContent>

                {canApproveReject && (
                    <CardFooter className="flex gap-2">
                        <Button
                            onClick={() => setApproveOpen(true)}
                            className="flex-1"
                            variant="default"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                        </Button>
                        <Button
                            onClick={() => setRejectOpen(true)}
                            className="flex-1"
                            variant="destructive"
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                        </Button>
                    </CardFooter>
                )}
            </Card>

            {/* Approve Dialog */}
            <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Claim</DialogTitle>
                        <DialogDescription>
                            Review and approve the insurance claim. You can adjust the approved amount if needed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="claimed">Claimed Amount</Label>
                            <Input
                                id="claimed"
                                value={`₹${claim.claimedAmount?.toLocaleString()}`}
                                disabled
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="approved">Approved Amount *</Label>
                            <Input
                                id="approved"
                                type="number"
                                placeholder="Enter approved amount"
                                value={approvedAmount}
                                onChange={(e) => setApprovedAmount(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Can be equal to or less than claimed amount
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveOpen(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleApprove} disabled={processing || !approvedAmount}>
                            {processing ? 'Approving...' : 'Approve Claim'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Claim</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this claim.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Rejection Reason *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Enter reason for rejection..."
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={4}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={processing || !rejectReason.trim()}
                        >
                            {processing ? 'Rejecting...' : 'Reject Claim'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
