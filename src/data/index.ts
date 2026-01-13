// src/data/index.ts
import { TreasuryRepository } from './treasuryRepository';
import { createFirebaseTreasuryRepository } from './firebase/treasuryRepository';
import { hasValidFirebaseConfig, missingFirebaseKeys } from './firebase/firebaseClient';

export type DataProvider = 'firebase';
export const dataProvider = 'firebase';
export const isFirebaseProvider = true;
export const isLocalProvider = false;

const repositories = new Map<string, TreasuryRepository>();

export function getTreasuryRepository(userId: string): TreasuryRepository {
  if (!userId) {
    throw new Error('Error: No se encontró un usuario autenticado.');
  }

  const existing = repositories.get(userId);
  if (existing) {
    return existing;
  }

  // Si falta configuración, lanzamos un error claro
  if (!hasValidFirebaseConfig) {
    throw new Error(
      `Error: Configuración de Firebase incompleta. Faltan: ${missingFirebaseKeys.join(', ')}`
    );
  }

  const repository = createFirebaseTreasuryRepository(userId);
  repositories.set(userId, repository);
  return repository;
}
