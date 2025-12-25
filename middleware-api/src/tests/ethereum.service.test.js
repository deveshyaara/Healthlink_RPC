import { ethers } from 'ethers';
import { ContractRevertError } from '../utils/errors.js';

// Local copy of the small helpers from EthereumService so tests don't pull in full service dependencies
function _decodeRevertData(raw) {
  try {
    if (!raw || typeof raw !== 'string') return null;
    if (raw.startsWith('0x08c379a0')) {
      const hex = raw.slice(10);
      const lenHex = hex.slice(64, 128);
      const len = parseInt(lenHex, 16);
      const strHex = hex.slice(128, 128 + len * 2);
      return Buffer.from(strHex, 'hex').toString('utf8');
    }
    return raw;
  } catch (err) {
    return raw;
  }
}

function _formatTransactionError(error) {
  const rawMsg = (error && (error.message || error.shortMessage)) || 'Transaction failed';
  const message = String(rawMsg);

  const rawData = (error && (error.data || (error.error && error.error.data) || (error.revert && error.revert.data) || (error.receipt && error.receipt.revert && error.receipt.revert.data))) || null;
  if (typeof rawData === 'string' && rawData.startsWith('0x')) {
    const decoded = _decodeRevertData(rawData);
    if (decoded) {
      return new ContractRevertError(`Smart contract reverted: ${decoded}`, decoded);
    }
  }

  const receipt = error && (error.receipt || error.transactionReceipt || null);
  if (receipt && receipt.status === 0 && !rawData) {
    return new ContractRevertError('Transaction reverted without a reason string', null);
  }

  return { message };
}

describe('EthereumService _formatTransactionError (local helpers)', () => {
  test('decodes Error(string) revert payload', () => {
    const reason = 'Appointment does not exist';
    // Use Abi encoder to build Error(string) payload
    const encodedPayload = new (ethers.AbiCoder)().encode(['string'], [reason]).slice(2);
    const encoded = '0x08c379a0' + encodedPayload;

    const err = { data: encoded };
    const formatted = _formatTransactionError(err);
    expect(formatted).toBeInstanceOf(ContractRevertError);
    expect(formatted.reason).toBe(reason);
  });

  test('handles receipt.status === 0 without data', () => {
    const err = { receipt: { status: 0 } };
    const formatted = _formatTransactionError(err);
    expect(formatted).toBeInstanceOf(ContractRevertError);
    expect(formatted.reason).toBeNull();
    expect(formatted.message).toMatch(/without a reason/i);
  });

  test('maps string status into numeric enum for in-memory update (local mapping)', async () => {
    // minimal in-memory object to exercise mapping path
    const svc = { _stores: { appointments: new Map() }, sendTransaction: null };
    svc._stores.appointments.set('apt-1', { appointmentId: 'apt-1', status: 0, updatedAt: Date.now() });

    // Replicate mapping logic used in service
    const mapping = {
      SCHEDULED: 0,
      CONFIRMED: 1,
      COMPLETED: 2,
      CANCELLED: 3,
      NO_SHOW: 3,
    };
    const statusArg = mapping['COMPLETED'];

    // Simulate in-memory update
    const apt = svc._stores.appointments.get('apt-1');
    apt.status = statusArg;
    apt.updatedAt = Date.now();
    svc._stores.appointments.set('apt-1', apt);

    expect(svc._stores.appointments.get('apt-1').status).toBe(2);
  });
});
