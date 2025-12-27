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
import { consentsApi } from '@/lib/api-client';
import { Loader2, Calendar } from 'lucide-react';

interface GrantConsentFormProps {
    onSuccess?: () => void;
    onSubmitting?: (isSubmitting: boolean) => void;
}

const COMMON_SCOPES = [
    'Full Medical Records',
    'Lab Results Only',
    'Prescriptions Only',
    'Appointments Only',
    'Emergency Access',
    'Custom',
];

const DURATION_OPTIONS = [
    { label: '1 Month', days: 30 },
    { label: '3 Months', days: 90 },
    { label: '6 Months', days: 180 },
    { label: '1 Year', days: 365 },
    { label: 'Custom', days: 0 },
];

export function GrantConsentForm({
    onSuccess,
    onSubmitting,
}: GrantConsentFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        granteeEmail: '',
        scope: '',
        purpose: '',
        duration: '90',
        customDate: '',
    });

    const calculateValidUntil = () => {
        if (formData.duration === 'custom' && formData.customDate) {
            return formData.customDate;
        }
        const days = parseInt(formData.duration);
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.granteeEmail || !formData.scope || !formData.purpose) {
            toast.error('Validation Error', {
                description: 'Please fill in all required fields',
            });
            return;
        }

        try {
            setLoading(true);
            onSubmitting?.(true);

            const validUntil = calculateValidUntil();

            await consentsApi.grant({
                granteeEmail: formData.granteeEmail,
                scope: formData.scope,
                purpose: formData.purpose,
                validUntil,
            });

            toast.success('Consent Granted', {
                description: `Access granted to ${formData.granteeEmail}`,
            });

            // Reset form
            setFormData({
                granteeEmail: '',
                scope: '',
                purpose: '',
                duration: '90',
                customDate: '',
            });

            onSuccess?.();
        } catch (error) {
            console.error('Failed to grant consent:', error);
            toast.error('Failed to Grant Consent', {
                description: error instanceof Error ? error.message : 'An error occurred',
            });
        } finally {
            setLoading(false);
            onSubmitting?.(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Grantee Email */}
            <div className="space-y-2">
                <Label htmlFor="granteeEmail">
                    Healthcare Provider Email <span className="text-destructive">*</span>
                </Label>
                <Input
                    id="granteeEmail"
                    type="email"
                    value={formData.granteeEmail}
                    onChange={(e) => setFormData({ ...formData, granteeEmail: e.target.value })}
                    placeholder="doctor@hospital.com"
                    required
                    disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                    Enter the email of the doctor or healthcare provider you want to grant access to
                </p>
            </div>

            {/* Scope */}
            <div className="space-y-2">
                <Label htmlFor="scope">
                    Access Scope <span className="text-destructive">*</span>
                </Label>
                <Select
                    value={formData.scope}
                    onValueChange={(value) => setFormData({ ...formData, scope: value })}
                    disabled={loading}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select what they can access" />
                    </SelectTrigger>
                    <SelectContent>
                        {COMMON_SCOPES.map((scope) => (
                            <SelectItem key={scope} value={scope}>
                                {scope}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
                <Label htmlFor="purpose">
                    Purpose <span className="text-destructive">*</span>
                </Label>
                <Textarea
                    id="purpose"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="e.g., Consultation for ongoing treatment, Second opinion, Emergency care..."
                    rows={3}
                    required
                    disabled={loading}
                />
            </div>

            {/* Duration */}
            <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select
                    value={formData.duration}
                    onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    disabled={loading}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DURATION_OPTIONS.map((option) => (
                            <SelectItem key={option.label} value={option.days.toString()}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Custom Date */}
            {formData.duration === '0' && (
                <div className="space-y-2">
                    <Label htmlFor="customDate">
                        Custom Expiry Date <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="customDate"
                            type="date"
                            value={formData.customDate}
                            onChange={(e) => setFormData({ ...formData, customDate: e.target.value })}
                            className="pl-10"
                            min={new Date().toISOString().split('T')[0]}
                            required
                            disabled={loading}
                        />
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium mb-1">📋 What this means:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>The provider will have access to the specified records</li>
                    <li>You can revoke access at any time</li>
                    <li>Access automatically expires on the set date</li>
                    <li>All access is logged and auditable</li>
                </ul>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? 'Granting Access...' : 'Grant Consent'}
                </Button>
            </div>
        </form>
    );
}
