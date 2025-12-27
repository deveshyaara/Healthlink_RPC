'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { labTestsApi } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

interface OrderLabTestFormProps {
    patientEmail?: string;
    onSuccess?: () => void;
    onSubmitting?: (isSubmitting: boolean) => void;
}

const TEST_TYPES = [
    'Blood Test',
    'Urine Test',
    'X-Ray',
    'MRI',
    'CT Scan',
    'Ultrasound',
    'ECG',
    'Biopsy',
    'Culture Test',
    'Genetic Test',
    'Other',
];

export function OrderLabTestForm({
    patientEmail: initialPatientEmail,
    onSuccess,
    onSubmitting,
}: OrderLabTestFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        patientEmail: initialPatientEmail || '',
        testType: '',
        testName: '',
        priority: 'routine' as 'routine' | 'urgent' | 'asap',
        instructions: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.patientEmail || !formData.testType || !formData.testName) {
            toast.error('Validation Error', {
                description: 'Please fill in all required fields',
            });
            return;
        }

        try {
            setLoading(true);
            onSubmitting?.(true);

            await labTestsApi.create({
                patientEmail: formData.patientEmail,
                testType: formData.testType,
                testName: formData.testName,
                priority: formData.priority,
                instructions: formData.instructions,
            });

            toast.success('Lab Test Ordered', {
                description: `${formData.testName} has been ordered successfully`,
            });

            // Reset form
            setFormData({
                patientEmail: initialPatientEmail || '',
                testType: '',
                testName: '',
                priority: 'routine',
                instructions: '',
            });

            onSuccess?.();
        } catch (error) {
            console.error('Failed to order lab test:', error);
            toast.error('Failed to Order Lab Test', {
                description: error instanceof Error ? error.message : 'An error occurred',
            });
        } finally {
            setLoading(false);
            onSubmitting?.(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Patient Email */}
            {!initialPatientEmail && (
                <div className="space-y-2">
                    <Label htmlFor="patientEmail">
                        Patient Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="patientEmail"
                        type="email"
                        value={formData.patientEmail}
                        onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                        placeholder="patient@example.com"
                        required
                        disabled={loading}
                    />
                </div>
            )}

            {/* Test Type */}
            <div className="space-y-2">
                <Label htmlFor="testType">
                    Test Type <span className="text-destructive">*</span>
                </Label>
                <Select
                    value={formData.testType}
                    onValueChange={(value) => setFormData({ ...formData, testType: value })}
                    disabled={loading}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select test type" />
                    </SelectTrigger>
                    <SelectContent>
                        {TEST_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                                {type}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Test Name */}
            <div className="space-y-2">
                <Label htmlFor="testName">
                    Test Name <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="testName"
                    value={formData.testName}
                    onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                    placeholder="e.g., Complete Blood Count (CBC)"
                    required
                    disabled={loading}
                />
            </div>

            {/* Priority */}
            <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                    value={formData.priority}
                    onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
                    disabled={loading}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="routine">Routine</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="asap">ASAP</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
                <Label htmlFor="instructions">Special Instructions</Label>
                <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    placeholder="Any special instructions or notes..."
                    rows={3}
                    disabled={loading}
                />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Ordering...' : 'Order Lab Test'}
                </Button>
            </div>
        </form>
    );
}
