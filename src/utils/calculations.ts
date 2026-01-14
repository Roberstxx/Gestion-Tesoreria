import { Transaction, MonthlyStats, WeeklyBreakdown, Comparison, Period } from '@/types';
import {
  startOfMonth,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  format,
  subMonths,
  eachWeekOfInterval,
  isSameMonth,
  endOfDay,
  isBefore,
} from 'date-fns';
import { es } from 'date-fns/locale';

export function getInvestmentAmount(transaction: Transaction): number {
  return transaction.type === 'investment' ? transaction.amount : 0;
}

export function getTransactionInflow(transaction: Transaction): number {
  if (transaction.type === 'income' || transaction.type === 'donation' || transaction.type === 'investment') {
    return transaction.amount;
  }
  return 0;
}

export function getTransactionOutflow(transaction: Transaction): number {
  return transaction.type === 'expense' ? transaction.amount : 0;
}

export function calculateBalance(
  transactions: Transaction[],
  initialFund: number
): number {
  return transactions.reduce((balance, t) => {
    return balance + getTransactionInflow(t) - getTransactionOutflow(t);
  }, initialFund);
}

export function getTransactionsForPeriod(
  transactions: Transaction[],
  startDate: Date,
  endDate: Date
): Transaction[] {
  return transactions.filter((t) => {
    const date = parseISO(t.date);
    return isWithinInterval(date, { start: startDate, end: endDate });
  });
}

export function getMonthlyStats(
  transactions: Transaction[],
  month: Date,
  initialFund: number,
  allTransactions: Transaction[]
): MonthlyStats {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const monthTransactions = getTransactionsForPeriod(transactions, start, end);

  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const donations = monthTransactions
    .filter((t) => t.type === 'donation')
    .reduce((sum, t) => sum + t.amount, 0);

  const investments = monthTransactions
    .reduce((sum, t) => sum + getInvestmentAmount(t), 0);

  const expenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const net = income + donations + investments - expenses;

  // Calculate balance up to end of this month
  const transactionsUpToMonth = allTransactions.filter(
    (t) => parseISO(t.date) <= end
  );
  const balance = calculateBalance(transactionsUpToMonth, initialFund);

  return { income, donations, investments, expenses, net, balance };
}

export function getWeeklyBreakdown(
  transactions: Transaction[],
  month: Date
): WeeklyBreakdown[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const today = endOfDay(new Date());
  const effectiveEnd = isSameMonth(month, today) ? today : end;

  if (isBefore(effectiveEnd, start)) {
    return [];
  }
  
  const weeks = eachWeekOfInterval(
    { start, end: effectiveEnd },
    { weekStartsOn: 1 } // Monday
  );

  return weeks.map((weekStart, index) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const actualEnd = weekEnd > effectiveEnd ? effectiveEnd : weekEnd;
    const actualStart = weekStart < start ? start : weekStart;

    const weekTransactions = getTransactionsForPeriod(
      transactions,
      actualStart,
      actualEnd
    );

    const income = weekTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const donations = weekTransactions
      .filter((t) => t.type === 'donation')
      .reduce((sum, t) => sum + t.amount, 0);

    const investments = weekTransactions
      .reduce((sum, t) => sum + getInvestmentAmount(t), 0);

    const expenses = weekTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      weekStart: format(actualStart, 'yyyy-MM-dd'),
      weekEnd: format(actualEnd, 'yyyy-MM-dd'),
      weekNumber: index + 1,
      income,
      donations,
      investments,
      expenses,
      net: income + donations + investments - expenses,
    };
  });
}

export function calculateComparison(current: number, previous: number): Comparison {
  const difference = current - previous;
  
  if (previous === 0) {
    return {
      current,
      previous,
      difference,
      percentageChange: null,
      trend: current > 0 ? 'up' : current < 0 ? 'down' : 'same',
    };
  }

  const percentageChange = ((current - previous) / Math.abs(previous)) * 100;
  
  let trend: Comparison['trend'];
  if (Math.abs(percentageChange) < 1) {
    trend = 'same';
  } else if (percentageChange > 0) {
    trend = 'up';
  } else {
    trend = 'down';
  }

  return { current, previous, difference, percentageChange, trend };
}

export function getMonthlyComparisons(
  transactions: Transaction[],
  currentMonth: Date,
  initialFund: number
): {
  income: Comparison;
  expenses: Comparison;
  net: Comparison;
} {
  const previousMonth = subMonths(currentMonth, 1);
  
  const currentStats = getMonthlyStats(transactions, currentMonth, initialFund, transactions);
  const previousStats = getMonthlyStats(transactions, previousMonth, initialFund, transactions);

  return {
    income: calculateComparison(currentStats.income, previousStats.income),
    expenses: calculateComparison(currentStats.expenses, previousStats.expenses),
    net: calculateComparison(currentStats.net, previousStats.net),
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatPercentage(value: number | null): string {
  if (value === null) return 'N/A';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function getTrendMessage(comparison: Comparison, label: string): string {
  if (comparison.trend === 'no-data' || comparison.percentageChange === null) {
    return `Sin datos del mes anterior para ${label.toLowerCase()}`;
  }
  
  const percent = Math.abs(comparison.percentageChange).toFixed(1);
  
  switch (comparison.trend) {
    case 'up':
      return `${label} subió ${percent}% respecto al mes anterior`;
    case 'down':
      return `${label} bajó ${percent}% respecto al mes anterior`;
    case 'same':
      return `${label} se mantuvo igual`;
    default:
      return '';
  }
}
