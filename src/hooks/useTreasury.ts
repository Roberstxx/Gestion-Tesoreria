import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Category, Period, AppSettings, TransactionType } from '@/types';
import * as storage from '@/utils/storage';
import { calculateBalance, getMonthlyStats, getMonthlyComparisons, getWeeklyBreakdown } from '@/utils/calculations';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';

export function useTreasury() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [loading, setLoading] = useState(true);

  // Load data from localStorage
  useEffect(() => {
    setTransactions(storage.getTransactions());
    setCategories(storage.getCategories());
    setPeriods(storage.getPeriods());
    setSettings(storage.getSettings());
    setLoading(false);
  }, []);

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
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: storage.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.addTransaction(newTransaction);
    setTransactions(storage.getTransactions());
    return newTransaction;
  }, []);

  const updateTransaction = useCallback((id: string, updates: Partial<Transaction>) => {
    storage.updateTransaction(id, updates);
    setTransactions(storage.getTransactions());
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    storage.deleteTransaction(id);
    setTransactions(storage.getTransactions());
  }, []);

  // Category operations
  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = {
      ...category,
      id: storage.generateId(),
    };
    storage.addCategory(newCategory);
    setCategories(storage.getCategories());
    return newCategory;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    storage.updateCategory(id, updates);
    setCategories(storage.getCategories());
  }, []);

  const deleteCategory = useCallback((id: string) => {
    storage.deleteCategory(id);
    setCategories(storage.getCategories());
  }, []);

  const getCategoriesByType = useCallback((type: TransactionType) => {
    return categories.filter((c) => c.type === type);
  }, [categories]);

  // Period operations
  const addPeriod = useCallback((period: Omit<Period, 'id' | 'createdAt'>) => {
    const newPeriod: Period = {
      ...period,
      id: storage.generateId(),
      createdAt: new Date().toISOString(),
    };
    storage.addPeriod(newPeriod);
    setPeriods(storage.getPeriods());
    return newPeriod;
  }, []);

  const updatePeriod = useCallback((id: string, updates: Partial<Period>) => {
    storage.updatePeriod(id, updates);
    setPeriods(storage.getPeriods());
  }, []);

  // Settings operations
  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    storage.updateSettings(updates);
    setSettings(storage.getSettings());
  }, []);

  const completeOnboarding = useCallback((periodId: string) => {
    storage.updateSettings({
      hasCompletedOnboarding: true,
      currentPeriodId: periodId,
    });
    setSettings(storage.getSettings());
  }, []);

  // Initialize default categories
  const initializeCategories = useCallback(() => {
    storage.initializeDefaultCategories();
    setCategories(storage.getCategories());
  }, []);

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
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
