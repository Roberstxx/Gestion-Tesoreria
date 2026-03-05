import { useState, useEffect, useCallback, useMemo, createContext, useContext, ReactNode, createElement } from 'react';
import { Transaction, Category, Period, AppSettings, TransactionType } from '@/types';
import { calculateBalance, getMonthlyStats, getMonthlyComparisons, getWeeklyBreakdown } from '@/utils/calculations';
import { parseISO, startOfMonth, endOfMonth, format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTreasuryRepository } from '@/data';
import { getDefaultCategories } from '@/data/defaultCategories';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseErrorMessage } from '@/utils/firebaseErrors';

function useTreasuryState() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    currentPeriodId: null,
    hasCompletedOnboarding: false,
    theme: 'light',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const repository = useMemo(() => {
    if (!user?.uid) {
      throw new Error('No hay un usuario autenticado para cargar datos.');
    }
    return getTreasuryRepository(user.uid);
  }, [user?.uid]);

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
    if (snapshot.categories.length > 0) {
      return snapshot;
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

    return repository.getSnapshot();
  }, [repository]);

  const ensureCurrentPeriod = useCallback(async (snapshot: {
    transactions: Transaction[];
    categories: Category[];
    periods: Period[];
    settings: AppSettings;
  }) => {
    if (snapshot.periods.length > 0 && snapshot.settings.currentPeriodId) {
      return snapshot;
    }

    if (snapshot.periods.length > 0) {
      await repository.updateSettings({
        currentPeriodId: snapshot.periods[0].id,
      });
      return repository.getSnapshot();
    }

    const now = new Date();
    const defaultPeriod = await repository.addPeriod({
      name: format(now, 'MMMM yyyy', { locale: es }),
      startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
      initialFund: 0,
    });

    await repository.updateSettings({
      currentPeriodId: defaultPeriod.id,
      hasCompletedOnboarding: true,
    });

    return repository.getSnapshot();
  }, [repository]);

  const reloadSnapshot = useCallback(async () => {
    const snapshot = await repository.getSnapshot();
    const withCategories = await ensureDefaultCategories(snapshot);
    const withPeriod = await ensureCurrentPeriod(withCategories);
    applySnapshot(withPeriod);
    return withPeriod;
  }, [applySnapshot, ensureCurrentPeriod, ensureDefaultCategories, repository]);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const loadSnapshot = async () => {
      try {
        setLoading(true);
        setError(null);
        await reloadSnapshot();

        if (!isMounted || !repository.subscribeSnapshot) {
          return;
        }

        unsubscribe = repository.subscribeSnapshot((snapshot) => {
          if (!isMounted) return;
          applySnapshot(snapshot);
          setLoading(false);
        });
      } catch (error) {
        const message = getFirebaseErrorMessage(error, 'Error cargando datos de Firebase');
        setError(message);
        console.error('Error cargando datos de Firebase:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadSnapshot();

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [applySnapshot, reloadSnapshot, repository]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const newTransaction = await repository.addTransaction(transaction);
      await reloadSnapshot();
      return newTransaction;
    } catch (error) {
      const message = getFirebaseErrorMessage(error, 'No se pudo guardar el movimiento en Firestore');
      setError(message);
      throw new Error(message);
    }
  }, [reloadSnapshot, repository]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      setError(null);
      await repository.updateTransaction(id, updates);
      await reloadSnapshot();
    } catch (error) {
      const message = getFirebaseErrorMessage(error, 'No se pudo actualizar el movimiento en Firestore');
      setError(message);
      throw new Error(message);
    }
  }, [reloadSnapshot, repository]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      setError(null);
      await repository.deleteTransaction(id);
      await reloadSnapshot();
    } catch (error) {
      const message = getFirebaseErrorMessage(error, 'No se pudo eliminar el movimiento de Firestore');
      setError(message);
      throw new Error(message);
    }
  }, [reloadSnapshot, repository]);

  const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
    const newCategory = await repository.addCategory(category);
    const snapshot = await reloadSnapshot();
    setCategories(snapshot.categories);
    return newCategory;
  }, [reloadSnapshot, repository]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Category>) => {
    await repository.updateCategory(id, updates);
    const snapshot = await reloadSnapshot();
    setCategories(snapshot.categories);
  }, [reloadSnapshot, repository]);

  const deleteCategory = useCallback(async (id: string) => {
    await repository.deleteCategory(id);
    const snapshot = await reloadSnapshot();
    setCategories(snapshot.categories);
  }, [reloadSnapshot, repository]);

  const getCategoriesByType = useCallback((type: TransactionType) => {
    return categories.filter((c) => c.type === type);
  }, [categories]);

  const getCategoryById = useCallback((id: string) => {
    return categories.find((c) => c.id === id);
  }, [categories]);

  const addPeriod = useCallback(async (period: Omit<Period, 'id' | 'createdAt'>) => {
    const newPeriod = await repository.addPeriod(period);
    const snapshot = await reloadSnapshot();
    setPeriods(snapshot.periods);
    return newPeriod;
  }, [reloadSnapshot, repository]);

  const updatePeriod = useCallback(async (id: string, updates: Partial<Period>) => {
    await repository.updatePeriod(id, updates);
    const snapshot = await reloadSnapshot();
    setPeriods(snapshot.periods);
  }, [reloadSnapshot, repository]);

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
    await reloadSnapshot();
  }, [reloadSnapshot, repository]);

  const currentPeriod = useMemo(() => {
    if (!settings.currentPeriodId) return null;
    return periods.find((p) => p.id === settings.currentPeriodId) || null;
  }, [periods, settings.currentPeriodId]);

  const currentPeriodTransactions = useMemo(() => {
    if (!currentPeriod) return [];

    const start = startOfDay(parseISO(currentPeriod.startDate));
    const end = endOfDay(parseISO(currentPeriod.endDate));

    return transactions.filter((transaction) => {
      const date = parseISO(transaction.date);
      return isWithinInterval(date, { start, end });
    });
  }, [currentPeriod, transactions]);

  const statsReferenceDate = useMemo(() => new Date(), []);

  const currentBalance = useMemo(() => {
    if (!currentPeriod) return 0;
    return calculateBalance(transactions, currentPeriod.initialFund);
  }, [transactions, currentPeriod]);

  useEffect(() => {
    if (!user?.uid || repository.subscribeSnapshot) return;

    const syncFromCloud = () => {
      void reloadSnapshot();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncFromCloud();
      }
    };

    const onFocus = () => {
      syncFromCloud();
    };

    const interval = window.setInterval(syncFromCloud, 15000);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [reloadSnapshot, repository.subscribeSnapshot, user?.uid]);

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
    transactions,
    categories,
    periods,
    settings,
    currentPeriod,
    currentBalance,
    loading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoriesByType,
    getCategoryById,
    addPeriod,
    updatePeriod,
    updateSettings,
    completeOnboarding,
    resetAllData,
    filterTransactions,
    currentPeriodTransactions,
    getStatsForMonth: (month: Date) => currentPeriod ? getMonthlyStats(transactions, month, currentPeriod.initialFund, transactions) : null,
    getWeeklyBreakdownForMonth: (month: Date) => getWeeklyBreakdown(transactions, month),
    monthlyComparisons: currentPeriod ? getMonthlyComparisons(transactions, statsReferenceDate, currentPeriod.initialFund) : null,
    currentMonthStats: currentPeriod ? getMonthlyStats(transactions, statsReferenceDate, currentPeriod.initialFund, transactions) : null,
  };
}

type TreasuryContextValue = ReturnType<typeof useTreasuryState>;

const TreasuryContext = createContext<TreasuryContextValue | null>(null);

export function TreasuryProvider({ children }: { children: ReactNode }) {
  const value = useTreasuryState();
  return createElement(TreasuryContext.Provider, { value }, children);
}

export function useTreasury() {
  const context = useContext(TreasuryContext);

  if (!context) {
    throw new Error('useTreasury debe usarse dentro de TreasuryProvider.');
  }

  return context;
}
