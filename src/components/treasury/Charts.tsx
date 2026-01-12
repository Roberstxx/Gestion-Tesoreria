import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, Category } from '@/types';
import { format, parseISO, endOfWeek, subWeeks, eachWeekOfInterval, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCurrency, getInvestmentAmount, getTransactionInflow, getTransactionOutflow } from '@/utils/calculations';

const CHART_COLORS = {
  income: 'hsl(142, 71%, 45%)',
  donation: 'hsl(199, 89%, 48%)',
  investment: 'hsl(38, 92%, 50%)',
  expense: 'hsl(0, 84%, 60%)',
  primary: 'hsl(217, 91%, 60%)',
  secondary: 'hsl(189, 94%, 43%)',
};

interface BalanceLineChartProps {
  transactions: Transaction[];
  initialFund: number;
  weeks?: number;
  className?: string;
}

export function BalanceLineChart({ transactions, initialFund, weeks = 12, className }: BalanceLineChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const weekIntervals = eachWeekOfInterval(
      { start: subWeeks(now, weeks - 1), end: now },
      { weekStartsOn: 1 }
    );

    let runningBalance = initialFund;
    const weeklyData = weekIntervals.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      
      // Get transactions up to this week
      const weekTransactions = transactions.filter((t) => {
        const date = parseISO(t.date);
        return date <= weekEnd;
      });

      runningBalance = weekTransactions.reduce((balance, t) => {
        return balance + getTransactionInflow(t) - getTransactionOutflow(t);
      }, initialFund);

      return {
        name: format(weekStart, 'd MMM', { locale: es }),
        saldo: runningBalance,
      };
    });

    return weeklyData;
  }, [transactions, initialFund, weeks]);

  return (
    <div className={cn('card-treasury', className)}>
      <h3 className="text-title mb-4">Saldo por semana</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), 'Saldo']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line
              type="monotone"
              dataKey="saldo"
              stroke={CHART_COLORS.primary}
              strokeWidth={3}
              dot={{ fill: CHART_COLORS.primary, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, stroke: CHART_COLORS.primary, strokeWidth: 2, fill: 'white' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface IncomeVsExpensesChartProps {
  transactions: Transaction[];
  months?: number;
  className?: string;
}

export function IncomeVsExpensesChart({ transactions, months = 6, className }: IncomeVsExpensesChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const monthIntervals = eachMonthOfInterval({
      start: subMonths(now, months - 1),
      end: now,
    });

    return monthIntervals.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions.filter((t) => {
        const date = parseISO(t.date);
        return date >= monthStart && date <= monthEnd;
      });

      const income = monthTransactions.reduce((sum, t) => sum + getTransactionInflow(t), 0);

      const expenses = monthTransactions.reduce((sum, t) => {
        const investmentOutflow = getInvestmentAmount(t);
        const expenseOutflow = t.type === 'expense' ? t.amount : 0;
        return sum + investmentOutflow + expenseOutflow;
      }, 0);

      return {
        name: format(month, 'MMM', { locale: es }),
        Ingresos: income,
        Gastos: expenses,
      };
    });
  }, [transactions, months]);

  return (
    <div className={cn('card-treasury', className)}>
      <h3 className="text-title mb-4">Ingresos vs Gastos</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Bar dataKey="Ingresos" fill={CHART_COLORS.income} radius={[4, 4, 0, 0]} />
            <Bar dataKey="Gastos" fill={CHART_COLORS.expense} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface CategoryPieChartProps {
  transactions: Transaction[];
  categories: Category[];
  month?: Date;
  className?: string;
}

export function CategoryPieChart({ transactions, categories, month = new Date(), className }: CategoryPieChartProps) {
  const data = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const monthTransactions = transactions.filter((t) => {
      const date = parseISO(t.date);
      return date >= monthStart && date <= monthEnd;
    });

    // Group by category
    const categoryTotals = new Map<string, number>();
    monthTransactions.forEach((t) => {
      const current = categoryTotals.get(t.categoryId) || 0;
      categoryTotals.set(t.categoryId, current + t.amount);
    });

    return Array.from(categoryTotals.entries())
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId);
        return {
          name: category?.name || 'Sin categoría',
          value: amount,
          type: category?.type,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5 categories
  }, [transactions, categories, month]);

  const getColor = (type?: string) => {
    switch (type) {
      case 'income': return CHART_COLORS.income;
      case 'donation': return CHART_COLORS.donation;
      case 'investment': return CHART_COLORS.investment;
      case 'expense': return CHART_COLORS.expense;
      default: return CHART_COLORS.primary;
    }
  };

  if (data.length === 0) {
    return (
      <div className={cn('card-treasury', className)}>
        <h3 className="text-title mb-4">Distribución por categoría</h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground">Sin datos este mes</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('card-treasury', className)}>
      <h3 className="text-title mb-4">Top categorías del mes</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getColor(entry.type)} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
