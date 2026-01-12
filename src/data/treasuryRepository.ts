import { Transaction, Category, Period, AppSettings } from '@/types';

export interface TreasurySnapshot {
  transactions: Transaction[];
  categories: Category[];
  periods: Period[];
  settings: AppSettings;
}

export interface TreasuryRepository {
  getSnapshot: () => Promise<TreasurySnapshot>;
  addTransaction: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Transaction>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (data: Omit<Category, 'id'>) => Promise<Category>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addPeriod: (data: Omit<Period, 'id' | 'createdAt'>) => Promise<Period>;
  updatePeriod: (id: string, updates: Partial<Period>) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<AppSettings>;
}
