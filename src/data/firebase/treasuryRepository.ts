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

type FirestoreValue =
  | string
  | number
  | boolean
  | null
  | FirestoreValue[]
  | { [key: string]: FirestoreValue };

function sanitizeFirestoreData<T extends Record<string, unknown>>(data: T): FirestoreValue {
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeFirestoreData(item as Record<string, unknown>)
          : (item as FirestoreValue)
      );
  }

  return Object.entries(data).reduce<Record<string, FirestoreValue>>((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }
    if (Array.isArray(value)) {
      acc[key] = value
        .filter((item) => item !== undefined)
        .map((item) =>
          typeof item === 'object' && item !== null
            ? sanitizeFirestoreData(item as Record<string, unknown>)
            : (item as FirestoreValue)
        );
      return acc;
    }
    if (typeof value === 'object' && value !== null) {
      acc[key] = sanitizeFirestoreData(value as Record<string, unknown>);
      return acc;
    }
    acc[key] = value as FirestoreValue;
    return acc;
  }, {});
}

function withDocId<T extends { id: string }>(
  data: Omit<T, 'id'>,
  id: string
): T {
  return { ...(data as Omit<T, 'id'>), id } as T;
}

async function fetchCollection<T extends { id: string }>(
  userId: string,
  name: string
): Promise<T[]> {
  const snapshot = await getDocs(collection(firestore, 'users', userId, name));
  return snapshot.docs.map((docSnap) => withDocId<T>(docSnap.data() as Omit<T, 'id'>, docSnap.id));
}

async function fetchSettings(userId: string): Promise<AppSettings> {
  const settingsRef = doc(firestore, 'users', userId, COLLECTIONS.settings, SETTINGS_DOC_ID);
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

async function saveSettings(userId: string, settings: AppSettings): Promise<void> {
  const settingsRef = doc(firestore, 'users', userId, COLLECTIONS.settings, SETTINGS_DOC_ID);
  await setDoc(settingsRef, settings, { merge: true });
}

export function createFirebaseTreasuryRepository(userId: string): TreasuryRepository {
  return {
    async getSnapshot() {
      const [transactions, categories, periods, settings] = await Promise.all([
        fetchCollection<Transaction>(userId, COLLECTIONS.transactions),
        fetchCollection<Category>(userId, COLLECTIONS.categories),
        fetchCollection<Period>(userId, COLLECTIONS.periods),
        fetchSettings(userId),
      ]);

      const normalized = normalizeTreasurySnapshot({
        transactions,
        categories,
        periods,
        settings,
      });

      if (normalized.changed) {
        await Promise.all([
          saveSettings(userId, normalized.snapshot.settings),
          ...normalized.snapshot.categories.map((category) =>
            setDoc(
              doc(firestore, 'users', userId, COLLECTIONS.categories, category.id),
              category,
              { merge: true }
            )
          ),
          ...normalized.snapshot.periods.map((period) =>
            setDoc(
              doc(firestore, 'users', userId, COLLECTIONS.periods, period.id),
              period,
              { merge: true }
            )
          ),
          ...normalized.snapshot.transactions.map((transaction) =>
            setDoc(
              doc(firestore, 'users', userId, COLLECTIONS.transactions, transaction.id),
              sanitizeFirestoreData(transaction),
              { merge: true }
            )
          ),
        ]);
      }

      return normalized.snapshot;
    },
    async seedSnapshot(snapshot) {
      await Promise.all([
        saveSettings(userId, snapshot.settings),
        ...snapshot.categories.map((category) =>
          setDoc(doc(firestore, 'users', userId, COLLECTIONS.categories, category.id), category)
        ),
        ...snapshot.periods.map((period) =>
          setDoc(doc(firestore, 'users', userId, COLLECTIONS.periods, period.id), period)
        ),
        ...snapshot.transactions.map((transaction) =>
          setDoc(
            doc(firestore, 'users', userId, COLLECTIONS.transactions, transaction.id),
            sanitizeFirestoreData(transaction)
          )
        ),
      ]);
    },
    async resetAll() {
      const collectionNames = [
        COLLECTIONS.transactions,
        COLLECTIONS.categories,
        COLLECTIONS.periods,
      ];

      await Promise.all(
        collectionNames.map(async (name) => {
          const snapshot = await getDocs(collection(firestore, 'users', userId, name));
          await Promise.all(snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref)));
        })
      );

      await deleteDoc(doc(firestore, 'users', userId, COLLECTIONS.settings, SETTINGS_DOC_ID));
    },
    async addTransaction(data) {
      const categories = await fetchCollection<Category>(userId, COLLECTIONS.categories);
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
            setDoc(
              doc(firestore, 'users', userId, COLLECTIONS.categories, category.id),
              category,
              { merge: true }
            )
          )
        );
      }

      const now = new Date().toISOString();
      const transaction: Omit<Transaction, 'id'> = {
        ...normalized.transaction,
        createdAt: now,
        updatedAt: now,
      };
      const docRef = doc(collection(firestore, 'users', userId, COLLECTIONS.transactions));
      const payload = { ...transaction, id: docRef.id };
      await setDoc(docRef, sanitizeFirestoreData(payload));
      return { ...payload };
    },
    async updateTransaction(id, updates) {
      const docRef = doc(firestore, 'users', userId, COLLECTIONS.transactions, id);
      const payload = sanitizeFirestoreData({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(docRef, payload);
    },
    async deleteTransaction(id) {
      const docRef = doc(firestore, 'users', userId, COLLECTIONS.transactions, id);
      await deleteDoc(docRef);
    },
    async addCategory(data) {
      const docRef = doc(collection(firestore, 'users', userId, COLLECTIONS.categories));
      const payload: Category = { ...data, id: docRef.id };
      await setDoc(docRef, payload);
      return payload;
    },
    async updateCategory(id, updates) {
      const docRef = doc(firestore, 'users', userId, COLLECTIONS.categories, id);
      await updateDoc(docRef, updates);
    },
    async deleteCategory(id) {
      const docRef = doc(firestore, 'users', userId, COLLECTIONS.categories, id);
      await deleteDoc(docRef);
    },
    async addPeriod(data) {
      const docRef = doc(collection(firestore, 'users', userId, COLLECTIONS.periods));
      const payload: Period = {
        ...data,
        id: docRef.id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, payload);
      return payload;
    },
    async updatePeriod(id, updates) {
      const docRef = doc(firestore, 'users', userId, COLLECTIONS.periods, id);
      await updateDoc(docRef, updates);
    },
    async updateSettings(updates) {
      const current = await fetchSettings(userId);
      const next: AppSettings = { ...current, ...updates };
      await saveSettings(userId, next);
      return next;
    },
  };
}
