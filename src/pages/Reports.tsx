import React, { useState, useMemo } from 'react';
import { AppLayout } from '@/components/treasury';
import { useTreasury } from '@/hooks/useTreasury';
import { formatCurrency } from '@/utils/calculations';
import { generatePdfReport, generateCsvReport } from '@/utils/exportPdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function Reports() {
  const { 
    transactions, 
    categories, 
    currentPeriod, 
    getStatsForMonth, 
    getWeeklyBreakdownForMonth,
    filterTransactions,
    loading,
  } = useTreasury();
  const { toast } = useToast();
  
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  
  // Generate last 12 months for selection
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = subMonths(now, i);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: es }),
      });
    }
    return months;
  }, []);
  
  // Get stats for selected month
  const selectedDate = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1);
  }, [selectedMonth]);
  
  const stats = useMemo(() => getStatsForMonth(selectedDate), [selectedDate, getStatsForMonth]);
  const weeklyBreakdown = useMemo(() => getWeeklyBreakdownForMonth(selectedDate), [selectedDate, getWeeklyBreakdownForMonth]);
  const previousMonthStats = useMemo(() => getStatsForMonth(subMonths(selectedDate, 1)), [selectedDate, getStatsForMonth]);
  
  // Get transactions for selected month
  const monthTransactions = useMemo(() => {
    return filterTransactions({
      startDate: startOfMonth(selectedDate),
      endDate: endOfMonth(selectedDate),
    });
  }, [selectedDate, filterTransactions]);
  
  // Calculate comparisons
  const comparisons = useMemo(() => {
    if (!stats || !previousMonthStats) return null;
    
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return { percent: null, trend: current > 0 ? 'up' : 'same' };
      const percent = ((current - previous) / Math.abs(previous)) * 100;
      return {
        percent,
        trend: percent > 1 ? 'up' : percent < -1 ? 'down' : 'same',
      };
    };
    
    return {
      income: calcChange(stats.income, previousMonthStats.income),
      expenses: calcChange(stats.expenses, previousMonthStats.expenses),
      net: calcChange(stats.net, previousMonthStats.net),
    };
  }, [stats, previousMonthStats]);
  
  const handleExportPdf = () => {
    if (!currentPeriod || !stats) return;
    
    generatePdfReport({
      month: selectedDate,
      period: currentPeriod,
      stats,
      weeklyBreakdown,
      transactions: monthTransactions,
      categories,
      previousMonthStats,
    });
    
    toast({
      title: '📄 PDF generado',
      description: 'El archivo se descargó correctamente.',
    });
  };
  
  const handleExportCsv = () => {
    if (!currentPeriod || !stats) return;
    
    generateCsvReport({
      month: selectedDate,
      period: currentPeriod,
      stats,
      weeklyBreakdown,
      transactions: monthTransactions,
      categories,
    });
    
    toast({
      title: '📊 CSV generado',
      description: 'El archivo se descargó correctamente.',
    });
  };
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-income" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-expense" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };
  
  const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || 'Sin categoría';
  };

  if (loading) {
    return (
      <AppLayout title="Reportes" subtitle="Cargando reportes">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Cargando reportes...</div>
        </div>
      </AppLayout>
    );
  }

  if (!stats) {
    return (
      <AppLayout title="Reportes" subtitle="Estados de cuenta y exportación">
        <div className="card-treasury text-center py-12">
          <p className="text-muted-foreground">📊 No hay datos para mostrar</p>
          <p className="text-caption mt-2">Registra movimientos para generar reportes</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Reportes" 
      subtitle="Estados de cuenta y exportación"
      headerActions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button size="sm" onClick={handleExportPdf}>
            <FileText className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Month Selector */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label.charAt(0).toUpperCase() + option.label.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-caption text-muted-foreground">Saldo Inicial</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(stats.balance - stats.net)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-caption text-muted-foreground">Ingresos</p>
              <p className="text-xl font-bold text-income mt-1">{formatCurrency(stats.income)}</p>
              {comparisons && (
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(comparisons.income.trend)}
                  <span className="text-xs text-muted-foreground">
                    {formatPercent(comparisons.income.percent)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-caption text-muted-foreground">Donaciones</p>
              <p className="text-xl font-bold text-donation mt-1">{formatCurrency(stats.donations)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-caption text-muted-foreground">Cooperación</p>
              <p className="text-xl font-bold text-investment mt-1">{formatCurrency(stats.investments)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-caption text-muted-foreground">Gastos</p>
              <p className="text-xl font-bold text-expense mt-1">{formatCurrency(stats.expenses)}</p>
              {comparisons && (
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(comparisons.expenses.trend)}
                  <span className="text-xs text-muted-foreground">
                    {formatPercent(comparisons.expenses.percent)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-caption text-muted-foreground">Neto del Mes</p>
              <p className={`text-xl font-bold mt-1 ${stats.net >= 0 ? 'text-income' : 'text-expense'}`}>
                {formatCurrency(stats.net)}
              </p>
              {comparisons && (
                <div className="flex items-center gap-1 mt-1">
                  {getTrendIcon(comparisons.net.trend)}
                  <span className="text-xs text-muted-foreground">
                    {formatPercent(comparisons.net.percent)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardContent className="pt-4">
              <p className="text-caption text-muted-foreground">Saldo Final</p>
              <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(stats.balance)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Al cierre de {format(selectedDate, 'MMMM yyyy', { locale: es })}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Weekly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Desglose Semanal</CardTitle>
            <CardDescription>Semanas del mes hasta el día de hoy.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Semana</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right">Salidas</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weeklyBreakdown.map((week) => (
                    <TableRow key={week.weekNumber}>
                      <TableCell className="font-medium">S{week.weekNumber}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(week.weekStart), 'dd/MM')} - {format(new Date(week.weekEnd), 'dd/MM')}
                      </TableCell>
                      <TableCell className="text-right text-income">
                        {formatCurrency(week.income + week.donations)}
                      </TableCell>
                      <TableCell className="text-right text-expense">
                        {formatCurrency(week.investments + week.expenses)}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${week.net >= 0 ? 'text-income' : 'text-expense'}`}>
                        {formatCurrency(week.net)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {weeklyBreakdown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No hay datos para este mes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Transactions Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Movimientos del Mes ({monthTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Inversión</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthTransactions.slice(0, 10).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{format(new Date(t.date), 'dd/MM')}</TableCell>
                      <TableCell>
                        <span className={`badge-${t.type} text-xs`}>
                          {t.type === 'income' ? 'Ingreso' : t.type === 'donation' ? 'Donación' : t.type === 'investment' ? 'Cooperación' : 'Gasto'}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">{getCategoryName(t.categoryId)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm truncate max-w-[200px]">
                        {t.description}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-investment">
                        {t.type === 'income' && t.investmentAmount ? `-${formatCurrency(t.investmentAmount)}` : '—'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        t.type === 'income' || t.type === 'donation' ? 'text-income' : 'text-expense'
                      }`}>
                        {t.type === 'income' || t.type === 'donation' ? '+' : '-'}{formatCurrency(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {monthTransactions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No hay movimientos en este mes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {monthTransactions.length > 10 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                ... y {monthTransactions.length - 10} movimientos más
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
