// src/data/index.ts
import { TreasuryRepository } from './treasuryRepository';
import { createFirebaseTreasuryRepository } from './firebase/treasuryRepository';
import { hasValidFirebaseConfig, missingFirebaseKeys } from './firebase/firebaseClient';

// Forzamos el uso de Firebase siempre
export type DataProvider = 'firebase';
export const dataProvider = 'firebase';
export const isFirebaseProvider = true;
export const isLocalProvider = false;

let repository: TreasuryRepository | null = null;

export function getTreasuryRepository(): TreasuryRepository {
  if (!repository) {
    // Si la configuración de Firebase es inválida, lanzamos error inmediatamente
    if (!hasValidFirebaseConfig) {
      throw new Error(
        `Error Crítico: Configuración de Firebase inválida. Faltan: ${missingFirebaseKeys.join(
          ', '
        )}. Configura las variables VITE_FIREBASE_* en Vercel o tu archivo .env`
      );
    }
    repository = createFirebaseTreasuryRepository();
  }
  return repository;
}
