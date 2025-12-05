// Middleware API Client Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  API_VERSION: 'v1',
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4001',
  TIMEOUT: 30000, // 30 seconds
};

export const API_ENDPOINTS = {
  // Wallet Management
  ENROLL_ADMIN: '/wallet/enroll-admin',
  REGISTER_USER: '/wallet/register',
  GET_IDENTITY: '/wallet/identity',
  LIST_IDENTITIES: '/wallet/identities',
  REMOVE_IDENTITY: '/wallet/identity',

  // Transactions
  SUBMIT_TRANSACTION: '/transactions',
  SUBMIT_PRIVATE: '/transactions/private',
  QUERY_LEDGER: '/query',

  // Assets
  GET_ALL_ASSETS: '/assets',
  QUERY_ASSETS: '/assets/query',
  CREATE_ASSET: '/assets',
  UPDATE_ASSET: '/assets',
  DELETE_ASSET: '/assets',
  ASSET_HISTORY: '/history',

  // Jobs
  JOB_STATUS: '/jobs',

  // Health
  HEALTH: '/health',
};

export const buildApiUrl = (endpoint: string, params?: Record<string, string>) => {
  const baseUrl = `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}`;
  let url = `${baseUrl}${endpoint}`;

  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url += `?${queryString}`;
  }

  return url;
};
