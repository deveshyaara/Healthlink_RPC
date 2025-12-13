import { API_CONFIG, API_ENDPOINTS } from '@/config/api.config';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type?: string;
    message: string;
    statusCode?: number;
    stack?: string;
  };
  message?: string;
}

export interface TransactionRequest {
  contractName: string;
  functionName: string;
  args: string[];
  userId: string;
  async?: boolean;
}

export interface PrivateTransactionRequest extends TransactionRequest {
  transientData: Record<string, string>;
}

export interface QueryRequest {
  contractName: string;
  functionName: string;
  args: string[];
  userId: string;
}

export interface WalletRegisterRequest {
  userId: string;
  role: string;
  affiliation: string;
}

class BlockchainApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}/api/${API_CONFIG.API_VERSION}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: AbortSignal.timeout(API_CONFIG.TIMEOUT),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || {
            message: `HTTP error! status: ${response.status}`,
            statusCode: response.status,
          },
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message || 'Network error occurred',
          type: 'NETWORK_ERROR',
        },
      };
    }
  }

  // ==================== Wallet Management ====================

  async enrollAdmin(enrollmentID: string, enrollmentSecret: string) {
    return this.request(API_ENDPOINTS.ENROLL_ADMIN, {
      method: 'POST',
      body: JSON.stringify({ enrollmentID, enrollmentSecret }),
    });
  }

  async registerUser(data: WalletRegisterRequest) {
    return this.request(API_ENDPOINTS.REGISTER_USER, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getIdentity(userId: string) {
    return this.request(`${API_ENDPOINTS.GET_IDENTITY}/${userId}`, {
      method: 'GET',
    });
  }

  async listIdentities() {
    return this.request<string[]>(API_ENDPOINTS.LIST_IDENTITIES, {
      method: 'GET',
    });
  }

  async removeIdentity(userId: string) {
    return this.request(`${API_ENDPOINTS.REMOVE_IDENTITY}/${userId}`, {
      method: 'DELETE',
    });
  }

  // ==================== Transactions ====================

  async submitTransaction(data: TransactionRequest) {
    return this.request(API_ENDPOINTS.SUBMIT_TRANSACTION, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async submitPrivateTransaction(data: PrivateTransactionRequest) {
    return this.request(API_ENDPOINTS.SUBMIT_PRIVATE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async queryLedger(data: QueryRequest) {
    return this.request(API_ENDPOINTS.QUERY_LEDGER, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==================== Assets ====================

  async getAllAssets(contractName: string, userId: string) {
    const params = new URLSearchParams({ contractName, userId });
    return this.request(`${API_ENDPOINTS.GET_ALL_ASSETS}?${params}`, {
      method: 'GET',
    });
  }

  async queryAssets(contractName: string, queryString: string, userId: string) {
    return this.request(API_ENDPOINTS.QUERY_ASSETS, {
      method: 'POST',
      body: JSON.stringify({ contractName, queryString, userId }),
    });
  }

  async createAsset(
    contractName: string,
    functionName: string,
    assetData: any,
    userId: string,
  ) {
    return this.request(API_ENDPOINTS.CREATE_ASSET, {
      method: 'POST',
      body: JSON.stringify({ contractName, functionName, assetData, userId }),
    });
  }

  async updateAsset(
    assetId: string,
    contractName: string,
    functionName: string,
    assetData: any,
    userId: string,
  ) {
    return this.request(`${API_ENDPOINTS.UPDATE_ASSET}/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify({ contractName, functionName, assetData, userId }),
    });
  }

  async deleteAsset(
    assetId: string,
    contractName: string,
    functionName: string,
    userId: string,
  ) {
    return this.request(`${API_ENDPOINTS.DELETE_ASSET}/${assetId}`, {
      method: 'DELETE',
      body: JSON.stringify({ contractName, functionName, userId }),
    });
  }

  async getAssetHistory(assetId: string, contractName: string, userId: string) {
    const params = new URLSearchParams({ contractName, userId });
    return this.request(`${API_ENDPOINTS.ASSET_HISTORY}/${assetId}?${params}`, {
      method: 'GET',
    });
  }

  // ==================== Jobs ====================

  async getJobStatus(jobId: string) {
    return this.request(`${API_ENDPOINTS.JOB_STATUS}/${jobId}`, {
      method: 'GET',
    });
  }

  // ==================== Health ====================

  async healthCheck() {
    return this.request(API_ENDPOINTS.HEALTH, {
      method: 'GET',
    });
  }

  // ==================== HealthLink Specific ====================

  async createPatient(
    patientId: string,
    patientDetails: any,
    userId: string,
    async = false,
  ) {
    return this.submitPrivateTransaction({
      contractName: 'healthlink',
      functionName: 'CreatePatient',
      transientData: {
        patientDetails: JSON.stringify(patientDetails),
      },
      args: [patientId],
      userId,
      async,
    });
  }

  async addRecordHash(
    patientId: string,
    recordId: string,
    recordHash: string,
    userId: string,
  ) {
    return this.submitTransaction({
      contractName: 'healthlink',
      functionName: 'AddRecordHash',
      args: [patientId, recordId, recordHash],
      userId,
    });
  }

  async createConsent(
    consentId: string,
    patientId: string,
    granteeId: string,
    scope: string,
    purpose: string,
    validUntil: string,
    userId: string,
  ) {
    return this.submitTransaction({
      contractName: 'healthlink',
      functionName: 'CreateConsent',
      args: [consentId, patientId, granteeId, scope, purpose, validUntil],
      userId,
    });
  }

  async revokeConsent(consentId: string, userId: string) {
    return this.submitTransaction({
      contractName: 'healthlink',
      functionName: 'RevokeConsent',
      args: [consentId],
      userId,
    });
  }

  async getConsent(consentId: string, userId: string) {
    return this.queryLedger({
      contractName: 'healthlink',
      functionName: 'GetConsent',
      args: [consentId],
      userId,
    });
  }

  async getConsentsByPatient(patientId: string, userId: string) {
    return this.queryLedger({
      contractName: 'healthlink',
      functionName: 'GetConsentsByPatient',
      args: [patientId],
      userId,
    });
  }

  async getAuditRecord(auditId: string, userId: string) {
    return this.queryLedger({
      contractName: 'healthlink',
      functionName: 'GetAuditRecord',
      args: [auditId],
      userId,
    });
  }
}

// Export singleton instance
export const blockchainApi = new BlockchainApiService();
