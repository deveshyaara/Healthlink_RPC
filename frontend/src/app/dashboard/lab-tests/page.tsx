'use client';

import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { labTestsApi } from '@/lib/api-client';
import { ErrorBanner } from '@/components/ui/error-banner';
import { TestTube, PlusCircle, FileText, Search, Eye } from 'lucide-react';

interface LabTest {
  labTestId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  testType: string;
  testName: string;
  instructions: string;
  priority: 'routine' | 'urgent' | 'asap';
  status?: 'pending' | 'completed' | 'cancelled';
  results?: string;
  createdAt?: string;
}

/**
 * Lab Results Page
 * Shows laboratory test results for doctor/patient/admin
 */
export default function LabTestsPage() {
  const [labTests, setLabTests] = useState<LabTest[]>([]);
  const [filteredLabTests, setFilteredLabTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchLabTests = async () => {
      try {
        setError(null);
        const data = await labTestsApi.getAllLabTests();
        const testsList = Array.isArray(data) ? data : [];
        setLabTests(testsList);
        setFilteredLabTests(testsList);
      } catch (err) {
        console.error('Failed to fetch lab tests:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load lab tests';
        setError(errorMessage);
        setLabTests([]);
        setFilteredLabTests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLabTests();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredLabTests(labTests);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = labTests.filter(
        (test) =>
          test.labTestId.toLowerCase().includes(query) ||
                    test.patientId.toLowerCase().includes(query) ||
                    test.testName.toLowerCase().includes(query) ||
                    test.testType.toLowerCase().includes(query),
      );
      setFilteredLabTests(filtered);
    }
  }, [searchQuery, labTests]);

  const getStatusVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const getPriorityVariant = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return 'destructive';
      case 'asap': return 'destructive';
      case 'routine': return 'outline';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Laboratory Results"
          description="View and manage laboratory test orders and results"
          icon={TestTube}
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-government-blue mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading lab tests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Laboratory Results"
        description="View and manage laboratory test orders and results"
        icon={TestTube}
        actionButton={{
          label: 'Order Lab Test',
          icon: PlusCircle,
          onClick: () => {
            // TODO: Navigate to order form or open modal
            console.log('Order Lab Test clicked');
          },
        }}
      />

      {error && <ErrorBanner message={error} />}

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Test ID, Patient ID, Test Name, or Type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Lab Tests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Lab Tests</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredLabTests.length} result{filteredLabTests.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLabTests.length === 0 ? (
            <div className="text-center py-12">
              <TestTube className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                {searchQuery ? 'No lab tests match your search' : 'No lab tests found'}
              </p>
              {!searchQuery && (
                <Button
                  variant="outline"
                  onClick={() => console.log('Order first test')}
                  className="mt-4"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                                    Order First Lab Test
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test ID</TableHead>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLabTests.map((test) => (
                  <TableRow key={test.labTestId}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono text-sm">{test.labTestId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{test.patientId}</span>
                    </TableCell>
                    <TableCell className="font-medium">{test.testName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{test.testType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPriorityVariant(test.priority)}>
                        {test.priority.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(test.status)}>
                        {test.status || 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => console.log('View test:', test.labTestId)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                                                    View
                        </Button>
                        {test.results && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => console.log('Download results:', test.labTestId)}
                          >
                            <FileText className="mr-1 h-3 w-3" />
                                                        Results
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
