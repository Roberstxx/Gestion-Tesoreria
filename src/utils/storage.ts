import { Transaction, Category, Period, AppSettings, TransactionType } from '@/types';

const STORAGE_KEYS = {
  TRANSACTIONS: 'treasury_transactions',
  CATEGORIES: 'treasury_categories',
  PERIODS: 'treasury_periods',
  SETTINGS: 'treasury_settings',
} as const;

// Generic storage helpers
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Transactions
export function getTransactions(): Transaction[] {
  return getItem<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
}

export function saveTransactions(transactions: Transaction[]): void {
  setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
}

export function addTransaction(transaction: Transaction): void {
  const transactions = getTransactions();
  transactions.push(transaction);
  saveTransactions(transactions);
}

export function updateTransaction(id: string, updates: Partial<Transaction>): void {
  const transactions = getTransactions();
  const index = transactions.findIndex((t) => t.id === id);
  if (index !== -1) {
    transactions[index] = { ...transactions[index], ...updates, updatedAt: new Date().toISOString() };
    saveTransactions(transactions);
  }
}

export function deleteTransaction(id: string): void {
  const transactions = getTransactions().filter((t) => t.id !== id);
  saveTransactions(transactions);
}

// Categories
export function getCategories(): Category[] {
  return getItem<Category[]>(STORAGE_KEYS.CATEGORIES, []);
}

export function saveCategories(categories: Category[]): void {
  setItem(STORAGE_KEYS.CATEGORIES, categories);
}

export function addCategory(category: Category): void {
  const categories = getCategories();
  categories.push(category);
  saveCategories(categories);
}

export function updateCategory(id: string, updates: Partial<Category>): void {
  const categories = getCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index !== -1) {
    categories[index] = { ...categories[index], ...updates };
    saveCategories(categories);
  }
}

export function deleteCategory(id: string): void {
  const categories = getCategories().filter((c) => c.id !== id);
  saveCategories(categories);
}

export function getCategoriesByType(type: TransactionType): Category[] {
  return getCategories().filter((c) => c.type === type);
}

// Periods
export function getPeriods(): Period[] {
  return getItem<Period[]>(STORAGE_KEYS.PERIODS, []);
}

export function savePeriods(periods: Period[]): void {
  setItem(STORAGE_KEYS.PERIODS, periods);
}

export function addPeriod(period: Period): void {
  const periods = getPeriods();
  periods.push(period);
  savePeriods(periods);
}

export function updatePeriod(id: string, updates: Partial<Period>): void {
  const periods = getPeriods();
  const index = periods.findIndex((p) => p.id === id);
  if (index !== -1) {
    periods[index] = { ...periods[index], ...updates };
    savePeriods(periods);
  }
}

export function getCurrentPeriod(): Period | null {
  const settings = getSettings();
  if (!settings.currentPeriodId) return null;
  
  const periods = getPeriods();
  return periods.find((p) => p.id === settings.currentPeriodId) || null;
}

// Settings
export function getSettings(): AppSettings {
  return getItem<AppSettings>(STORAGE_KEYS.SETTINGS, {
    currentPeriodId: null,
    hasCompletedOnboarding: false,
    theme: 'light',
  });
}

export function saveSettings(settings: AppSettings): void {
  setItem(STORAGE_KEYS.SETTINGS, settings);
}

export function updateSettings(updates: Partial<AppSettings>): void {
  const settings = getSettings();
  saveSettings({ ...settings, ...updates });
}

// Default categories
export function getDefaultCategories(): Category[] {
  return [
    // Income
    { id: 'cat-income-1', name: 'Ventas sábado', type: 'income', isDefault: true },
    { id: 'cat-income-2', name: 'Ventas evento', type: 'income', isDefault: true },
    { id: 'cat-income-3', name: 'Otros ingresos', type: 'income', isDefault: true },
    // Donations
    { id: 'cat-donation-1', name: 'Donación', type: 'donation', isDefault: true },
    { id: 'cat-donation-2', name: 'Apoyo', type: 'donation', isDefault: true },
    { id: 'cat-donation-3', name: 'Cooperación', type: 'donation', isDefault: true },
    // Investments
    { id: 'cat-investment-1', name: 'Compra para vender', type: 'investment', isDefault: true },
    { id: 'cat-investment-2', name: 'Insumos', type: 'investment', isDefault: true },
    { id: 'cat-investment-3', name: 'Bebidas', type: 'investment', isDefault: true },
    { id: 'cat-investment-4', name: 'Snacks', type: 'investment', isDefault: true },
    // Expenses
    { id: 'cat-expense-1', name: 'Actividad', type: 'expense', isDefault: true },
    { id: 'cat-expense-2', name: 'Pastel/Comida', type: 'expense', isDefault: true },
    { id: 'cat-expense-3', name: 'Decoración', type: 'expense', isDefault: true },
    { id: 'cat-expense-4', name: 'Apoyo a persona', type: 'expense', isDefault: true },
    { id: 'cat-expense-5', name: 'Materiales', type: 'expense', isDefault: true },
  ];
}

// Initialize with default categories if empty
export function initializeDefaultCategories(): void {
  const categories = getCategories();
  if (categories.length === 0) {
    saveCategories(getDefaultCategories());
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
