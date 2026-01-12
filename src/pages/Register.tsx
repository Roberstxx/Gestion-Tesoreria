import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTreasury } from '@/hooks/useTreasury';
import { AppLayout, TransactionForm } from '@/components/treasury';
import { TransactionType } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { categories, addTransaction } = useTreasury();
  const { toast } = useToast();

  const initialType = (searchParams.get('type') as TransactionType) || undefined;

  const handleSubmit = (data: Parameters<typeof addTransaction>[0]) => {
    addTransaction(data);
    toast({
      title: '✅ Movimiento registrado',
      description: 'El movimiento se guardó correctamente.',
    });
    navigate('/');
  };

  const handleSaveAndNew = (data: Parameters<typeof addTransaction>[0]) => {
    addTransaction(data);
    toast({
      title: '✅ Guardado',
      description: 'Puedes registrar otro movimiento.',
    });
  };

  return (
    <AppLayout title="Registrar movimiento" subtitle="Agrega un nuevo ingreso, gasto, inversión o donación">
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
