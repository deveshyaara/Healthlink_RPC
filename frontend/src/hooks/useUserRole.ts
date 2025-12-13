'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '@/contexts/auth-context';

// Role hashes from OpenZeppelin AccessControl
const ROLES = {
  ADMIN: ethers.keccak256(ethers.toUtf8Bytes('ADMIN_ROLE')),
  DOCTOR: ethers.keccak256(ethers.toUtf8Bytes('DOCTOR_ROLE')),
  PATIENT: ethers.keccak256(ethers.toUtf8Bytes('PATIENT_ROLE')),
};

interface UserRoleState {
  isDoctor: boolean;
  isPatient: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  walletAddress: string | null;
}

/**
 * Custom Hook: useUserRole
 *
 * Fetches user role from the Ethereum smart contract
 * Triggers automatically when wallet is connected
 * Returns role booleans for conditional UI rendering
 *
 * @param autoFetch - Whether to automatically fetch role on mount (default: true)
 * @returns UserRoleState with role flags and loading state
 */
export function useUserRole(autoFetch = true): UserRoleState & { refetch: () => Promise<void> } {
  const { user } = useAuth();
  const [roleState, setRoleState] = useState<UserRoleState>({
    isDoctor: false,
    isPatient: false,
    isAdmin: false,
    loading: true,
    error: null,
    walletAddress: null,
  });

  const fetchUserRole = useCallback(async () => {
    // If user doesn't exist or is loading, skip
    if (!user) {
      setRoleState({
        isDoctor: false,
        isPatient: false,
        isAdmin: false,
        loading: false,
        error: 'No user authenticated',
        walletAddress: null,
      });
      return;
    }

    // Set loading state
    setRoleState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check if MetaMask is available
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Ethereum provider not found. Please install MetaMask.');
      }

      // Get provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      // Load contract
      const contractResponse = await fetch('/contracts/HealthLink.json');
      if (!contractResponse.ok) {
        throw new Error('Failed to load contract ABI');
      }
      const contractData = await contractResponse.json();

      // Get contract address from environment or deployment
      const contractAddress = process.env.NEXT_PUBLIC_HEALTHLINK_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured');
      }

      // Initialize contract
      const contract = new ethers.Contract(
        contractAddress,
        contractData.abi,
        signer
      );

      // Check roles in parallel - cast results to boolean
      const [adminResult, doctorResult, patientResult] = await Promise.all([
        contract.hasRole(ROLES.ADMIN, address),
        contract.hasRole(ROLES.DOCTOR, address),
        contract.hasRole(ROLES.PATIENT, address),
      ]);

      // Update state with results
      setRoleState({
        isDoctor: Boolean(doctorResult),
        isPatient: Boolean(patientResult),
        isAdmin: Boolean(adminResult),
        loading: false,
        error: null,
        walletAddress: address,
      });
    } catch (error) {
      console.error('❌ Failed to fetch user role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setRoleState({
        isDoctor: false,
        isPatient: false,
        isAdmin: false,
        loading: false,
        error: errorMessage,
        walletAddress: null,
      });
    }
  }, [user]);

  // Auto-fetch on mount and when user changes
  useEffect(() => {
    if (autoFetch && user) {
      fetchUserRole();
    }
  }, [autoFetch, user, fetchUserRole]);

  return {
    ...roleState,
    refetch: fetchUserRole,
  };
}

/**
 * Helper hook for simple role checking
 * Returns just the role flags without loading state
 */
export function useRoleFlags() {
  const { isDoctor, isPatient, isAdmin, loading } = useUserRole();

  return {
    isDoctor: !loading && isDoctor,
    isPatient: !loading && isPatient,
    isAdmin: !loading && isAdmin,
  };
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasRole(...roles: ('doctor' | 'patient' | 'admin')[]) {
  const { isDoctor, isPatient, isAdmin, loading } = useUserRole();

  const hasRole = roles.some(role => {
    switch (role) {
      case 'doctor': return isDoctor;
      case 'patient': return isPatient;
      case 'admin': return isAdmin;
      default: return false;
    }
  });

  return { hasRole, loading };
}
