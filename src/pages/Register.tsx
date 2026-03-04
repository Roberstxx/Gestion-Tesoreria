import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTreasury } from '@/hooks/useTreasury';
import { AppLayout, TransactionForm } from '@/components/treasury';
import { TransactionType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { parseISO } from 'date-fns';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { categories, addTransaction, currentPeriod, error } = useTreasury();
  const { toast } = useToast();

  const initialType = (searchParams.get('type') as TransactionType) || undefined;

  const handleSubmit = async (data: Parameters<typeof addTransaction>[0]) => {
    try {
      await addTransaction(data);

      const selectedDate = parseISO(data.date);
      const outOfCurrentPeriod = currentPeriod
        ? selectedDate < parseISO(currentPeriod.startDate) || selectedDate > parseISO(currentPeriod.endDate)
        : false;

      toast({
        title: '✅ Movimiento registrado',
        description: outOfCurrentPeriod
          ? 'Se guardó correctamente. Ojo: la fecha quedó fuera del periodo actual, así que podría no aparecer en el inicio.'
          : 'El movimiento se guardó correctamente.',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: '❌ No se pudo guardar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleSaveAndNew = async (data: Parameters<typeof addTransaction>[0]) => {
    try {
      await addTransaction(data);
      toast({
        title: '✅ Guardado',
        description: 'Puedes registrar otro movimiento.',
      });
    } catch (error) {
      toast({
        title: '❌ No se pudo guardar',
        description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout title="Registrar movimiento" subtitle="Agrega un nuevo ingreso, gasto, donación o cooperación 10 pesos">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="card-treasury">
        <TransactionForm
          categories={categories}
          onSubmit={handleSubmit}
          onSaveAndNew={handleSaveAndNew}
          onCancel={() => navigate('/')}
          initialType={initialType}
          showSaveAndNew
        />
      </div>
    </AppLayout>
  );
}
