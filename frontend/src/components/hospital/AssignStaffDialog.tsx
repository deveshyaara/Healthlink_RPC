'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { hospitalAPI } from '@/lib/api/phase1';
import { Loader2, UserPlus } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface AssignStaffDialogProps {
    isOpen: boolean;
    onClose: () => void;
    hospitalId: string;
    departmentId: string;
    departmentName: string;
    onSuccess?: () => void;
}

export function AssignStaffDialog({
    isOpen,
    onClose,
    hospitalId,
    departmentId,
    departmentName,
    onSuccess,
}: AssignStaffDialogProps) {
    const [availableStaff, setAvailableStaff] = useState<any[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadAvailableStaff();
        }
    }, [isOpen, hospitalId]);

    const loadAvailableStaff = async () => {
        try {
            setIsLoading(true);
            // Get all hospital staff
            const response = await hospitalAPI.getStaff(hospitalId) as any;
            const staff = response.data || response;

            // Filter to show unassigned staff or doctors
            const available = staff.filter((s: any) =>
                !s.departmentId || s.role === 'doctor'
            );

            setAvailableStaff(available);
        } catch (error: any) {
            console.error('Failed to load staff:', error);
            toast.error('Failed to load available staff');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedStaffId) {
            toast.error('Please select a staff member');
            return;
        }

        try {
            setIsSubmitting(true);

            // Update staff member's department
            await hospitalAPI.assignStaffToDepartment(hospitalId, selectedStaffId, departmentId);

            toast.success('Staff member assigned successfully');
            setSelectedStaffId('');
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Failed to assign staff:', error);
            toast.error(error.message || 'Failed to assign staff member');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setSelectedStaffId('');
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Staff to {departmentName}</DialogTitle>
                    <DialogDescription>
                        Select a staff member to assign to this department
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label htmlFor="staff">Staff Member *</Label>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : availableStaff.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-4">
                                No available staff members to assign. All staff are already assigned to departments.
                            </p>
                        ) : (
                            <Select
                                value={selectedStaffId}
                                onValueChange={setSelectedStaffId}
                                disabled={isSubmitting}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a staff member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableStaff.map((staff) => (
                                        <SelectItem key={staff.id} value={staff.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{staff.fullName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {staff.role} {staff.doctorSpecialization ? `- ${staff.doctorSpecialization}` : ''}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
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
                        <Button
                            type="submit"
                            disabled={isSubmitting || !selectedStaffId || availableStaff.length === 0}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    Assign Staff
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
