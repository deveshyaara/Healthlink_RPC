'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';

interface RoleContextType {
  isDoctor: boolean;
  isPatient: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
  walletAddress: string | null;
  refetch: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

/**
 * RoleProvider
 *
 * Global provider for user roles from Ethereum smart contract
 * Wrap your app with this provider to access roles anywhere
 */
export function RoleProvider({ children }: { children: ReactNode }) {
  const roleData = useUserRole(true);

  return (
    <RoleContext.Provider value={roleData}>
      {children}
    </RoleContext.Provider>
  );
}

/**
 * Hook to access role context
 * Must be used within RoleProvider
 */
export function useRole(): RoleContextType {
  const context = useContext(RoleContext);

  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }

  return context;
}
