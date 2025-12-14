/* eslint-disable no-console */
/**
 * RoleDebugger Component
 *
 * Temporary diagnostic component for debugging RBAC issues
 * Place this on the login screen or dashboard to debug role checking
 *
 * Features:
 * - Displays connected wallet address
 * - Shows raw bytes32 role hashes from contract
 * - Decodes and displays human-readable role names
 * - Compares contract roles with known hashes
 * - Shows all roles the user has
 *
 * Usage:
 * ```tsx
 * import { RoleDebugger } from '@/components/debug/RoleDebugger';
 *
 * function MyPage() {
 *   return (
 *     <>
 *       {process.env.NODE_ENV === 'development' && <RoleDebugger />}
 *       // ... rest of page
 *     </>
 *   );
 * }
 * ```
 */

'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Copy, Bug } from 'lucide-react';
import { ROLE_HASHES, formatRoleForDisplay } from '@/lib/roleHelpers';
import { useAuth } from '@/contexts/auth-context';

interface RoleCheckResult {
  roleName: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  roleHash: string;
  hasRole: boolean;
}

export function RoleDebugger() {
  const { user } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [roleChecks, setRoleChecks] = useState<RoleCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const checkRoles = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('MetaMask not found. Please install MetaMask.');
      }

      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const walletAddress = await signer.getAddress();
      setAddress(walletAddress);

      // Load contract ABI
      const contractResponse = await fetch('/contracts/HealthLink.json');
      if (!contractResponse.ok) {
        throw new Error('Failed to load contract ABI');
      }
      const contractData = await contractResponse.json();

      // Get contract address
      const healthlinkAddress = process.env.NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS;
      if (!healthlinkAddress) {
        throw new Error('NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS not set');
      }
      setContractAddress(healthlinkAddress);

      // Initialize contract
      const contract = new ethers.Contract(
        healthlinkAddress,
        contractData.abi,
        signer
      );

      // Check all roles
      const results: RoleCheckResult[] = [];

      for (const [roleName, roleHash] of Object.entries(ROLE_HASHES)) {
        try {
          console.log(`🔍 Checking ${roleName} role...`);
          console.log(`   Hash: ${roleHash}`);
          console.log(`   Address: ${walletAddress}`);

          const hasRole = await contract.hasRole(roleHash, walletAddress);

          console.log(`   Result: ${hasRole ? '✅ HAS ROLE' : '❌ NO ROLE'}`);

          results.push({
            roleName: roleName as 'ADMIN' | 'DOCTOR' | 'PATIENT',
            roleHash: roleHash,
            hasRole: Boolean(hasRole),
          });
        } catch (err) {
          console.error(`Failed to check ${roleName}:`, err);
          results.push({
            roleName: roleName as 'ADMIN' | 'DOCTOR' | 'PATIENT',
            roleHash: roleHash,
            hasRole: false,
          });
        }
      }

      setRoleChecks(results);

      // Log summary
      console.log('\n╔════════════════════════════════════════════════════════════════════╗');
      console.log('║                      ROLE CHECK SUMMARY                            ║');
      console.log('╠════════════════════════════════════════════════════════════════════╣');
      console.log(`║ Address: ${walletAddress}    ║`);
      console.log(`║ Contract: ${healthlinkAddress}   ║`);
      console.log('╠════════════════════════════════════════════════════════════════════╣');
      results.forEach(r => {
        const status = r.hasRole ? '✅ YES' : '❌ NO ';
        console.log(`║ ${r.roleName.padEnd(10)} ${status}                                          ║`);
      });
      console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    } catch (err) {
      console.error('❌ Role check failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkRoles();
    }
  }, [user]);

  if (!user) {
    return (
      <Card className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Role Debugger
          </CardTitle>
          <CardDescription>Not authenticated. Please sign in to debug roles.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              🔍 Role Debugger (Dev Only)
            </CardTitle>
            <CardDescription>
              Debugging RBAC - Remove this component in production
            </CardDescription>
          </div>
          <Button
            onClick={checkRoles}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-900 dark:text-red-100">Error</p>
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Wallet Address */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Connected Wallet Address</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-xs font-mono overflow-x-auto">
              {address || 'Not connected'}
            </code>
            {address && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(address, 'address')}
              >
                {copied === 'address' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Contract Address */}
        <div className="space-y-1">
          <label className="text-sm font-medium">HealthLink Contract</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-neutral-100 dark:bg-neutral-900 rounded text-xs font-mono overflow-x-auto">
              {contractAddress || 'Not configured'}
            </code>
            {contractAddress && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(contractAddress, 'contract')}
              >
                {copied === 'contract' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Role Checks */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Role Checks (Contract hasRole Calls)</label>
          <div className="space-y-2">
            {roleChecks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Click &ldquo;Refresh&rdquo; to check roles</p>
            ) : (
              roleChecks.map((check) => (
                <div
                  key={check.roleName}
                  className={`p-3 rounded-lg border-2 ${
                    check.hasRole
                      ? 'bg-green-50 dark:bg-green-950 border-green-500'
                      : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {check.hasRole ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-neutral-400" />
                      )}
                      <span className="font-semibold">{check.roleName}</span>
                      <Badge variant={check.hasRole ? 'default' : 'outline'}>
                        {check.hasRole ? 'HAS ROLE' : 'NO ROLE'}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRoleForDisplay(check.roleName)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-white dark:bg-black rounded text-xs font-mono overflow-x-auto">
                      {check.roleHash}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(check.roleHash, check.roleName)}
                    >
                      {copied === check.roleName ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Known Hashes Reference */}
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-blue-600 dark:text-blue-400">
            📖 View Known Role Hashes
          </summary>
          <div className="mt-2 space-y-1 p-3 bg-neutral-100 dark:bg-neutral-900 rounded">
            {Object.entries(ROLE_HASHES).map(([name, hash]) => (
              <div key={name} className="flex items-center justify-between">
                <span className="font-mono text-xs">{name}:</span>
                <code className="text-xs">{hash}</code>
              </div>
            ))}
          </div>
        </details>

        {/* Instructions */}
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded-md">
          <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
            💡 How to Fix Role Issues
          </p>
          <ol className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1 list-decimal list-inside">
            <li>If all roles show &ldquo;NO ROLE&rdquo;, run the grant-roles script</li>
            <li>Check that contract address matches deployed contract</li>
            <li>Verify you&apos;re connected to the correct network (Sepolia)</li>
            <li>Check console for detailed error messages</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
