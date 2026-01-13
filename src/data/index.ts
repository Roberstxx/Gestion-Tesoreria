import { TreasuryRepository } from './treasuryRepository';
import { createLocalTreasuryRepository } from './localTreasuryRepository';
import { createFirebaseTreasuryRepository } from './firebase/treasuryRepository';
import { hasValidFirebaseConfig, missingFirebaseKeys } from './firebase/firebaseClient';

export type DataProvider = 'local' | 'firebase';

export const dataProvider = 'firebase';

export const isFirebaseProvider = true;
export const isLocalProvider = false;

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
    repository = createFirebaseTreasuryRepository();
  }
  return repository;
}
