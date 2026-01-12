import { Category, Transaction, Period, AppSettings, TransactionType } from '@/types';
import { TreasurySnapshot } from '@/data/treasuryRepository';
import { format, isValid, parseISO } from 'date-fns';

const DEFAULT_SETTINGS: AppSettings = {
  currentPeriodId: null,
  hasCompletedOnboarding: false,
  theme: 'light',
};

const UNCATEGORIZED_PREFIX = 'cat-uncategorized-';

const TRANSACTION_TYPES: TransactionType[] = ['income', 'donation', 'investment', 'expense'];

function isTransactionType(value: string): value is TransactionType {
  return TRANSACTION_TYPES.includes(value as TransactionType);
}

function normalizeDate(value: string): string | null {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
  return format(parsed, 'yyyy-MM-dd');
}

function ensureUncategorizedCategory(categories: Category[], type: TransactionType): Category {
  const id = `${UNCATEGORIZED_PREFIX}${type}`;
  const existing = categories.find((category) => category.id === id);
  if (existing) return existing;

  const created: Category = {
    id,
    name: 'Sin categoría',
    type,
    isDefault: true,
  };

  categories.push(created);
  return created;
}

function normalizeCategories(categories: Category[]): Category[] {
  const seen = new Set<string>();
  const normalized: Category[] = [];

  categories.forEach((category) => {
    if (!category || !category.id || !category.name) return;
    if (!isTransactionType(category.type)) return;
    if (seen.has(category.id)) return;

    seen.add(category.id);
    normalized.push({
      ...category,
      name: category.name.trim() || 'Sin nombre',
      isDefault: category.isDefault ?? false,
    });
  });

  return normalized;
}

function normalizePeriods(periods: Period[]): Period[] {
  return periods
    .filter((period) => period && period.id && period.name)
    .map((period) => {
      const startDate = normalizeDate(period.startDate) ?? period.startDate;
      const endDate = normalizeDate(period.endDate) ?? period.endDate;

      return {
        ...period,
        name: period.name.trim() || 'Periodo',
        startDate,
        endDate,
        initialFund: Number.isFinite(period.initialFund) ? period.initialFund : 0,
        createdAt: period.createdAt || new Date().toISOString(),
      };
    });
}

function normalizeSettings(settings: AppSettings): AppSettings {
  const theme = settings.theme === 'dark' ? 'dark' : 'light';

  return {
    currentPeriodId: settings.currentPeriodId ?? null,
    hasCompletedOnboarding: Boolean(settings.hasCompletedOnboarding),
    theme,
  };
}

function normalizeTransactions(
  transactions: Transaction[],
  categories: Category[]
): { transactions: Transaction[]; categories: Category[] } {
  const normalized: Transaction[] = [];

  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  transactions.forEach((transaction) => {
    if (!transaction || !transaction.id) return;
    if (!isTransactionType(transaction.type)) return;

    const amount = Number(transaction.amount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const normalizedDate = normalizeDate(transaction.date);
    if (!normalizedDate) return;

    let categoryId = transaction.categoryId;
    const category = categoryMap.get(categoryId);
    if (!category || category.type !== transaction.type) {
      const fallbackCategory = ensureUncategorizedCategory(categories, transaction.type);
      categoryId = fallbackCategory.id;
      categoryMap.set(fallbackCategory.id, fallbackCategory);
    }

    const createdAt = transaction.createdAt || new Date().toISOString();
    const updatedAt = transaction.updatedAt || createdAt;

    normalized.push({
      ...transaction,
      amount,
      date: normalizedDate,
      categoryId,
      description: transaction.description?.trim() || '',
      tags: transaction.tags?.filter(Boolean),
      paymentMethod: transaction.paymentMethod?.trim() || undefined,
      receipt: transaction.receipt?.trim() || undefined,
      createdAt,
      updatedAt,
    });
  });

  return { transactions: normalized, categories };
}

export function normalizeTreasurySnapshot(
  snapshot: TreasurySnapshot
): { snapshot: TreasurySnapshot; changed: boolean } {
  const categories = normalizeCategories(snapshot.categories);
  const { transactions, categories: updatedCategories } = normalizeTransactions(
    snapshot.transactions,
    categories
  );
  const periods = normalizePeriods(snapshot.periods);
  const settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...snapshot.settings });

  const periodIds = new Set(periods.map((period) => period.id));
  const currentPeriodId = settings.currentPeriodId && periodIds.has(settings.currentPeriodId)
    ? settings.currentPeriodId
    : periods[0]?.id ?? null;

  const normalizedSnapshot = {
    transactions,
    categories: updatedCategories,
    periods,
    settings: {
      ...settings,
      currentPeriodId,
    },
  };

  const changed =
    JSON.stringify(snapshot.transactions) !== JSON.stringify(transactions) ||
    JSON.stringify(snapshot.categories) !== JSON.stringify(updatedCategories) ||
    JSON.stringify(snapshot.periods) !== JSON.stringify(periods) ||
    JSON.stringify(snapshot.settings) !== JSON.stringify(normalizedSnapshot.settings);

  return { snapshot: normalizedSnapshot, changed };
}

export type TransactionInput = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

export function normalizeTransactionInput(
  input: TransactionInput,
  categories: Category[]
): { transaction: TransactionInput; categories: Category[]; changed: boolean } | null {
  if (!input) return null;
  if (!isTransactionType(input.type)) return null;

  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const normalizedDate = normalizeDate(input.date);
  if (!normalizedDate) return null;

  const updatedCategories = [...categories];
  const categoryMap = new Map(updatedCategories.map((category) => [category.id, category]));

  let categoryId = input.categoryId;
  const category = categoryMap.get(categoryId);
  if (!category || category.type !== input.type) {
    const fallbackCategory = ensureUncategorizedCategory(updatedCategories, input.type);
    categoryId = fallbackCategory.id;
    categoryMap.set(fallbackCategory.id, fallbackCategory);
  }

  const transaction: TransactionInput = {
    ...input,
    amount,
    date: normalizedDate,
    categoryId,
    description: input.description?.trim() || '',
    tags: input.tags?.filter(Boolean),
    paymentMethod: input.paymentMethod?.trim() || undefined,
    receipt: input.receipt?.trim() || undefined,
  };

  const changed =
    JSON.stringify(input) !== JSON.stringify(transaction) ||
    updatedCategories.length !== categories.length;

  return { transaction, categories: updatedCategories, changed };
}
