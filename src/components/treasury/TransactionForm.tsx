import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Transaction, TransactionType, Category, TRANSACTION_TYPE_LABELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { Calendar, DollarSign, Tag, FileText, CreditCard, Save, Plus } from 'lucide-react';

interface TransactionFormProps {
  categories: Category[];
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  initialData?: Partial<Transaction>;
  initialType?: TransactionType;
  submitLabel?: string;
  showSaveAndNew?: boolean;
  onSaveAndNew?: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export function TransactionForm({
  categories,
  onSubmit,
  onCancel,
  initialData,
  initialType,
  submitLabel = 'Guardar',
  showSaveAndNew = false,
  onSaveAndNew,
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(initialData?.type || initialType || 'income');
  const [amount, setAmount] = useState(initialData?.amount?.toString() || '');
  const [date, setDate] = useState(initialData?.date || format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter categories by type
  const filteredCategories = categories.filter((c) => c.type === type);

  // Reset category when type changes
  useEffect(() => {
    if (!filteredCategories.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id || '');
    }
  }, [type, filteredCategories, categoryId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Ingresa un monto válido';
    }

    if (!date) {
      newErrors.date = 'Selecciona una fecha';
    }

    if (!categoryId) {
      newErrors.categoryId = 'Selecciona una categoría';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (saveAndNew: boolean = false) => {
    if (!validate()) return;

    const data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
      type,
      amount: parseFloat(amount),
      date,
      categoryId,
      description: description.trim(),
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      paymentMethod: paymentMethod || undefined,
    };

    if (saveAndNew && onSaveAndNew) {
      onSaveAndNew(data);
      // Reset form
      setAmount('');
      setDescription('');
      setTags('');
      setPaymentMethod('');
    } else {
      onSubmit(data);
    }
  };

  const typeButtons: { value: TransactionType; label: string; emoji: string }[] = [
    { value: 'income', label: 'Ingreso', emoji: '💰' },
    { value: 'donation', label: 'Donación', emoji: '🎁' },
    { value: 'investment', label: 'Inversión', emoji: '📦' },
    { value: 'expense', label: 'Gasto', emoji: '💸' },
  ];

  const typeStyles: Record<TransactionType, string> = {
    income: 'border-income bg-income/10 text-income',
    donation: 'border-donation bg-donation/10 text-donation',
    investment: 'border-investment bg-investment/10 text-investment',
    expense: 'border-expense bg-expense/10 text-expense',
  };

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <div className="space-y-2">
        <Label>Tipo de movimiento</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {typeButtons.map((btn) => (
            <button
              key={btn.value}
              type="button"
              onClick={() => setType(btn.value)}
              className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all',
                'font-medium text-sm',
                type === btn.value
                  ? typeStyles[btn.value]
                  : 'border-border bg-card hover:border-muted-foreground/30'
              )}
            >
              <span>{btn.emoji}</span>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Monto *</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={cn('pl-10 text-lg font-semibold', errors.amount && 'border-destructive')}
            min="0"
            step="0.01"
          />
        </div>
        {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Fecha *</Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn('pl-10', errors.date && 'border-destructive')}
          />
        </div>
        {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Categoría *</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className={cn(errors.categoryId && 'border-destructive')}>
            <SelectValue placeholder="Selecciona una categoría" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="description"
            placeholder="Describe el movimiento..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="pl-10 min-h-[80px] resize-none"
          />
        </div>
      </div>

      {/* Optional: Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags" className="text-muted-foreground">
          Etiquetas (opcional)
        </Label>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="tags"
            placeholder="Separadas por coma: evento, especial"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Optional: Payment method */}
      <div className="space-y-2">
        <Label htmlFor="paymentMethod" className="text-muted-foreground">
          Método de pago (opcional)
        </Label>
        <div className="relative">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="paymentMethod"
            placeholder="Efectivo, transferencia, etc."
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button onClick={() => handleSubmit(false)} className="flex-1">
          <Save className="h-4 w-4 mr-2" />
          {submitLabel}
        </Button>
        {showSaveAndNew && onSaveAndNew && (
          <Button onClick={() => handleSubmit(true)} variant="outline" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Guardar y registrar otro
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} variant="ghost">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
