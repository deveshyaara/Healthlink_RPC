import { describe, it, expect } from 'vitest';
import { extractErrorMessage } from './error-utils';

describe('extractErrorMessage', () => {
  it('returns message for Error instance', () => {
    const err = new Error('boom');
    expect(extractErrorMessage(err, 'fallback')).toBe('boom');
  });

  it('returns blockchainError when present', () => {
    const err = { blockchainError: 'on-chain failed' };
    expect(extractErrorMessage(err, 'fallback')).toBe('on-chain failed');
  });

  it('returns nested error.message when present', () => {
    const err = { error: { message: 'inner message' } };
    expect(extractErrorMessage(err, 'fallback')).toBe('inner message');
  });

  it('returns reason when present', () => {
    const err = { reason: 'revert reason' };
    expect(extractErrorMessage(err, 'fallback')).toBe('revert reason');
  });

  it('returns stringified object for unknown objects', () => {
    const err = { foo: 'bar' };
    expect(extractErrorMessage(err, 'fallback')).toBe(JSON.stringify(err));
  });

  it('returns fallback for null/undefined', () => {
    expect(extractErrorMessage(null, 'fallback')).toBe('fallback');
    expect(extractErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});