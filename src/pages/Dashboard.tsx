import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTreasury } from '@/hooks/useTreasury';
import { AppLayout, StatCard, QuickActionsGrid, TransactionList } from '@/components/treasury';
import { Wallet, TrendingUp, Gift, HandCoins, CreditCard, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { getInvestmentAmount, getTransactionInflow } from '@/utils/calculations';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    transactions,
    currentPeriodTransactions,
    categories,
    currentPeriod,
    currentBalance,
    loading,
    error,
  } = useTreasury();

  if (loading) {
    return (
      <AppLayout title="Cargando...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Cargando datos...</div>
        </div>
      </AppLayout>
    );
  }

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: es });
  const recentTransactions = currentPeriodTransactions.slice().sort((a, b) => {
    const aTime = new Date(a.createdAt || a.date).getTime();
    const bTime = new Date(b.createdAt || b.date).getTime();
    return bTime - aTime;
  }).slice(0, 5);

  const allTimeStats = transactions.reduce((acc, transaction) => {
    if (transaction.type === 'income') acc.income += getTransactionInflow(transaction);
    if (transaction.type === 'donation') acc.donations += transaction.amount;
    if (transaction.type === 'expense') acc.expenses += transaction.amount;

    acc.investments += getInvestmentAmount(transaction);

    return acc;
  }, { income: 0, donations: 0, investments: 0, expenses: 0 });

  const accumulatedNet =
    allTimeStats.income + allTimeStats.donations - allTimeStats.expenses;

  const handleQuickAction = (type: string) => {
    navigate(`/register?type=${type}`);
  };

  const ChartSkeleton = ({ title }: { title: string }) => (
    <div className="card-treasury">
      <h3 className="text-title mb-4">{title}</h3>
      <div className="h-64 flex items-center justify-center">
        <span className="animate-pulse text-muted-foreground">Cargando gráfica...</span>
      </div>
    </div>
  );

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`${currentMonth} • ${currentPeriod?.name || 'Sin periodo'}`}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Balance Card */}
      <div className="mb-6">
        <StatCard
          title="Saldo actual en caja"
          value={currentBalance}
          icon={<Wallet className="h-6 w-6 text-primary-foreground" />}
          variant="balance"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-title mb-3">Registrar movimiento</h2>
        <QuickActionsGrid onSelect={handleQuickAction} />
      </div>

      {/* Accumulated Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          title="Ingresos netos (ventas)"
          value={allTimeStats.income}
          variant="income"
          icon={<TrendingUp className="h-5 w-5 text-income" />}
        />
        <StatCard
          title="Donaciones"
          value={allTimeStats.donations}
          variant="donation"
          icon={<Gift className="h-5 w-5 text-donation" />}
        />
        <StatCard
          title="Cooperación 10 pesos"
          value={allTimeStats.investments}
          variant="investment"
          icon={<HandCoins className="h-5 w-5 text-investment" />}
        />
        <StatCard
          title="Gastos"
          value={allTimeStats.expenses}
          variant="expense"
          icon={<CreditCard className="h-5 w-5 text-expense" />}
        />
      </div>

      {/* Net Result */}
      <div className="mb-6">
        <StatCard
          title="Resultado neto acumulado"
          value={accumulatedNet}
          variant="net"
          icon={<BarChart3 className="h-5 w-5 text-primary" />}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {currentPeriod && (
          <Suspense fallback={<ChartSkeleton title="Saldo por semana" />}>
            <BalanceLineChart
              transactions={transactions}
              initialFund={currentPeriod.initialFund}
              weeks={8}
            />
          </Suspense>
        )}
        <Suspense fallback={<ChartSkeleton title="Ingresos vs Gastos" />}>
          <IncomeVsExpensesChart transactions={transactions} months={6} />
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton title="Top categorías del mes" />}>
        <CategoryPieChart transactions={transactions} categories={categories} className="mb-6" />
      </Suspense>

      {/* Recent Transactions */}
      <div className="card-treasury">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-title">Últimos movimientos</h3>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-primary hover:underline"
          >
            Ver todos
          </button>
        </div>
        <TransactionList
          transactions={recentTransactions}
          categories={categories}
          onClick={() => navigate('/history')}
          emptyMessage="No hay movimientos registrados"
        />
      </div>
    </AppLayout>
  );
}

const BalanceLineChart = React.lazy(() =>
  import('@/components/treasury/Charts').then((module) => ({
    default: module.BalanceLineChart,
  }))
);

const IncomeVsExpensesChart = React.lazy(() =>
  import('@/components/treasury/Charts').then((module) => ({
    default: module.IncomeVsExpensesChart,
  }))
);

const CategoryPieChart = React.lazy(() =>
  import('@/components/treasury/Charts').then((module) => ({
    default: module.CategoryPieChart,
  }))
);
