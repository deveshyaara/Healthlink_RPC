import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '@/config/api.config';

interface ContractEvent {
  eventName: string;
  payload: Record<string, unknown>;
  chaincodeName: string;
  transactionId: string;
  blockNumber: number;
}

interface BlockEvent {
  blockNumber: number;
  transactions: Array<{
    transactionId: string;
    type: string;
    timestamp: string;
  }>;
}

interface UseBlockchainEventsOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
}

export const useBlockchainEvents = (options: UseBlockchainEventsOptions = {}) => {
  const { autoConnect = false, reconnect = true } = options;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [contractEvents, setContractEvents] = useState<ContractEvent[]>([]);
  const [blockEvents, setBlockEvents] = useState<BlockEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    const newSocket = io(API_CONFIG.WEBSOCKET_URL, {
      path: '/ws',
      reconnection: reconnect,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      setError(err.message);
      setConnected(false);
    });

    newSocket.on('contract-event', (event: ContractEvent) => {
      setContractEvents((prev) => [...prev, event]);
    });

    newSocket.on('block-event', (event: BlockEvent) => {
      setBlockEvents((prev) => [...prev, event]);
    });

    newSocket.on('event-error', (error: { message: string }) => {
      console.error('Event error:', error);
      setError(error.message);
    });

    setSocket(newSocket);
    return newSocket;
  }, [reconnect]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  }, [socket]);

  const subscribeToContractEvent = useCallback(
    (contractName: string, eventName: string) => {
      if (socket && connected) {
        socket.emit('subscribe-contract-event', { contractName, eventName });
      }
    },
    [socket, connected],
  );

  const unsubscribeFromContractEvent = useCallback(
    (contractName: string, eventName: string) => {
      if (socket && connected) {
        socket.emit('unsubscribe-contract-event', { contractName, eventName });
      }
    },
    [socket, connected],
  );

  const subscribeToBlockEvents = useCallback(
    (startBlock?: number) => {
      if (socket && connected) {
        socket.emit('subscribe-block-event', { startBlock });
      }
    },
    [socket, connected],
  );

  const unsubscribeFromBlockEvents = useCallback(() => {
    if (socket && connected) {
      socket.emit('unsubscribe-block-event');
    }
  }, [socket, connected]);

  const clearEvents = useCallback(() => {
    setContractEvents([]);
    setBlockEvents([]);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    socket,
    connected,
    error,
    contractEvents,
    blockEvents,
    connect,
    disconnect,
    subscribeToContractEvent,
    unsubscribeFromContractEvent,
    subscribeToBlockEvents,
    unsubscribeFromBlockEvents,
    clearEvents,
  };
};
