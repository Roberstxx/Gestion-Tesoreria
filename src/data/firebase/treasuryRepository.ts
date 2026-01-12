import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Transaction, Category, Period, AppSettings } from '@/types';
import { firestore } from './firebaseClient';
import { normalizeTreasurySnapshot, normalizeTransactionInput } from '@/utils/consistency';
import { TreasuryRepository } from '../treasuryRepository';

const COLLECTIONS = {
  transactions: 'transactions',
  categories: 'categories',
  periods: 'periods',
  settings: 'settings',
};

const SETTINGS_DOC_ID = 'app';

function withDocId<T extends { id: string }>(
  data: Omit<T, 'id'>,
  id: string
): T {
  return { ...(data as Omit<T, 'id'>), id } as T;
}

async function fetchCollection<T extends { id: string }>(
  name: string
): Promise<T[]> {
  const snapshot = await getDocs(collection(firestore, name));
  return snapshot.docs.map((docSnap) => withDocId<T>(docSnap.data() as Omit<T, 'id'>, docSnap.id));
}

async function fetchSettings(): Promise<AppSettings> {
  const settingsRef = doc(firestore, COLLECTIONS.settings, SETTINGS_DOC_ID);
  const snapshot = await getDoc(settingsRef);
  if (!snapshot.exists()) {
    return {
      currentPeriodId: null,
      hasCompletedOnboarding: false,
      theme: 'light',
    };
  }
  return snapshot.data() as AppSettings;
}

async function saveSettings(settings: AppSettings): Promise<void> {
  const settingsRef = doc(firestore, COLLECTIONS.settings, SETTINGS_DOC_ID);
  await setDoc(settingsRef, settings, { merge: true });
}

export function createFirebaseTreasuryRepository(): TreasuryRepository {
  return {
    async getSnapshot() {
      const [transactions, categories, periods, settings] = await Promise.all([
        fetchCollection<Transaction>(COLLECTIONS.transactions),
        fetchCollection<Category>(COLLECTIONS.categories),
        fetchCollection<Period>(COLLECTIONS.periods),
        fetchSettings(),
      ]);

      const normalized = normalizeTreasurySnapshot({
        transactions,
        categories,
        periods,
        settings,
      });

      if (normalized.changed) {
        await Promise.all([
          saveSettings(normalized.snapshot.settings),
          ...normalized.snapshot.categories.map((category) =>
            setDoc(doc(firestore, COLLECTIONS.categories, category.id), category, { merge: true })
          ),
          ...normalized.snapshot.periods.map((period) =>
            setDoc(doc(firestore, COLLECTIONS.periods, period.id), period, { merge: true })
          ),
        ]);
      }

      return normalized.snapshot;
    },
    async addTransaction(data) {
      const categories = await fetchCollection<Category>(COLLECTIONS.categories);
      const normalized = normalizeTransactionInput(data, categories);
      if (!normalized) {
        throw new Error('Movimiento inválido para guardar.');
      }

      const existingCategoryIds = new Set(categories.map((category) => category.id));
      const newCategories = normalized.categories.filter(
        (category) => !existingCategoryIds.has(category.id)
      );

      if (newCategories.length > 0) {
        await Promise.all(
          newCategories.map((category) =>
            setDoc(doc(firestore, COLLECTIONS.categories, category.id), category, { merge: true })
          )
        );
      }

      const now = new Date().toISOString();
      const transaction: Omit<Transaction, 'id'> = {
        ...normalized.transaction,
        createdAt: now,
        updatedAt: now,
      };
      const docRef = doc(collection(firestore, COLLECTIONS.transactions));
      const payload = { ...transaction, id: docRef.id };
      await setDoc(docRef, payload);
      return { ...payload };
    },
    async updateTransaction(id, updates) {
      const docRef = doc(firestore, COLLECTIONS.transactions, id);
      await updateDoc(docRef, { ...updates, updatedAt: new Date().toISOString() });
    },
    async deleteTransaction(id) {
      const docRef = doc(firestore, COLLECTIONS.transactions, id);
      await deleteDoc(docRef);
    },
    async addCategory(data) {
      const docRef = doc(collection(firestore, COLLECTIONS.categories));
      const payload: Category = { ...data, id: docRef.id };
      await setDoc(docRef, payload);
      return payload;
    },
    async updateCategory(id, updates) {
      const docRef = doc(firestore, COLLECTIONS.categories, id);
      await updateDoc(docRef, updates);
    },
    async deleteCategory(id) {
      const docRef = doc(firestore, COLLECTIONS.categories, id);
      await deleteDoc(docRef);
    },
    async addPeriod(data) {
      const docRef = doc(collection(firestore, COLLECTIONS.periods));
      const payload: Period = {
        ...data,
        id: docRef.id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, payload);
      return payload;
    },
    async updatePeriod(id, updates) {
      const docRef = doc(firestore, COLLECTIONS.periods, id);
      await updateDoc(docRef, updates);
    },
    async updateSettings(updates) {
      const current = await fetchSettings();
      const next: AppSettings = { ...current, ...updates };
      await saveSettings(next);
      return next;
    },
  };
}
