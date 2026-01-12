import { Transaction, Category, Period } from '@/types';
import * as storage from '@/utils/storage';
import { normalizeTreasurySnapshot } from '@/utils/consistency';
import { TreasuryRepository, TreasurySnapshot } from './treasuryRepository';

function persistSnapshot(snapshot: TreasurySnapshot): void {
  storage.saveTransactions(snapshot.transactions);
  storage.saveCategories(snapshot.categories);
  storage.savePeriods(snapshot.periods);
  storage.saveSettings(snapshot.settings);
}

export function createLocalTreasuryRepository(): TreasuryRepository {
  return {
    async getSnapshot() {
      const snapshot = {
        transactions: storage.getTransactions(),
        categories: storage.getCategories(),
        periods: storage.getPeriods(),
        settings: storage.getSettings(),
      };

      const normalized = normalizeTreasurySnapshot(snapshot);

      if (normalized.changed) {
        persistSnapshot(normalized.snapshot);
      }

      return normalized.snapshot;
    },
    async addTransaction(data) {
      const newTransaction: Transaction = {
        ...data,
        id: storage.generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.addTransaction(newTransaction);
      return newTransaction;
    },
    async updateTransaction(id, updates) {
      storage.updateTransaction(id, updates);
    },
    async deleteTransaction(id) {
      storage.deleteTransaction(id);
    },
    async addCategory(data) {
      const newCategory: Category = {
        ...data,
        id: storage.generateId(),
      };
      storage.addCategory(newCategory);
      return newCategory;
    },
    async updateCategory(id, updates) {
      storage.updateCategory(id, updates);
    },
    async deleteCategory(id) {
      storage.deleteCategory(id);
    },
    async addPeriod(data) {
      const newPeriod: Period = {
        ...data,
        id: storage.generateId(),
        createdAt: new Date().toISOString(),
      };
      storage.addPeriod(newPeriod);
      return newPeriod;
    },
    async updatePeriod(id, updates) {
      storage.updatePeriod(id, updates);
    },
    async updateSettings(updates) {
      storage.updateSettings(updates);
      return storage.getSettings();
    },
  };
}
