import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction, Category, MonthlyStats, WeeklyBreakdown, Period } from '@/types';
import { formatCurrency } from './calculations';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ReportData {
  month: Date;
  period: Period;
  stats: MonthlyStats;
  weeklyBreakdown: WeeklyBreakdown[];
  transactions: Transaction[];
  categories: Category[];
  previousMonthStats?: MonthlyStats | null;
}

export function generatePdfReport(data: ReportData): void {
  const { month, period, stats, weeklyBreakdown, transactions, categories, previousMonthStats } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const monthName = format(month, 'MMMM yyyy', { locale: es });
  
  // Header
  doc.setFillColor(37, 99, 235); // Primary blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Estado de Cuentas', 14, 18);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(monthName.charAt(0).toUpperCase() + monthName.slice(1), 14, 28);
  
  doc.setFontSize(10);
  doc.text(`Periodo: ${period.name}`, 14, 35);
  
  // Generation date
  doc.setFontSize(9);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth - 14, 35, { align: 'right' });
  
  // Reset text color
  doc.setTextColor(15, 23, 42);
  
  // Summary cards section
  let yPos = 50;
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen del Mes', 14, yPos);
  yPos += 10;
  
  // Summary table
  const summaryData = [
    ['Saldo Inicial', formatCurrency(stats.balance - stats.net)],
    ['Ingresos (Ventas)', formatCurrency(stats.income)],
    ['Donaciones', formatCurrency(stats.donations)],
    ['Inversiones', formatCurrency(stats.investments)],
    ['Gastos', formatCurrency(stats.expenses)],
    ['Neto del Mes', formatCurrency(stats.net)],
    ['Saldo Final', formatCurrency(stats.balance)],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Concepto', 'Monto']],
    body: summaryData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
    },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Comparison with previous month
  if (previousMonthStats) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Comparación con Mes Anterior', 14, yPos);
    yPos += 8;
    
    const calcChange = (current: number, previous: number) => {
      if (previous === 0) return 'N/A';
      const change = ((current - previous) / Math.abs(previous)) * 100;
      const sign = change > 0 ? '+' : '';
      return `${sign}${change.toFixed(1)}%`;
    };
    
    const comparisonData = [
      ['Ingresos', formatCurrency(previousMonthStats.income), formatCurrency(stats.income), calcChange(stats.income, previousMonthStats.income)],
      ['Gastos', formatCurrency(previousMonthStats.expenses), formatCurrency(stats.expenses), calcChange(stats.expenses, previousMonthStats.expenses)],
      ['Neto', formatCurrency(previousMonthStats.net), formatCurrency(stats.net), calcChange(stats.net, previousMonthStats.net)],
    ];
    
    autoTable(doc, {
      startY: yPos,
      head: [['Concepto', 'Mes Anterior', 'Este Mes', 'Variación']],
      body: comparisonData,
      theme: 'striped',
      headStyles: { fillColor: [100, 116, 139], textColor: 255 },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'center' },
      },
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 15;
  }
  
  // Weekly breakdown
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Desglose Semanal', 14, yPos);
  yPos += 8;
  
  const weeklyData = weeklyBreakdown.map((week) => [
    `Semana ${week.weekNumber}`,
    `${format(new Date(week.weekStart), 'dd/MM')} - ${format(new Date(week.weekEnd), 'dd/MM')}`,
    formatCurrency(week.income + week.donations),
    formatCurrency(week.investments + week.expenses),
    formatCurrency(week.net),
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Semana', 'Periodo', 'Entradas', 'Salidas', 'Neto']],
    body: weeklyData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    styles: { fontSize: 9 },
    margin: { left: 14, right: 14 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 15;
  
  // Check if we need a new page for transactions
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  // Transactions detail
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Movimientos', 14, yPos);
  yPos += 8;
  
  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || 'Sin categoría';
  };
  
  const typeLabels: Record<string, string> = {
    income: 'Ingreso',
    donation: 'Donación',
    investment: 'Inversión',
    expense: 'Gasto',
  };
  
  const transactionData = transactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((t) => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      typeLabels[t.type] || t.type,
      getCategoryName(t.categoryId),
      t.description.substring(0, 30) + (t.description.length > 30 ? '...' : ''),
      formatCurrency(t.amount),
    ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto']],
    body: transactionData,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    columnStyles: {
      4: { halign: 'right' },
    },
    styles: { fontSize: 8 },
    margin: { left: 14, right: 14 },
  });
  
  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Save the PDF
  const fileName = `Estado_Cuentas_${format(month, 'yyyy_MM')}.pdf`;
  doc.save(fileName);
}

export function generateCsvReport(data: ReportData): void {
  const { month, stats, weeklyBreakdown, transactions, categories } = data;
  const monthName = format(month, 'MMMM_yyyy', { locale: es });
  
  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || 'Sin categoría';
  };
  
  const typeLabels: Record<string, string> = {
    income: 'Ingreso',
    donation: 'Donación',
    investment: 'Inversión',
    expense: 'Gasto',
  };
  
  // Build CSV content
  let csv = 'RESUMEN DEL MES\n';
  csv += `Mes,${format(month, 'MMMM yyyy', { locale: es })}\n`;
  csv += `Ingresos,${stats.income}\n`;
  csv += `Donaciones,${stats.donations}\n`;
  csv += `Inversiones,${stats.investments}\n`;
  csv += `Gastos,${stats.expenses}\n`;
  csv += `Neto,${stats.net}\n`;
  csv += `Saldo Final,${stats.balance}\n`;
  csv += '\n';
  
  // Weekly breakdown
  csv += 'DESGLOSE SEMANAL\n';
  csv += 'Semana,Inicio,Fin,Ingresos,Donaciones,Inversiones,Gastos,Neto\n';
  weeklyBreakdown.forEach((week) => {
    csv += `${week.weekNumber},${week.weekStart},${week.weekEnd},${week.income},${week.donations},${week.investments},${week.expenses},${week.net}\n`;
  });
  csv += '\n';
  
  // Transactions detail
  csv += 'DETALLE DE MOVIMIENTOS\n';
  csv += 'Fecha,Tipo,Categoría,Descripción,Monto,Método de Pago\n';
  transactions
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .forEach((t) => {
      const desc = t.description.replace(/,/g, ';').replace(/"/g, "'");
      csv += `${t.date},${typeLabels[t.type]},${getCategoryName(t.categoryId)},"${desc}",${t.amount},${t.paymentMethod || ''}\n`;
    });
  
  // Download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Estado_Cuentas_${monthName}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
