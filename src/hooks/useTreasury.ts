import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, Category, Period, AppSettings, TransactionType } from '@/types';
import { calculateBalance, getMonthlyStats, getMonthlyComparisons, getWeeklyBreakdown } from '@/utils/calculations';
import { parseISO, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { getTreasuryRepository } from '@/data';
import { getDefaultCategories } from '@/utils/storage';
import { useAuth } from '@/context/AuthContext';

export function useTreasury() {
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

  // Obtiene el repositorio de Firebase (configurado en src/data/index.ts)
  const repository = useMemo(() => {
    if (!user?.uid) {
      throw new Error('No hay un usuario autenticado para cargar datos.');
    }
    return getTreasuryRepository(user.uid);
  }, [user?.uid]);

  // Función para actualizar el estado local con los datos de la nube
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

  // Asegura que existan categorías en Firebase para poder clasificar movimientos
  const ensureDefaultCategories = useCallback(async (snapshot: {
    transactions: Transaction[];
    categories: Category[];
    periods: Period[];
    settings: AppSettings;
  }) => {
    if (snapshot.categories.length > 0) {
      return snapshot;
    }

    // Si Firebase no tiene categorías, las creamos directamente en la nube
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

    // Refrescamos para obtener los IDs generados por Firebase
    const refreshed = await repository.getSnapshot();
    return refreshed;
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

  // Carga inicial de datos desde Firebase
  useEffect(() => {
    let isMounted = true;

    const loadSnapshot = async () => {
      try {
        setLoading(true);
        // Traer datos directamente de Firestore
        const snapshot = await repository.getSnapshot();
        
        if (!isMounted) return;

        // Validar e inicializar categorías base en la DB si es necesario
        const withCategories = await ensureDefaultCategories(snapshot);
        const withPeriod = await ensureCurrentPeriod(withCategories);
        applySnapshot(withPeriod);
      } catch (error) {
        console.error('Error cargando datos de Firebase:', error);
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
  }, [applySnapshot, ensureCurrentPeriod, ensureDefaultCategories, repository]);

  // --- Operaciones de Transacciones ---

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTransaction = await repository.addTransaction(transaction);
    // Sincronizar inmediatamente después de guardar
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

  // --- Operaciones de Categorías ---

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

  const getCategoryById = useCallback((id: string) => {
    return categories.find((c) => c.id === id);
  }, [categories]);

  // --- Operaciones de Periodos y Ajustes ---

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
    const withCategories = await ensureDefaultCategories(snapshot);
    const withPeriod = await ensureCurrentPeriod(withCategories);
    applySnapshot(withPeriod);
  }, [applySnapshot, ensureCurrentPeriod, ensureDefaultCategories, repository]);

  // --- Lógica de cálculos y filtrado ---

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
    getStatsForMonth: (month: Date) => currentPeriod ? getMonthlyStats(transactions, month, currentPeriod.initialFund, transactions) : null,
    getWeeklyBreakdownForMonth: (month: Date) => getWeeklyBreakdown(transactions, month),
    monthlyComparisons: currentPeriod ? getMonthlyComparisons(transactions, new Date(), currentPeriod.initialFund) : null,
    currentMonthStats: currentPeriod ? getMonthlyStats(transactions, new Date(), currentPeriod.initialFund, transactions) : null,
  };
}
