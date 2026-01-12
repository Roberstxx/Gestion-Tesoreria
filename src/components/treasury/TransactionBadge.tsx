import React from 'react';
import { cn } from '@/lib/utils';
import { TransactionType, TRANSACTION_TYPE_LABELS } from '@/types';

interface TransactionBadgeProps {
  type: TransactionType;
  className?: string;
  size?: 'sm' | 'md';
}

export function TransactionBadge({ type, className, size = 'md' }: TransactionBadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium border rounded-full';
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  const typeStyles: Record<TransactionType, string> = {
    income: 'badge-income',
    donation: 'badge-donation',
    investment: 'badge-investment',
    expense: 'badge-expense',
  };

  return (
    <span className={cn(baseStyles, sizeStyles, typeStyles[type], className)}>
      {TRANSACTION_TYPE_LABELS[type]}
    </span>
  );
}
