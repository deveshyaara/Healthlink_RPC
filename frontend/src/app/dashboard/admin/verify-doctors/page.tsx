'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api-client';
import { CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function VerifyDoctorsPage() {
  const [pendingDoctors, setPendingDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPendingDoctors();
  }, []);

  const loadPendingDoctors = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getUsers();

      // Filter for doctors who are not verified
      const pending = response.filter(
        (user: any) => user.role === 'doctor' && !user.isVerified
      );

      setPendingDoctors(pending);
    } catch (error: any) {
      console.error('Failed to load pending doctors:', error);
      toast.error('Failed to load pending verifications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDoctor) return;

    try {
      setIsSubmitting(true);

      await usersApi.updateUser(selectedDoctor.id, {
        isVerified: true,
        verificationNotes: comments.trim() || 'Approved by admin',
      });

      toast.success(`Doctor ${selectedDoctor.fullName} approved successfully`);
      setShowApprovalDialog(false);
      setSelectedDoctor(null);
      setComments('');
      loadPendingDoctors();
    } catch (error: any) {
      console.error('Failed to approve doctor:', error);
      toast.error(error.message || 'Failed to approve doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoctor) return;

    if (!comments.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      setIsSubmitting(true);

      await usersApi.updateUser(selectedDoctor.id, {
        isVerified: false,
        isActive: false,
        verificationNotes: comments.trim(),
      });

      toast.success(`Doctor ${selectedDoctor.fullName} rejected`);
      setShowRejectionDialog(false);
      setSelectedDoctor(null);
      setComments('');
      loadPendingDoctors();
    } catch (error: any) {
      console.error('Failed to reject doctor:', error);
      toast.error(error.message || 'Failed to reject doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Doctor Verification</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve doctor registration requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Verifications</CardTitle>
          <CardDescription>
            {pendingDoctors.length} doctor{pendingDoctors.length !== 1 ? 's' : ''} awaiting verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingDoctors.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <p className="text-muted-foreground">
                No pending doctor verifications
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Specialization</TableHead>
                  <TableHead>License Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDoctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">{doctor.fullName}</TableCell>
                    <TableCell>{doctor.email}</TableCell>
                    <TableCell>
                      {doctor.doctorSpecialization || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {doctor.doctorLicenseNumber || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Pending</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDoctor(doctor);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedDoctor(doctor);
                            setShowApprovalDialog(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedDoctor(doctor);
                            setShowRejectionDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
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

      {/* Doctor Details Dialog */}
      {selectedDoctor && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Doctor Details</DialogTitle>
              <DialogDescription>
                Review doctor information before verification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">{selectedDoctor.fullName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{selectedDoctor.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm text-muted-foreground">{selectedDoctor.phoneNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">License Number</p>
                  <p className="text-sm text-muted-foreground">{selectedDoctor.doctorLicenseNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Specialization</p>
                  <p className="text-sm text-muted-foreground">{selectedDoctor.doctorSpecialization || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Years of Experience</p>
                  <p className="text-sm text-muted-foreground">{selectedDoctor.doctorYearsOfExperience || '-'}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Approval Dialog */}
      {selectedDoctor && (
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Approve Doctor</DialogTitle>
              <DialogDescription>
                Are you sure you want to approve {selectedDoctor.fullName}?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="approval-comments">Comments (Optional)</Label>
                <Textarea
                  id="approval-comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Add any comments or notes..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowApprovalDialog(false);
                    setComments('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    'Approve Doctor'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Rejection Dialog */}
      {selectedDoctor && (
        <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Doctor</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting {selectedDoctor.fullName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
                <Textarea
                  id="rejection-reason"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain why this doctor is being rejected..."
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectionDialog(false);
                    setComments('');
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isSubmitting || !comments.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    'Reject Doctor'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
