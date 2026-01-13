import React from 'react';
import { cn } from '@/lib/utils';
import { Transaction, Category } from '@/types';
import { TransactionBadge } from './TransactionBadge';
import { formatCurrency } from '@/utils/calculations';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TransactionItemProps {
  transaction: Transaction;
  category?: Category;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
  showActions?: boolean;
}

export function TransactionItem({
  transaction,
  category,
  onEdit,
  onDelete,
  onClick,
  showActions = true,
}: TransactionItemProps) {
  const isOutflow = transaction.type === 'expense';
  const investmentAmount =
    transaction.type === 'income' ? transaction.investmentAmount : undefined;

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl bg-card border border-border',
        'hover:shadow-card transition-all',
        onClick && 'cursor-pointer'
      )}
    >
      {/* Type indicator dot */}
      <div
        className={cn(
          'w-3 h-3 rounded-full flex-shrink-0',
          transaction.type === 'income' && 'bg-income',
          transaction.type === 'donation' && 'bg-donation',
          transaction.type === 'investment' && 'bg-investment',
          transaction.type === 'expense' && 'bg-expense'
        )}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{transaction.description || category?.name || 'Sin descripción'}</p>
          <TransactionBadge type={transaction.type} size="sm" />
        </div>
        <p className="text-caption mt-0.5">
          {category?.name} • {format(parseISO(transaction.date), 'd MMM yyyy', { locale: es })}
        </p>
        <p className="text-xs text-muted-foreground">
          Registrado: {format(parseISO(transaction.createdAt), "d MMM yyyy '•' HH:mm", { locale: es })}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p
          className={cn(
            'font-semibold currency-display',
            isOutflow ? 'text-expense' : 'text-income'
          )}
        >
          {isOutflow ? '-' : '+'}{formatCurrency(transaction.amount)}
        </p>
        {investmentAmount && investmentAmount > 0 && (
          <p className="text-xs text-muted-foreground">
            Inversión: -{formatCurrency(investmentAmount)}
          </p>
        )}
      </div>

      {/* Actions */}
      {showActions && (onEdit || onDelete) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onClick?: (transaction: Transaction) => void;
  emptyMessage?: string;
}

export function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
  onClick,
  emptyMessage = 'No hay movimientos',
}: TransactionListProps) {
  const getCategoryById = (id: string) => categories.find((c) => c.id === id);

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <TransactionItem
          key={transaction.id}
          transaction={transaction}
          category={getCategoryById(transaction.categoryId)}
          onEdit={onEdit ? () => onEdit(transaction) : undefined}
          onDelete={onDelete ? () => onDelete(transaction) : undefined}
          onClick={onClick ? () => onClick(transaction) : undefined}
        />
      ))}
    </div>
  );
}
