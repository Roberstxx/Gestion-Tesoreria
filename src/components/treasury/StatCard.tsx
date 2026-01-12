import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Comparison } from '@/types';
import { formatCurrency, formatPercentage } from '@/utils/calculations';

interface StatCardProps {
  title: string;
  value: number;
  comparison?: Comparison;
  icon?: React.ReactNode;
  variant?: 'default' | 'income' | 'donation' | 'investment' | 'expense' | 'balance' | 'net';
  className?: string;
  showCurrency?: boolean;
}

export function StatCard({
  title,
  value,
  comparison,
  icon,
  variant = 'default',
  className,
  showCurrency = true,
}: StatCardProps) {
  const variantStyles: Record<string, string> = {
    default: 'bg-card',
    income: 'bg-card border-l-4 border-l-income',
    donation: 'bg-card border-l-4 border-l-donation',
    investment: 'bg-card border-l-4 border-l-investment',
    expense: 'bg-card border-l-4 border-l-expense',
    balance: 'bg-primary text-primary-foreground',
    net: 'bg-card border-2 border-primary',
  };

  const getTrendIcon = () => {
    if (!comparison) return null;
    
    switch (comparison.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    if (!comparison) return '';
    
    // For expenses and investments, down is good
    if (variant === 'expense' || variant === 'investment') {
      return comparison.trend === 'down' ? 'trend-up' : comparison.trend === 'up' ? 'trend-down' : 'trend-same';
    }
    
    // For income, donations, and net, up is good
    return comparison.trend === 'up' ? 'trend-up' : comparison.trend === 'down' ? 'trend-down' : 'trend-same';
  };

  const isLightText = variant === 'balance';

  return (
    <div
      className={cn(
        'rounded-2xl p-4 shadow-card border border-border transition-all hover:shadow-soft',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className={cn('text-caption truncate', isLightText && 'text-primary-foreground/80')}>
            {title}
          </p>
          <p className={cn('text-display mt-1 currency-display', isLightText && 'text-primary-foreground')}>
            {showCurrency ? formatCurrency(value) : value.toLocaleString()}
          </p>
        </div>
        {icon && (
          <div className={cn('p-2 rounded-xl', isLightText ? 'bg-primary-foreground/20' : 'bg-muted')}>
            {icon}
          </div>
        )}
      </div>

      {comparison && comparison.percentageChange !== null && (
        <div className={cn('flex items-center gap-1 mt-3 text-sm', getTrendColor())}>
          {getTrendIcon()}
          <span className="font-medium">{formatPercentage(comparison.percentageChange)}</span>
          <span className={cn('text-caption', isLightText && 'text-primary-foreground/70')}>
            vs mes anterior
          </span>
        </div>
      )}
    </div>
  );
}
