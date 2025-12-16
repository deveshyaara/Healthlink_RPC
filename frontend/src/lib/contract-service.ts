/**
 * Contract Loading Service
 * Centralized contract ABI loading with caching
 */

type ContractName = 'HealthLink' | 'PatientRecords' | 'Appointments' | 'Prescriptions' | 'DoctorCredentials';

interface ContractABI {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any[];
  address?: string;
}

class ContractService {
  private cache: Map<ContractName, ContractABI> = new Map();
  private loadingPromises: Map<ContractName, Promise<ContractABI>> = new Map();

  /**
   * Load contract ABI from public directory with caching
   */
  async loadContract(contractName: ContractName): Promise<ContractABI> {
    // Return cached version if available
    const cached = this.cache.get(contractName);
    if (cached) {
      return cached;
    }

    // Return in-flight promise if already loading
    const loadingPromise = this.loadingPromises.get(contractName);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Start new load
    const promise = this.fetchContract(contractName);
    this.loadingPromises.set(contractName, promise);

    try {
      const contract = await promise;
      this.cache.set(contractName, contract);
      this.loadingPromises.delete(contractName);
      return contract;
    } catch (error) {
      this.loadingPromises.delete(contractName);
      throw error;
    }
  }

  private async fetchContract(contractName: ContractName): Promise<ContractABI> {
    try {
      const response = await fetch(`/contracts/${contractName}.json`);

      if (!response.ok) {
        throw new Error(`Failed to load ${contractName} contract: ${response.status}`);
      }

      const data = await response.json();

      // Validate contract data
      if (!data.abi || !Array.isArray(data.abi)) {
        throw new Error(`Invalid contract ABI for ${contractName}`);
      }

      return {
        abi: data.abi,
        address: data.address
      };
    } catch (error) {
      console.error(`Error loading ${contractName} contract:`, error);
      throw error;
    }
  }

  /**
   * Get contract address from environment or ABI
   */
  getContractAddress(contractName: ContractName): string | undefined {
    // Check environment variables first
    const envKey = `NEXT_PUBLIC_${contractName.toUpperCase()}_CONTRACT_ADDRESS`;
    const envAddress = process.env[envKey];

    if (envAddress) {
      return envAddress;
    }

    // Fallback to cached ABI
    const cached = this.cache.get(contractName);
    return cached?.address;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Preload multiple contracts
   */
  async preloadContracts(contracts: ContractName[]): Promise<void> {
    await Promise.all(contracts.map(name => this.loadContract(name)));
  }
}

// Export singleton instance
export const contractService = new ContractService();

// Export type for consumers
export type { ContractName, ContractABI };
