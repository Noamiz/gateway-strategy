import { randomUUID } from 'crypto';

type MaybeCrypto = {
  randomUUID?: () => string;
};

export function newId(): string {
  const maybeCrypto = (globalThis as typeof globalThis & { crypto?: MaybeCrypto }).crypto;
  if (maybeCrypto && typeof maybeCrypto.randomUUID === 'function') {
    return maybeCrypto.randomUUID();
  }
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}`;
}
