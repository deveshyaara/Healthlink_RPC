export function extractErrorMessage(err: unknown, fallback: string) {
  if (!err) return fallback;
  if (err instanceof Error) return err.message;
  try {
    const e = err as any;
    if (typeof e === 'string') return e;
    if (e.blockchainError) return String(e.blockchainError);
    if (e.error && typeof e.error === 'string') return e.error;
    if (e.error && e.error.message) return String(e.error.message);
    if (e.message) return String(e.message);
    if (e.reason) return String(e.reason);
    return JSON.stringify(e);
  } catch (_e) {
    return fallback;
  }
}