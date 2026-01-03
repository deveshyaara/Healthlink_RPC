'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, FileText, TestTube, Loader2, Pill, Check, X } from 'lucide-react';

interface ActionCardProps {
    action: {
        id: string;
        type: string;
        data: any;
        description: string;
        status: 'pending' | 'executing' | 'executed' | 'failed';
        priority?: 'low' | 'medium' | 'high' | 'urgent';
    };
    onExecute: (actionId: string, actionType: string, actionData: any) => Promise<void>;
    onCancel?: (actionId: string) => void;
}

const ActionCard = ({ action, onExecute, onCancel }: ActionCardProps) => {
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<{ success: boolean; message?: string } | null>(null);

    const handleExecute = async () => {
        setIsExecuting(true);
        try {
            await onExecute(action.id, action.type, action.data);
            setExecutionResult({ success: true, message: 'Action executed successfully!' });
        } catch (error: any) {
            setExecutionResult({ success: false, message: error.message || 'Failed to execute action' });
        } finally {
            setIsExecuting(false);
        }
    };

    const getIcon = () => {
        switch (action.type) {
            case 'CREATE_PRESCRIPTION':
                return <Pill className="h-5 w-5" />;
            case 'SCHEDULE_APPOINTMENT':
                return <Calendar className="h-5 w-5" />;
            case 'ORDER_LAB_TEST':
                return <TestTube className="h-5 w-5" />;
            case 'UPDATE_MEDICAL_RECORD':
                return <FileText className="h-5 w-5" />;
            default:
                return <AlertCircle className="h-5 w-5" />;
        }
    };

    const getPriorityColor = () => {
        switch (action.priority) {
            case 'urgent':
                return 'destructive';
            case 'high':
                return 'default';
            case 'medium':
                return 'secondary';
            case 'low':
                return 'outline';
            default:
                return 'secondary';
        }
    };

    const getActionTitle = () => {
        switch (action.type) {
            case 'CREATE_PRESCRIPTION':
                return '💊 Create Prescription';
            case 'SCHEDULE_APPOINTMENT':
                return '📅 Schedule Appointment';
            case 'ORDER_LAB_TEST':
                return '🔬 Order Lab Test';
            case 'UPDATE_MEDICAL_RECORD':
                return '📋 Update Medical Record';
            default:
                return 'Action';
        }
    };

    const renderActionDetails = () => {
        const { data } = action;

        switch (action.type) {
            case 'CREATE_PRESCRIPTION':
                return (
                    <div className="space-y-2 text-sm">
                        <div><strong>Patient:</strong> {data.patientName}</div>
                        <div><strong>Medication:</strong> {data.medication}</div>
                        <div><strong>Dosage:</strong> {data.dosage}</div>
                        <div><strong>Instructions:</strong> {data.instructions}</div>
                        {data.expiryDate && <div><strong>Expiry:</strong> {new Date(data.expiryDate).toLocaleDateString()}</div>}
                    </div>
                );

            case 'SCHEDULE_APPOINTMENT':
                return (
                    <div className="space-y-2 text-sm">
                        <div><strong>Patient:</strong> {data.patientName}</div>
                        <div><strong>Title:</strong> {data.title}</div>
                        {data.description && <div><strong>Description:</strong> {data.description}</div>}
                        <div><strong>Date/Time:</strong> {new Date(data.scheduledAt).toLocaleString()}</div>
                        {data.location && <div><strong>Location:</strong> {data.location}</div>}
                    </div>
                );

            case 'ORDER_LAB_TEST':
                return (
                    <div className="space-y-2 text-sm">
                        <div><strong>Patient:</strong> {data.patientName}</div>
                        <div><strong>Test Name:</strong> {data.testName}</div>
                        <div><strong>Test Type:</strong> {data.testType}</div>
                    </div>
                );

            case 'UPDATE_MEDICAL_RECORD':
                return (
                    <div className="space-y-2 text-sm">
                        <div><strong>Patient:</strong> {data.patientName}</div>
                        <div><strong>Title:</strong> {data.title}</div>
                        <div><strong>Description:</strong> {data.description}</div>
                        {data.recordType && <div><strong>Type:</strong> {data.recordType}</div>}
                    </div>
                );

            default:
                return <div className="text-sm">No details available</div>;
        }
    };

    // If action is already executed or failed, show result
    if (executionResult) {
        return (
            <Card className={executionResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        {executionResult.success ? (
                            <Check className="h-5 w-5 text-green-600" />
                        ) : (
                            <X className="h-5 w-5 text-red-600" />
                        )}
                        <CardTitle className="text-base">
                            {executionResult.success ? 'Action Executed' : 'Execution Failed'}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">{executionResult.message || action.description}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className="text-primary">{getIcon()}</div>
                        <CardTitle className="text-base">{getActionTitle()}</CardTitle>
                    </div>
                    {action.priority && (
                        <Badge variant={getPriorityColor() as any} className="ml-2">
                            {action.priority}
                        </Badge>
                    )}
                </div>
                <CardDescription className="mt-1">{action.description}</CardDescription>
            </CardHeader>

            <CardContent>{renderActionDetails()}</CardContent>

            <CardFooter className="flex gap-2">
                <Button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="flex-1"
                    size="sm"
                >
                    {isExecuting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                        </>
                    ) : (
                        'Execute'
                    )}
                </Button>
                {onCancel && (
                    <Button
                        onClick={() => onCancel(action.id)}
                        variant="outline"
                        size="sm"
                        disabled={isExecuting}
                    >
                        Cancel
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
};

export default ActionCard;
