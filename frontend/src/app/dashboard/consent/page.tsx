'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MoreHorizontal, PlusCircle, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { consentsApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Consent {
  consentId: string;
  patientId: string;
  granteeId: string;
  scope: string;
  purpose: string;
  validUntil: string;
  status?: string;
  createdAt?: string;
}

const statusVariant: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  'Active': 'default',
  'active': 'default',
  'Pending': 'secondary',
  'pending': 'secondary',
  'Expired': 'outline',
  'expired': 'outline',
  'Revoked': 'destructive',
  'revoked': 'destructive',
};

export default function ConsentPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchConsents = async () => {
    try {
      setError(null);
      const data = await consentsApi.getAllConsents();

      // Handle both array and object responses
      if (Array.isArray(data)) {
        setConsents(data);
      } else if (data && typeof data === 'object' && 'results' in data) {
        // Handle paginated response
        setConsents(Array.isArray(data.results) ? data.results : []);
      } else {
        // Empty or unexpected format
        setConsents([]);
      }
    } catch (error) {
      console.error('Failed to fetch consents:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load consents';

      // Don't treat 404 as an error - it means no consents exist
      if (errorMessage.includes('404')) {
        setConsents([]);
        setError(null);
      } else {
        setError(errorMessage);
        setConsents([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsents();
  }, []);

  const handleRevokeConsent = async (consentId: string) => {
    if (!confirm('Are you sure you want to revoke this consent?')) {return;}

    try {
      await consentsApi.revokeConsent(consentId, { reason: 'Revoked by user' });
      // Refresh the consents list
      await fetchConsents();
    } catch (error) {
      console.error('Failed to revoke consent:', error);
      alert('Failed to revoke consent. Please try again.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Consent Management</CardTitle>
          <p className="text-muted-foreground">Loading your consents...</p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">Consent Management</CardTitle>
            <p className="text-muted-foreground">Control who has access to your records.</p>
          </div>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
                        Grant Consent
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && consents.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No consents yet</h3>
            <p className="text-muted-foreground mb-6">
                            You haven't granted access to your medical records yet.
                            Click the button above to grant consent to healthcare providers.
            </p>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
                            Grant Your First Consent
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Consent ID</TableHead>
                <TableHead>Granted To</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires On</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consents.map((consent) => (
                <TableRow key={consent.consentId}>
                  <TableCell className="font-medium">{consent.consentId}</TableCell>
                  <TableCell>{consent.granteeId}</TableCell>
                  <TableCell>{consent.scope}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[consent.status || 'active'] || 'secondary'}>
                      {consent.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(consent.validUntil).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        {(consent.status !== 'Revoked' && consent.status !== 'revoked' && consent.status !== 'Expired' && consent.status !== 'expired') && (
                          <DropdownMenuItem
                            onClick={() => handleRevokeConsent(consent.consentId)}
                            className="text-destructive"
                          >
                                                        Revoke Access
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-muted-foreground">Archive</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
