import { TreasuryRepository } from './treasuryRepository';
import { createLocalTreasuryRepository } from './localTreasuryRepository';
import { createFirebaseTreasuryRepository } from './firebase/treasuryRepository';

export type DataProvider = 'local' | 'firebase';

export const dataProvider = (import.meta.env.VITE_DATA_PROVIDER ?? 'local') as DataProvider;

export const isFirebaseProvider = dataProvider === 'firebase';
export const isLocalProvider = dataProvider === 'local';

let repository: TreasuryRepository | null = null;

export function getTreasuryRepository(): TreasuryRepository {
  if (!repository) {
    repository = isFirebaseProvider
      ? createFirebaseTreasuryRepository()
      : createLocalTreasuryRepository();
  }
  return repository;
}
