import { Gateway, Wallets } from 'fabric-network';
import fs from 'fs';
import path from 'path';

export class FabricClient {
  constructor(ccpPath, walletPath, userId, channelName) {
    this.ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    this.walletPath = walletPath;
    this.userId = userId;
    this.channelName = channelName || 'mychannel';
    this.gateway = new Gateway();
  }

  async init() {
    const wallet = await Wallets.newFileSystemWallet(this.walletPath);
    console.log(`Using wallet at: ${this.walletPath}`);
    
    await this.gateway.connect(this.ccp, { 
      wallet, 
      identity: this.userId, 
      discovery: { enabled: true}
    });
    
    this.network = await this.gateway.getNetwork(this.channelName);
    console.log(`Connected to channel: ${this.channelName}`);
  }

  async getContract(name) {
    return this.network.getContract(name);
  }

  async submit(contractName, ...args) {
    const fn = args.shift(); // Take the first argument as the function name
    console.log(`Submitting transaction: ${contractName}.${fn}(${args.join(',')})`);
    const contract = await this.getContract(contractName);
    const tx = await contract.submitTransaction(fn, ...args); // Spread the rest of the arguments
    console.log('Transaction submitted successfully');
    return tx.toString();
  }

  async evaluate(contractName, ...args) {
    const fn = args.shift(); // Take the first argument as the function name
    console.log(`Evaluating transaction: ${contractName}.${fn}(${args.join(',')})`);
    const contract = await this.getContract(contractName);
    const res = await contract.evaluateTransaction(fn, ...args); // Spread the rest of the arguments
    console.log('Transaction evaluated successfully');
    return res.toString();
  }

  disconnect() {
    console.log('Disconnecting gateway...');
    this.gateway.disconnect();
  }

  async submitPrivate(contractName, fn, transientData) {
    console.log(`Submitting private transaction: ${contractName}.${fn}`);
    const contract = await this.getContract(contractName);

    // 'transientData' should be an object like: { key: value }
    // We need to bufferize the values
    const transientForTransaction = {};
    for (const [key, value] of Object.entries(transientData)) {
      transientForTransaction[key] = Buffer.from(JSON.stringify(value));
    }

    // Build the transaction
    const tx = contract.createTransaction(fn);

    // Set the transient data
    tx.setTransient(transientForTransaction);

    // Submit
    const txResponse = await tx.submit();

    console.log('Private transaction submitted successfully');
    return txResponse.toString();
  }
}
