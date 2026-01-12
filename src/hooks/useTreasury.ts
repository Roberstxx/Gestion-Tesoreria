import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Category, Period, AppSettings, TransactionType } from '@/types';
import { calculateBalance, getMonthlyStats, getMonthlyComparisons, getWeeklyBreakdown } from '@/utils/calculations';
import { parseISO } from 'date-fns';
import { getTreasuryRepository } from '@/data';
import { getDefaultCategories } from '@/utils/storage';

export function useTreasury() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    currentPeriodId: null,
    hasCompletedOnboarding: false,
    theme: 'light',
  });
  const [loading, setLoading] = useState(true);
  const repository = useMemo(() => getTreasuryRepository(), []);

  // Load data from repository
  useEffect(() => {
    let isMounted = true;

    const loadSnapshot = async () => {
      let snapshot = await repository.getSnapshot();
      if (!isMounted) return;

      if (snapshot.categories.length === 0) {
        const defaults = getDefaultCategories();
        await Promise.all(
          defaults.map((category) =>
            repository.addCategory({
              name: category.name,
              type: category.type,
              isDefault: category.isDefault,
            })
          )
        );
        snapshot = await repository.getSnapshot();
      }

      if (!isMounted) return;

      setTransactions(snapshot.transactions);
      setCategories(snapshot.categories);
      setPeriods(snapshot.periods);
      setSettings(snapshot.settings);
      setLoading(false);
    };

    loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, [repository]);

  // Current period
  const currentPeriod = useMemo(() => {
    if (!settings.currentPeriodId) return null;
    return periods.find((p) => p.id === settings.currentPeriodId) || null;
  }, [periods, settings.currentPeriodId]);

  // Current balance
  const currentBalance = useMemo(() => {
    if (!currentPeriod) return 0;
    return calculateBalance(transactions, currentPeriod.initialFund);
  }, [transactions, currentPeriod]);

  // Monthly stats for current month
  const currentMonthStats = useMemo(() => {
    if (!currentPeriod) return null;
    return getMonthlyStats(transactions, new Date(), currentPeriod.initialFund, transactions);
  }, [transactions, currentPeriod]);

  // Monthly comparisons
  const monthlyComparisons = useMemo(() => {
    if (!currentPeriod) return null;
    return getMonthlyComparisons(transactions, new Date(), currentPeriod.initialFund);
  }, [transactions, currentPeriod]);

  // Transaction operations
  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction = await repository.addTransaction(transaction);
    const snapshot = await repository.getSnapshot();
    setTransactions(snapshot.transactions);
    return newTransaction;
  }, [repository]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    await repository.updateTransaction(id, updates);
    const snapshot = await repository.getSnapshot();
    setTransactions(snapshot.transactions);
  }, [repository]);

  const deleteTransaction = useCallback(async (id: string) => {
    await repository.deleteTransaction(id);
    const snapshot = await repository.getSnapshot();
    setTransactions(snapshot.transactions);
  }, [repository]);

  // Category operations
  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    const newCategory = await repository.addCategory(category);
    const snapshot = await repository.getSnapshot();
    setCategories(snapshot.categories);
    return newCategory;
  }, [repository]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    await repository.updateCategory(id, updates);
    const snapshot = await repository.getSnapshot();
    setCategories(snapshot.categories);
  }, [repository]);

  const deleteCategory = useCallback(async (id: string) => {
    await repository.deleteCategory(id);
    const snapshot = await repository.getSnapshot();
    setCategories(snapshot.categories);
  }, [repository]);

  const getCategoriesByType = useCallback((type: TransactionType) => {
    return categories.filter((c) => c.type === type);
  }, [categories]);

  // Period operations
  const addPeriod = useCallback(async (period: Omit<Period, 'id' | 'createdAt'>) => {
    const newPeriod = await repository.addPeriod(period);
    const snapshot = await repository.getSnapshot();
    setPeriods(snapshot.periods);
    return newPeriod;
  }, [repository]);

  const updatePeriod = useCallback(async (id: string, updates: Partial<Period>) => {
    await repository.updatePeriod(id, updates);
    const snapshot = await repository.getSnapshot();
    setPeriods(snapshot.periods);
  }, [repository]);

  // Settings operations
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const nextSettings = await repository.updateSettings(updates);
    setSettings(nextSettings);
  }, [repository]);

  const completeOnboarding = useCallback(async (periodId: string) => {
    const nextSettings = await repository.updateSettings({
      hasCompletedOnboarding: true,
      currentPeriodId: periodId,
    });
    setSettings(nextSettings);
  }, [repository]);

  // Initialize default categories
  const initializeCategories = useCallback(async () => {
    const snapshot = await repository.getSnapshot();
    if (snapshot.categories.length > 0) {
      setCategories(snapshot.categories);
      return;
    }

    const defaults = getDefaultCategories();
    await Promise.all(
      defaults.map((category) =>
        repository.addCategory({
          name: category.name,
          type: category.type,
          isDefault: category.isDefault,
        })
      )
    );

    const refreshed = await repository.getSnapshot();
    setCategories(refreshed.categories);
  }, [repository]);

  // Get stats for a specific month
  const getStatsForMonth = useCallback((month: Date) => {
    if (!currentPeriod) return null;
    return getMonthlyStats(transactions, month, currentPeriod.initialFund, transactions);
  }, [transactions, currentPeriod]);

  // Get weekly breakdown for a month
  const getWeeklyBreakdownForMonth = useCallback((month: Date) => {
    return getWeeklyBreakdown(transactions, month);
  }, [transactions]);

  // Get category by ID
  const getCategoryById = useCallback((id: string) => {
    return categories.find((c) => c.id === id);
  }, [categories]);

  // Filter transactions
  const filterTransactions = useCallback((filters: {
    startDate?: Date;
    endDate?: Date;
    type?: TransactionType;
    categoryId?: string;
    search?: string;
  }) => {
    return transactions.filter((t) => {
      const date = parseISO(t.date);
      
      if (filters.startDate && date < filters.startDate) return false;
      if (filters.endDate && date > filters.endDate) return false;
      if (filters.type && t.type !== filters.type) return false;
      if (filters.categoryId && t.categoryId !== filters.categoryId) return false;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const category = getCategoryById(t.categoryId);
        if (
          !t.description.toLowerCase().includes(searchLower) &&
          !(category?.name.toLowerCase().includes(searchLower))
        ) {
          return false;
        }
      }
      
      return true;
    }).sort((a, b) => {
      const aTime = new Date(a.createdAt || a.date).getTime();
      const bTime = new Date(b.createdAt || b.date).getTime();
      return bTime - aTime;
    });
  }, [transactions, getCategoryById]);

  return {
    // Data
    transactions,
    categories,
    periods,
    settings,
    currentPeriod,
    currentBalance,
    currentMonthStats,
    monthlyComparisons,
    loading,

    // Transaction operations
    addTransaction,
    updateTransaction,
    deleteTransaction,

    // Category operations
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
    getCategoryById,

    // Period operations
    addPeriod,
    updatePeriod,

    // Settings operations
    updateSettings,
    completeOnboarding,
    initializeCategories,

    // Stats & filtering
    getStatsForMonth,
    getWeeklyBreakdownForMonth,
    filterTransactions,
  };
}
