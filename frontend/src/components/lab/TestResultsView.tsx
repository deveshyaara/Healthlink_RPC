'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, TestTube } from 'lucide-react';

interface TestResultsViewProps {
  test: {
    testId: string;
    testName: string;
    testType: string;
    results?: string;
    status: string;
    performedAt?: string;
    createdAt: string;
    patient?: {
      name: string;
      email: string;
    };
    doctor?: {
      fullName: string;
      doctorSpecialization?: string;
    };
  };
}

export function TestResultsView({ test }: TestResultsViewProps) {
  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Test Info Header */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TestTube className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Test ID:</span>
            <span className="font-mono text-sm">{test.testId}</span>
          </div>
          <div>
            <p className="text-sm font-medium">Test Name:</p>
            <p className="text-lg font-semibold">{test.testName}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Type:</p>
            <Badge variant="outline">{test.testType}</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={getStatusVariant(test.status)}>
              {test.status.replace('_', ' ')}
            </Badge>
          </div>
          {test.patient && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Patient:</span>
              <span className="text-sm">{test.patient.name}</span>
            </div>
          )}
          {test.doctor && (
            <div>
              <p className="text-sm font-medium">Ordered by:</p>
              <p className="text-sm">{test.doctor.fullName}</p>
              {test.doctor.doctorSpecialization && (
                <p className="text-xs text-muted-foreground">{test.doctor.doctorSpecialization}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Ordered:</span>
          <span className="text-sm">{formatDate(test.createdAt)}</span>
        </div>
        {test.performedAt && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Performed:</span>
            <span className="text-sm">{formatDate(test.performedAt)}</span>
          </div>
        )}
      </div>

      {/* Results Section */}
      {test.results ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Test Results
            </CardTitle>
            <CardDescription>
              Results uploaded on {formatDate(test.performedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-muted p-4">
              <pre className="whitespace-pre-wrap font-mono text-sm">{test.results}</pre>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No results available yet. Results will appear here once uploaded by the lab.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
