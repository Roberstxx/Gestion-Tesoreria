// src/hooks/useTreasury.ts
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

  const applySnapshot = useCallback((snapshot: {
    transactions: Transaction[];
    categories: Category[];
    periods: Period[];
    settings: AppSettings;
  }) => {
    setTransactions(snapshot.transactions);
    setCategories(snapshot.categories);
    setPeriods(snapshot.periods);
    setSettings(snapshot.settings);
  }, []);

  const ensureDefaultCategories = useCallback(async (snapshot: {
    transactions: Transaction[];
    categories: Category[];
    periods: Period[];
    settings: AppSettings;
  }) => {
    // Si ya hay categorías en Firebase, no hacemos nada
    if (snapshot.categories.length > 0) {
      applySnapshot(snapshot);
      return snapshot;
    }

    // Si está vacío, creamos las categorías por defecto directamente en Firebase
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
    applySnapshot(refreshed);
    return refreshed;
  }, [applySnapshot, repository]);

  // Carga de datos inicial (Solo desde el Repositorio de Firebase)
  useEffect(() => {
    let isMounted = true;

    const loadSnapshot = async () => {
      try {
        setLoading(true);
        // Obtenemos los datos directamente de la DB
        const snapshot = await repository.getSnapshot();
        
        if (!isMounted) return;

        // Aseguramos que existan categorías iniciales en la DB si es una cuenta nueva
        await ensureDefaultCategories(snapshot);
      } catch (error) {
        console.error('Error al cargar datos de Firebase:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSnapshot();

    return () => {
      isMounted = false;
    };
  }, [ensureDefaultCategories, repository]);

  // --- Operaciones de datos (Todas llaman al repositorio y refrescan el estado) ---

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction = await repository.addTransaction(transaction);
    const snapshot = await repository.getSnapshot();
    applySnapshot(snapshot);
    return newTransaction;
  }, [applySnapshot, repository]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    await repository.updateTransaction(id, updates);
    const snapshot = await repository.getSnapshot();
    applySnapshot(snapshot);
  }, [applySnapshot, repository]);

  const deleteTransaction = useCallback(async (id: string) => {
    await repository.deleteTransaction(id);
    const snapshot = await repository.getSnapshot();
    applySnapshot(snapshot);
  }, [applySnapshot, repository]);

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

  const resetAllData = useCallback(async () => {
    await repository.resetAll();
    const snapshot = await repository.getSnapshot();
    await ensureDefaultCategories(snapshot);
  }, [ensureDefaultCategories, repository]);

  // Lógica de filtrado y cálculos (se mantiene igual ya que usa el estado actual)
  const currentPeriod = useMemo(() => {
    if (!settings.currentPeriodId) return null;
    return periods.find((p) => p.id === settings.currentPeriodId) || null;
  }, [periods, settings.currentPeriodId]);

  const currentBalance = useMemo(() => {
    if (!currentPeriod) return 0;
    return calculateBalance(transactions, currentPeriod.initialFund);
  }, [transactions, currentPeriod]);

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
        const category = categories.find(c => c.id === t.categoryId);
        if (!t.description.toLowerCase().includes(searchLower) && 
            !(category?.name.toLowerCase().includes(searchLower))) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
  }, [transactions, categories]);

  return {
    transactions, categories, periods, settings, currentPeriod, currentBalance, loading,
    addTransaction, updateTransaction, deleteTransaction,
    addCategory, updateCategory, deleteCategory,
    addPeriod, updatePeriod, updateSettings, completeOnboarding, resetAllData,
    filterTransactions,
    getCategoryById: (id: string) => categories.find(c => c.id === id),
    getCategoriesByType: (type: TransactionType) => categories.filter(c => c.type === type),
    getStatsForMonth: (month: Date) => currentPeriod ? getMonthlyStats(transactions, month, currentPeriod.initialFund, transactions) : null,
    getWeeklyBreakdownForMonth: (month: Date) => getWeeklyBreakdown(transactions, month),
    monthlyComparisons: currentPeriod ? getMonthlyComparisons(transactions, new Date(), currentPeriod.initialFund) : null,
    currentMonthStats: currentPeriod ? getMonthlyStats(transactions, new Date(), currentPeriod.initialFund, transactions) : null,
  };
}
