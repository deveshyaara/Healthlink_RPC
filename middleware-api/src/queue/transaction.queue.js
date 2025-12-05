import Bull from 'bull';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import transactionService from '../services/transaction.service.js';

/**
 * Transaction Queue using Bull
 * Handles asynchronous transaction processing
 * Useful for long-running blockchain operations
 */

// Create transaction queue
const transactionQueue = new Bull('transactions', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
});

/**
 * Process jobs in the transaction queue
 */
transactionQueue.process(async (job) => {
  const { type, functionName, args, userId, transientData } = job.data;
  
  logger.info(`Processing queue job: ${type} - ${functionName}`, { 
    jobId: job.id,
    userId,
  });

  try {
    let result;
    
    switch (type) {
      case 'submit':
        result = await transactionService.submitTransaction(functionName, args, userId);
        break;
        
      case 'submit-private':
        result = await transactionService.submitPrivateTransaction(
          functionName,
          transientData,
          args,
          userId
        );
        break;
        
      case 'query':
        result = await transactionService.queryLedger(functionName, args, userId);
        break;
        
      default:
        throw new Error(`Unknown job type: ${type}`);
    }
    
    logger.info(`Queue job ${job.id} completed successfully`);
    return result;
    
  } catch (error) {
    logger.error(`Queue job ${job.id} failed:`, error);
    throw error;
  }
});

/**
 * Queue event handlers
 */
transactionQueue.on('completed', (job, result) => {
  logger.info(`Job ${job.id} completed`, { result });
});

transactionQueue.on('failed', (job, error) => {
  logger.error(`Job ${job.id} failed`, { error: error.message });
});

transactionQueue.on('stalled', (job) => {
  logger.warn(`Job ${job.id} stalled`);
});

/**
 * Add a transaction to the queue
 * @param {string} type - Transaction type (submit/query)
 * @param {string} functionName - Chaincode function
 * @param {Array} args - Function arguments
 * @param {string} userId - User ID
 * @param {Object} transientData - Optional transient data
 * @param {Object} options - Queue options (priority, delay, etc.)
 * @returns {Promise<Object>} Job object
 */
export const addTransactionToQueue = async (
  type,
  functionName,
  args = [],
  userId = null,
  transientData = null,
  options = {}
) => {
  try {
    const job = await transactionQueue.add(
      {
        type,
        functionName,
        args,
        userId,
        transientData,
      },
      {
        attempts: 3, // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 seconds
        },
        removeOnComplete: true,
        removeOnFail: false,
        ...options,
      }
    );
    
    logger.info(`Transaction added to queue`, {
      jobId: job.id,
      type,
      functionName,
    });
    
    return {
      jobId: job.id,
      status: 'queued',
      type,
      functionName,
    };
  } catch (error) {
    logger.error('Failed to add transaction to queue:', error);
    throw error;
  }
};

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status
 */
export const getJobStatus = async (jobId) => {
  try {
    const job = await transactionQueue.getJob(jobId);
    
    if (!job) {
      return { status: 'not_found' };
    }
    
    const state = await job.getState();
    const progress = job.progress();
    const result = job.returnvalue;
    const failedReason = job.failedReason;
    
    return {
      jobId,
      status: state,
      progress,
      result,
      failedReason,
      createdAt: job.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    };
  } catch (error) {
    logger.error(`Failed to get job status for ${jobId}:`, error);
    throw error;
  }
};

/**
 * Get queue statistics
 * @returns {Promise<Object>} Queue stats
 */
export const getQueueStats = async () => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      transactionQueue.getWaitingCount(),
      transactionQueue.getActiveCount(),
      transactionQueue.getCompletedCount(),
      transactionQueue.getFailedCount(),
      transactionQueue.getDelayedCount(),
    ]);
    
    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  } catch (error) {
    logger.error('Failed to get queue stats:', error);
    // Return default stats if Redis is not available
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
      error: error.message,
    };
  }
};

/**
 * Clean old jobs from queue
 * @param {number} gracePeriod - Grace period in milliseconds
 * @returns {Promise<void>}
 */
export const cleanQueue = async (gracePeriod = 24 * 60 * 60 * 1000) => {
  try {
    await transactionQueue.clean(gracePeriod, 'completed');
    await transactionQueue.clean(gracePeriod, 'failed');
    logger.info('Queue cleaned successfully');
  } catch (error) {
    logger.error('Failed to clean queue:', error);
    throw error;
  }
};

export default transactionQueue;
