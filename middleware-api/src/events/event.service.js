import { Server } from 'socket.io';
import { getGatewayInstance } from '../services/fabricGateway.service.js';
import logger from '../utils/logger.js';
import config from '../config/index.js';

/**
 * EventService
 * Manages blockchain event listeners and WebSocket connections
 * Broadcasts blockchain events to connected clients in real-time
 */
class EventService {
  constructor() {
    this.io = null;
    this.contractListeners = new Map();
    this.blockListeners = new Map();
  }

  /**
   * Initialize WebSocket server
   * @param {Object} httpServer - HTTP server instance
   */
  initialize(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: '*', // Allow all origins for testing (restrict in production)
        methods: ['GET', 'POST'],
        credentials: true,
      },
      path: '/ws',
      transports: ['websocket', 'polling'], // Explicitly enable both transports
      allowEIO3: true, // Backward compatibility
    });

    this.setupSocketHandlers();
    logger.info(`WebSocket server initialized on port ${config.websocket.port}`);
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Handle subscribe to contract events
      socket.on('subscribe:contract', async (data) => {
        const { eventName, userId } = data;
        await this.subscribeToContractEvents(socket, eventName, userId);
      });

      // Handle subscribe to block events
      socket.on('subscribe:blocks', async (data) => {
        const { userId } = data;
        await this.subscribeToBlockEvents(socket, userId);
      });

      // Handle unsubscribe
      socket.on('unsubscribe', (data) => {
        this.unsubscribe(socket, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.cleanupSocketListeners(socket.id);
      });
    });
  }

  /**
   * Subscribe to contract events (chaincode events)
   * @param {Object} socket - Socket instance
   * @param {string} eventName - Event name pattern (regex supported)
   * @param {string} userId - User ID for context
   */
  async subscribeToContractEvents(socket, eventName = '.*', userId = null) {
    try {
      const gateway = await getGatewayInstance(userId);
      const contract = gateway.getContractEventListener();

      // Create event listener
      const listener = await contract.addContractListener(
        async (event) => {
          const payload = {
            eventName: event.eventName,
            payload: event.payload ? event.payload.toString() : null,
            transactionId: event.getTransactionEvent().transactionId,
            blockNumber: event.getTransactionEvent().getBlockEvent().blockNumber.toString(),
            timestamp: new Date().toISOString(),
          };

          // Try to parse payload as JSON
          if (payload.payload) {
            try {
              payload.payload = JSON.parse(payload.payload);
            } catch {
              // Keep as string if not JSON
            }
          }

          logger.info(`Contract event received: ${event.eventName}`, {
            socketId: socket.id,
          });

          // Emit to specific socket
          socket.emit('contract:event', payload);
        },
        {
          type: 'full', // Get full block data
        },
        new RegExp(eventName) // Event name filter (regex)
      );

      // Store listener reference
      const listenerId = `contract:${socket.id}:${eventName}`;
      this.contractListeners.set(listenerId, listener);

      socket.emit('subscribed', {
        type: 'contract',
        eventName,
        listenerId,
      });

      logger.info(`Socket ${socket.id} subscribed to contract events: ${eventName}`);
    } catch (error) {
      logger.error('Failed to subscribe to contract events:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to contract events',
        error: error.message,
      });
    }
  }

  /**
   * Subscribe to block events
   * @param {Object} socket - Socket instance
   * @param {string} userId - User ID for context
   */
  async subscribeToBlockEvents(socket, userId = null) {
    try {
      const gateway = await getGatewayInstance(userId);
      const network = gateway.getBlockEventListener();

      // Create block listener
      const listener = await network.addBlockListener(
        async (blockEvent) => {
          const blockNumber = blockEvent.blockNumber.toString();
          const blockData = blockEvent.blockData;

          const payload = {
            blockNumber,
            numberOfTransactions: blockData.data.data.length,
            previousHash: Buffer.from(blockData.header.previous_hash).toString('hex'),
            dataHash: Buffer.from(blockData.header.data_hash).toString('hex'),
            timestamp: new Date().toISOString(),
          };

          logger.info(`Block event received: Block #${blockNumber}`, {
            socketId: socket.id,
          });

          // Emit to specific socket
          socket.emit('block:event', payload);
        },
        {
          type: 'full',
          startBlock: 'newest',
        }
      );

      // Store listener reference
      const listenerId = `block:${socket.id}`;
      this.blockListeners.set(listenerId, listener);

      socket.emit('subscribed', {
        type: 'block',
        listenerId,
      });

      logger.info(`Socket ${socket.id} subscribed to block events`);
    } catch (error) {
      logger.error('Failed to subscribe to block events:', error);
      socket.emit('error', {
        message: 'Failed to subscribe to block events',
        error: error.message,
      });
    }
  }

  /**
   * Unsubscribe from events
   * @param {Object} socket - Socket instance
   * @param {Object} data - Unsubscribe data
   */
  unsubscribe(socket, data) {
    const { listenerId } = data;

    if (listenerId) {
      // Unsubscribe specific listener
      if (this.contractListeners.has(listenerId)) {
        this.contractListeners.get(listenerId).unregister();
        this.contractListeners.delete(listenerId);
      }

      if (this.blockListeners.has(listenerId)) {
        this.blockListeners.get(listenerId).unregister();
        this.blockListeners.delete(listenerId);
      }

      socket.emit('unsubscribed', { listenerId });
      logger.info(`Listener ${listenerId} unsubscribed`);
    } else {
      // Unsubscribe all listeners for this socket
      this.cleanupSocketListeners(socket.id);
      socket.emit('unsubscribed', { all: true });
    }
  }

  /**
   * Cleanup all listeners for a socket
   * @param {string} socketId - Socket ID
   */
  cleanupSocketListeners(socketId) {
    // Clean contract listeners
    for (const [listenerId, listener] of this.contractListeners.entries()) {
      if (listenerId.includes(socketId)) {
        listener.unregister();
        this.contractListeners.delete(listenerId);
      }
    }

    // Clean block listeners
    for (const [listenerId, listener] of this.blockListeners.entries()) {
      if (listenerId.includes(socketId)) {
        listener.unregister();
        this.blockListeners.delete(listenerId);
      }
    }

    logger.info(`Cleaned up listeners for socket: ${socketId}`);
  }

  /**
   * Broadcast event to all connected clients
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
      logger.info(`Broadcasted event: ${event}`);
    }
  }

  /**
   * Get connected clients count
   * @returns {number}
   */
  getConnectedClientsCount() {
    return this.io ? this.io.sockets.sockets.size : 0;
  }
}

// Singleton instance
const eventService = new EventService();

export default eventService;
