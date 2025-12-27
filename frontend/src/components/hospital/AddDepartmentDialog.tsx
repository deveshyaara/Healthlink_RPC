'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { hospitalAPI } from '@/lib/api/phase1';
import { toast } from 'sonner';

interface AddDepartmentDialogProps {
    hospitalId: string;
    onSuccess?: () => void;
}

export function AddDepartmentDialog({ hospitalId, onSuccess }: AddDepartmentDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        headDoctorId: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await hospitalAPI.addDepartment(hospitalId, {
                name: formData.name,
                description: formData.description || undefined,
                headDoctorId: formData.headDoctorId || undefined,
            });

            toast.success('Department created successfully');
            setOpen(false);
            setFormData({ name: '', description: '', headDoctorId: '' });
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || 'Failed to create department');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Department
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Department</DialogTitle>
                    <DialogDescription>
                        Create a new department in your hospital
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Department Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Cardiology"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of the department"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="headDoctorId">Head Doctor ID (Optional)</Label>
                            <Input
                                id="headDoctorId"
                                placeholder="Doctor's user ID"
                                value={formData.headDoctorId}
                                onChange={(e) => setFormData({ ...formData, headDoctorId: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Department'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
