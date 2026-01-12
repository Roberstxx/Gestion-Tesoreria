import React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { TransactionType, TRANSACTION_TYPE_LABELS } from '@/types';

interface QuickActionButtonProps {
  type: TransactionType;
  onClick: () => void;
  className?: string;
}

const typeIcons: Record<TransactionType, string> = {
  income: '💰',
  donation: '🎁',
  investment: '📦',
  expense: '💸',
};

export function QuickActionButton({ type, onClick, className }: QuickActionButtonProps) {
  const buttonStyles: Record<TransactionType, string> = {
    income: 'btn-income',
    donation: 'btn-donation',
    investment: 'btn-investment',
    expense: 'btn-expense',
  };

  const shortLabels: Record<TransactionType, string> = {
    income: 'Ingreso',
    donation: 'Donación',
    investment: 'Inversión',
    expense: 'Gasto',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 p-3 rounded-xl transition-all',
        'active:scale-95 hover:shadow-md',
        'min-w-[70px] sm:min-w-[80px]',
        buttonStyles[type],
        className
      )}
    >
      <div className="flex items-center gap-1">
        <Plus className="h-4 w-4" />
        <span className="text-lg">{typeIcons[type]}</span>
      </div>
      <span className="text-xs font-medium">{shortLabels[type]}</span>
    </button>
  );
}

interface QuickActionsGridProps {
  onSelect: (type: TransactionType) => void;
  className?: string;
}

export function QuickActionsGrid({ onSelect, className }: QuickActionsGridProps) {
  const types: TransactionType[] = ['income', 'donation', 'investment', 'expense'];

  return (
    <div className={cn('grid grid-cols-4 gap-2 sm:gap-3', className)}>
      {types.map((type) => (
        <QuickActionButton key={type} type={type} onClick={() => onSelect(type)} />
      ))}
    </div>
  );
}
