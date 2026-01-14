import React, { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTreasury } from '@/hooks/useTreasury';
import { AppLayout, StatCard, QuickActionsGrid, TransactionList } from '@/components/treasury';
import { Wallet, TrendingUp, Gift, HandCoins, CreditCard, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    transactions,
    categories,
    currentPeriod,
    currentBalance,
    currentMonthStats,
    monthlyComparisons,
    loading,
    filterTransactions,
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
  const recentTransactions = filterTransactions({}).slice(0, 5);

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

      {/* Monthly Stats Grid */}
      {currentMonthStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard
            title="Ingresos"
            value={currentMonthStats.income}
            variant="income"
            comparison={monthlyComparisons?.income}
            icon={<TrendingUp className="h-5 w-5 text-income" />}
          />
          <StatCard
            title="Donaciones"
            value={currentMonthStats.donations}
            variant="donation"
            icon={<Gift className="h-5 w-5 text-donation" />}
          />
          <StatCard
            title="Cooperación"
            value={currentMonthStats.investments}
            variant="investment"
            icon={<HandCoins className="h-5 w-5 text-investment" />}
          />
          <StatCard
            title="Gastos"
            value={currentMonthStats.expenses}
            variant="expense"
            comparison={monthlyComparisons?.expenses}
            icon={<CreditCard className="h-5 w-5 text-expense" />}
          />
        </div>
      )}

      {/* Net Result */}
      {currentMonthStats && (
        <div className="mb-6">
          <StatCard
            title="Resultado neto del mes"
            value={currentMonthStats.net}
            variant="net"
            comparison={monthlyComparisons?.net}
            icon={<BarChart3 className="h-5 w-5 text-primary" />}
          />
        </div>
      )}

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
