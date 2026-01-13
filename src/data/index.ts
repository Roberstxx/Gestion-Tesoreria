import { TreasuryRepository } from './treasuryRepository';
import { createLocalTreasuryRepository } from './localTreasuryRepository';
import { createFirebaseTreasuryRepository } from './firebase/treasuryRepository';
import { hasValidFirebaseConfig, missingFirebaseKeys } from './firebase/firebaseClient';

export type DataProvider = 'local' | 'firebase';

export const dataProvider = (import.meta.env.VITE_DATA_PROVIDER ?? 'firebase') as DataProvider;

export const isFirebaseProvider = dataProvider === 'firebase';
export const isLocalProvider = dataProvider === 'local';

let repository: TreasuryRepository | null = null;

export function getTreasuryRepository(): TreasuryRepository {
  if (!repository) {
    if (isFirebaseProvider && !hasValidFirebaseConfig) {
      throw new Error(
        `Firebase config inválida. Faltan: ${missingFirebaseKeys.join(
          ', '
        )}. Revisa las variables VITE_FIREBASE_* en tu entorno.`
      );
    }
    repository = isFirebaseProvider
      ? createFirebaseTreasuryRepository()
      : createLocalTreasuryRepository();
  }
  return repository;
}
