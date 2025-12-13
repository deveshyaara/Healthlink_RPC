'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ethereumService from '@/services/ethereum.service';

interface Web3ContextType {
  account: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnectWallet = () => {
    ethereumService.disconnect();
    setAccount(null);
    setIsConnected(false);
    setError(null);
  };

  const checkConnection = async () => {
    try {
      const address = await ethereumService.getCurrentAddress();
      if (address) {
        setAccount(address);
        setIsConnected(true);
      }
    } catch {
      // Not connected yet
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const address = await ethereumService.connectWallet();
      setAccount(address);
      setIsConnected(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Check if already connected on mount
  useEffect(() => {
    checkConnection();

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        // User disconnected
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
        setIsConnected(true);
      }
    };

    const handleChainChanged = () => {
      // Reload the page when chain changes
      window.location.reload();
    };

    // Listen for account changes
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return (
    <Web3Context.Provider
      value={{
        account,
        isConnected,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
}
