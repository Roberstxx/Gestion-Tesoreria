// src/data/index.ts
import { TreasuryRepository } from './treasuryRepository';
import { createFirebaseTreasuryRepository } from './firebase/treasuryRepository';
import { hasValidFirebaseConfig, missingFirebaseKeys } from './firebase/firebaseClient';

export type DataProvider = 'firebase';
export const dataProvider = 'firebase';
export const isFirebaseProvider = true;
export const isLocalProvider = false;

let repository: TreasuryRepository | null = null;

export function getTreasuryRepository(): TreasuryRepository {
  if (!repository) {
    // Si falta configuración, lanzamos un error claro
    if (!hasValidFirebaseConfig) {
      throw new Error(
        `Error: Configuración de Firebase incompleta. Faltan: ${missingFirebaseKeys.join(', ')}`
      );
    }
    repository = createFirebaseTreasuryRepository();
  }
  return repository;
}
