// Treasury App Types

export type TransactionType = 'income' | 'donation' | 'investment' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO date string
  categoryId: string;
  description: string;
  tags?: string[];
  paymentMethod?: string;
  receipt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isDefault?: boolean;
}

export interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  initialFund: number;
  createdAt: string;
}

export interface AppSettings {
  currentPeriodId: string | null;
  hasCompletedOnboarding: boolean;
  theme: 'light' | 'dark';
}

export interface MonthlyStats {
  income: number;
  donations: number;
  investments: number;
  expenses: number;
  net: number;
  balance: number;
}

export interface WeeklyBreakdown {
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  income: number;
  donations: number;
  investments: number;
  expenses: number;
  net: number;
}

export interface Comparison {
  current: number;
  previous: number;
  difference: number;
  percentageChange: number | null;
  trend: 'up' | 'down' | 'same' | 'no-data';
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Ingreso (Ventas)',
  donation: 'Donación',
  investment: 'Inversión',
  expense: 'Gasto',
};

export const TRANSACTION_TYPE_COLORS: Record<TransactionType, string> = {
  income: 'hsl(var(--income))',
  donation: 'hsl(var(--donation))',
  investment: 'hsl(var(--investment))',
  expense: 'hsl(var(--expense))',
};
