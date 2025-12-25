/* @vitest-environment jsdom */
import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the ethereum service used by the hook
vi.mock('../services/ethereum.service', () => ({
  __esModule: true,
  default: {
    createPatient: vi.fn(),
    createAppointment: vi.fn(),
    createConsent: vi.fn(),
    revokeConsent: vi.fn(),
  },
}));

import ethereumService from '../services/ethereum.service';
import { useHealthcare } from './useHealthcare';

// Helper component to expose the hook via ref
const HookWrapper = React.forwardRef((_props, ref) => {
  const hooks = useHealthcare();
  React.useImperativeHandle(ref, () => hooks, [hooks]);
  return null;
});

describe('useHealthcare runtime behavior', () => {
  beforeEach(() => {
    // Clear mocked implementations between tests
    vi.clearAllMocks();
  });

  it('sets isLoading to true immediately when createPatient is called', async () => {
    const pending: any = {};
    let resolve: (v?: any) => void = () => {};
    pending.promise = new Promise((res) => { resolve = res; });

    (ethereumService.createPatient as any).mockReturnValueOnce(pending.promise);

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    // Call createPatient but don't await it; check loading is true immediately
    act(() => {
      // call and ignore rejection/result
      void ref.current.createPatient('0xaddr', 'Alice', 30, 'F', 'QmHash').catch(() => {});
    });

    expect(ref.current.isLoading).toBe(true);

    // Resolve the promise and wait for loading to reset
    act(() => resolve({}));
    await waitFor(() => expect(ref.current.isLoading).toBe(false));
  });

  it('on success clears isLoading and leaves no error', async () => {
    (ethereumService.createPatient as any).mockResolvedValueOnce({ tx: 'ok' });

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    await act(async () => {
      await ref.current.createPatient('0xaddr', 'Alice', 30, 'F', 'QmHash');
    });

    expect(ref.current.isLoading).toBe(false);
    expect(ref.current.error).toBeNull();
  });

  it('captures generic errors and sets error state', async () => {
    (ethereumService.createPatient as any).mockRejectedValueOnce(new Error('Network fail'));

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    await act(async () => {
      try {
        await ref.current.createPatient('0xaddr', 'Alice', 30, 'F', 'QmHash');
      } catch (e) {
        // expected
      }
    });

    expect(ref.current.isLoading).toBe(false);
    expect(ref.current.error).toBe('Network fail');
  });

  it('handles blockchain-like errors and extracts user-friendly message', async () => {
    (ethereumService.createPatient as any).mockRejectedValueOnce({ code: 'ACTION_REJECTED', reason: 'User rejected' });

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    await act(async () => {
      try {
        await ref.current.createPatient('0xaddr', 'Alice', 30, 'F', 'QmHash');
      } catch (e) {
        // expected
      }
    });

    expect(ref.current.isLoading).toBe(false);
    expect(ref.current.error).toBe('User rejected');
  });

  // ---------------------- createAppointment ----------------------
  it('createAppointment: loading toggles and calls service with correct args', async () => {
    const pending: any = {};
    let resolve: (v?: any) => void = () => {};
    pending.promise = new Promise((res) => { resolve = res; });

    (ethereumService.createAppointment as any).mockReturnValueOnce(pending.promise);

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    act(() => {
      void ref.current.createAppointment('apt-1', 'patient-1', '0xdoc', 1700000000, 'Checkup', 'notes').catch(() => {});
    });

    expect(ref.current.isLoading).toBe(true);
    act(() => resolve({ tx: 'ok' }));
    await waitFor(() => expect(ref.current.isLoading).toBe(false));
    expect(ethereumService.createAppointment).toHaveBeenCalledWith('apt-1', 'patient-1', '0xdoc', 1700000000, 'Checkup', 'notes');
  });

  it('createAppointment: error is captured and set on state', async () => {
    (ethereumService.createAppointment as any).mockRejectedValueOnce(new Error('Patient not found'));

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    await act(async () => {
      try {
        await ref.current.createAppointment('apt-1', 'patient-1', '0xdoc', 1700000000, 'Checkup', 'notes');
      } catch (e) {
        // expected
      }
    });

    expect(ref.current.isLoading).toBe(false);
    expect(ref.current.error).toBe('Patient not found');
  });

  // ---------------------- createConsent / revokeConsent ----------------------
  it('createConsent toggles loading and succeeds', async () => {
    (ethereumService.createConsent as any).mockResolvedValueOnce({ tx: 'ok' });

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    await act(async () => {
      await ref.current.createConsent('consent-1', 'patient-1', '0xdoc', 30);
    });

    expect(ref.current.isLoading).toBe(false);
    expect(ref.current.error).toBeNull();
    expect(ethereumService.createConsent).toHaveBeenCalledWith('consent-1', 'patient-1', '0xdoc', 30);
  });

  it('createConsent handles rejection (wallet user rejected)', async () => {
    (ethereumService.createConsent as any).mockRejectedValueOnce({ code: 'ACTION_REJECTED', reason: 'User rejected transaction' });

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    await act(async () => {
      try {
        await ref.current.createConsent('consent-1', 'patient-1', '0xdoc', 30);
      } catch (e) {
        // expected
      }
    });

    expect(ref.current.isLoading).toBe(false);
    expect(ref.current.error).toBe('User rejected transaction');
  });

  it('revokeConsent toggles loading and succeeds', async () => {
    (ethereumService.revokeConsent as any).mockResolvedValueOnce({ tx: 'ok' });

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    await act(async () => {
      await ref.current.revokeConsent('consent-1');
    });

    expect(ref.current.isLoading).toBe(false);
    expect(ref.current.error).toBeNull();
    expect(ethereumService.revokeConsent).toHaveBeenCalledWith('consent-1');
  });

  it('revokeConsent handles rejection and sets friendly message', async () => {
    (ethereumService.revokeConsent as any).mockRejectedValueOnce({ reason: 'On-chain revert: not owner' });

    const ref: any = React.createRef();
    render(<HookWrapper ref={ref} />);

    await act(async () => {
      try {
        await ref.current.revokeConsent('consent-1');
      } catch (e) {
        // expected
      }
    });

    expect(ref.current.isLoading).toBe(false);
    expect(ref.current.error).toBe('On-chain revert: not owner');
  });
});