import { Transaction, Period, Category } from '@/types';
import { generateId, saveTransactions, savePeriods, saveCategories, getDefaultCategories, updateSettings } from './storage';
import { subDays, subWeeks, format, startOfYear, endOfYear, addMonths } from 'date-fns';

function randomAmount(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function randomDate(weeksAgo: number): string {
  const date = subWeeks(new Date(), weeksAgo);
  // Add some randomness within the week
  const daysOffset = Math.floor(Math.random() * 7);
  return format(subDays(date, daysOffset), 'yyyy-MM-dd');
}

export function generateSeedData(): void {
  const categories = getDefaultCategories();
  saveCategories(categories);

  // Create period
  const today = new Date();
  const periodStart = startOfYear(today);
  const periodEnd = endOfYear(addMonths(today, 12));
  
  const period: Period = {
    id: generateId(),
    name: `${format(periodStart, 'yyyy')}-${format(periodEnd, 'yyyy')}`,
    startDate: format(periodStart, 'yyyy-MM-dd'),
    endDate: format(periodEnd, 'yyyy-MM-dd'),
    initialFund: 5000,
    createdAt: new Date().toISOString(),
  };
  savePeriods([period]);
  updateSettings({ currentPeriodId: period.id, hasCompletedOnboarding: true });

  // Generate transactions for last 12 weeks
  const transactions: Transaction[] = [];
  
  const getCategoryId = (type: string, index: number): string => {
    const typeCats = categories.filter(c => c.type === type);
    return typeCats[index % typeCats.length].id;
  };

  // Weekly sales (income)
  for (let week = 0; week < 12; week++) {
    // Saturday sales
    transactions.push({
      id: generateId(),
      type: 'income',
      amount: randomAmount(800, 1500),
      date: randomDate(week),
      categoryId: getCategoryId('income', 0),
      description: `Ventas del sábado semana ${12 - week}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Occasional event sales
    if (week % 3 === 0) {
      transactions.push({
        id: generateId(),
        type: 'income',
        amount: randomAmount(1500, 3000),
        date: randomDate(week),
        categoryId: getCategoryId('income', 1),
        description: 'Ventas de evento especial',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Monthly donations
  for (let month = 0; month < 3; month++) {
    transactions.push({
      id: generateId(),
      type: 'donation',
      amount: randomAmount(500, 2000),
      date: randomDate(month * 4 + 1),
      categoryId: getCategoryId('donation', 0),
      description: 'Donación mensual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Bi-weekly investments
  for (let week = 0; week < 12; week += 2) {
    transactions.push({
      id: generateId(),
      type: 'investment',
      amount: randomAmount(300, 800),
      date: randomDate(week),
      categoryId: getCategoryId('investment', Math.floor(Math.random() * 4)),
      description: 'Compra de insumos para venta',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Monthly expenses
  for (let month = 0; month < 3; month++) {
    // Activity expense
    transactions.push({
      id: generateId(),
      type: 'expense',
      amount: randomAmount(200, 600),
      date: randomDate(month * 4 + 2),
      categoryId: getCategoryId('expense', 0),
      description: 'Gastos de actividad mensual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Materials
    transactions.push({
      id: generateId(),
      type: 'expense',
      amount: randomAmount(100, 300),
      date: randomDate(month * 4 + 3),
      categoryId: getCategoryId('expense', 4),
      description: 'Materiales varios',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Special expenses
  transactions.push({
    id: generateId(),
    type: 'expense',
    amount: randomAmount(400, 800),
    date: randomDate(2),
    categoryId: getCategoryId('expense', 1),
    description: 'Pastel para celebración',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  saveTransactions(transactions);
}

export function hasSeedData(): boolean {
  const stored = localStorage.getItem('treasury_transactions');
  return stored !== null && JSON.parse(stored).length > 0;
}
