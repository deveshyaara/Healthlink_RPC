'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { hospitalAPI } from '@/lib/api/phase1';
import { Loader2, Save, Trash2 } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface EditDepartmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    hospitalId: string;
    department: {
        id: string;
        name: string;
        description?: string;
    };
    onSuccess?: () => void;
}

export function EditDepartmentDialog({
    isOpen,
    onClose,
    hospitalId,
    department,
    onSuccess,
}: EditDepartmentDialogProps) {
    const [name, setName] = useState(department.name);
    const [description, setDescription] = useState(department.description || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            toast.error('Department name is required');
            return;
        }

        try {
            setIsSubmitting(true);

            await hospitalAPI.updateDepartment(hospitalId, department.id, {
                name: name.trim(),
                description: description.trim() || null,
            });

            toast.success('Department updated successfully');
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Failed to update department:', error);
            toast.error(error.message || 'Failed to update department');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            setIsDeleting(true);

            await hospitalAPI.deleteDepartment(hospitalId, department.id);

            toast.success('Department deleted successfully');
            setShowDeleteDialog(false);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Failed to delete department:', error);
            toast.error(error.message || 'Failed to delete department');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting && !isDeleting) {
            setName(department.name);
            setDescription(department.description || '');
            onClose();
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Department</DialogTitle>
                        <DialogDescription>
                            Update department information or delete the department
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Department Name *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Cardiology"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief description of the department..."
                                rows={3}
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="flex justify-between gap-3 pt-4">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                                disabled={isSubmitting || isDeleting}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>

                            <div className="flex gap-3">
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
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Department</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the <strong>{department.name}</strong> department?
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Department'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
