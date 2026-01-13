import React, { useState, useMemo } from 'react';
import { useTreasury } from '@/hooks/useTreasury';
import { AppLayout, TransactionList, TransactionForm } from '@/components/treasury';
import { TransactionType, Transaction } from '@/types';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Search, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export default function History() {
  const { transactions, categories, filterTransactions, updateTransaction, deleteTransaction } = useTreasury();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'month' | '3months'>('month');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (dateRange === 'month') {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    } else if (dateRange === '3months') {
      startDate = startOfMonth(subMonths(new Date(), 2));
      endDate = endOfMonth(new Date());
    }

    return filterTransactions({
      startDate,
      endDate,
      type: typeFilter === 'all' ? undefined : typeFilter,
      search: search || undefined,
    });
  }, [filterTransactions, search, typeFilter, dateRange]);

  const handleEdit = (transaction: Transaction) => setEditingTransaction(transaction);

  const handleSaveEdit = async (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, data);
      toast({ title: '✅ Actualizado', description: 'Movimiento actualizado correctamente.' });
      setEditingTransaction(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (deletingTransaction) {
      await deleteTransaction(deletingTransaction.id);
      toast({ title: '🗑️ Eliminado', description: 'Movimiento eliminado.' });
      setDeletingTransaction(null);
    }
  };

  return (
    <AppLayout title="Historial" subtitle={`${filteredTransactions.length} movimientos`}>
      {/* Filters */}
      <div className="card-treasury mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TransactionType | 'all')}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Ingresos</SelectItem>
              <SelectItem value="donation">Donaciones</SelectItem>
              <SelectItem value="investment">Cooperación</SelectItem>
              <SelectItem value="expense">Gastos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as 'all' | 'month' | '3months')}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="all">Todo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transactions List */}
      <TransactionList
        transactions={filteredTransactions}
        categories={categories}
        onEdit={handleEdit}
        onDelete={(t) => setDeletingTransaction(t)}
        emptyMessage="No se encontraron movimientos con estos filtros"
      />

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar movimiento</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <TransactionForm
              categories={categories}
              initialData={editingTransaction}
              onSubmit={handleSaveEdit}
              onCancel={() => setEditingTransaction(null)}
              submitLabel="Guardar cambios"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar movimiento?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El movimiento será eliminado permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTransaction(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
