import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Transaction, TransactionType, Category } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, isValid, parse, parseISO } from 'date-fns';
import { Calendar, DollarSign, Tag, FileText, CreditCard, Save, Plus } from 'lucide-react';
import { formatCurrency } from '@/utils/calculations';

interface TransactionFormProps {
  categories: Category[];
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
  onCancel?: () => void;
  initialData?: Partial<Transaction>;
  initialType?: TransactionType;
  submitLabel?: string;
  showSaveAndNew?: boolean;
  onSaveAndNew?: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void> | void;
}

// Objeto de descripciones dinámicas para cada tipo de movimiento
const typeDescriptions: Record<TransactionType, string> = {
  income: "Registra el total de los ingresos generados por ventas.",
  investment: "Registra el total de la cooperación de los 10 pesos del día sábado.",
  donation: "Registra el monto recibido como donación o apoyo voluntario.",
  expense: "Registra el total de los gastos, compras o pagos realizados.",
};

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
  const [investmentAmount, setInvestmentAmount] = useState(
    initialData?.investmentAmount?.toString() || ''
  );
  const [date, setDate] = useState(initialData?.date || format(new Date(), 'yyyy-MM-dd'));
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingData, setPendingData] = useState<Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> | null>(null);
  const [pendingAction, setPendingAction] = useState<'save' | 'saveAndNew'>('save');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sanitizeNumericInput = (value: string) => {
    let cleaned = value.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };


  const normalizeDateInput = (value: string): string | null => {
    if (!value) return null;

    const trimmed = value.trim();

    const isoParsed = parseISO(trimmed);
    if (isValid(isoParsed)) return format(isoParsed, 'yyyy-MM-dd');

    const parsedLatam = parse(trimmed, 'd/M/yyyy', new Date());
    if (isValid(parsedLatam) && format(parsedLatam, 'd/M/yyyy') === trimmed) {
      return format(parsedLatam, 'yyyy-MM-dd');
    }

    const parsedLatamPadded = parse(trimmed, 'dd/MM/yyyy', new Date());
    if (isValid(parsedLatamPadded) && format(parsedLatamPadded, 'dd/MM/yyyy') === trimmed) {
      return format(parsedLatamPadded, 'yyyy-MM-dd');
    }

    return null;
  };

  const filteredCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (!filteredCategories.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCategories[0]?.id || '');
    }
  }, [type, filteredCategories, categoryId]);

  useEffect(() => {
    if (type !== 'income') {
      setInvestmentAmount('');
      setErrors((prev) => {
        const { investmentAmount: _, ...rest } = prev;
        return rest;
      });
    }
  }, [type]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const parsedAmount = Number(amount);

    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Ingresa un monto válido';
    }

    if (type === 'income' && investmentAmount) {
      const parsedInvestment = Number(investmentAmount);
      if (isNaN(parsedInvestment) || parsedInvestment < 0) {
        newErrors.investmentAmount = 'Ingresa un monto de inversión válido';
      }
    }

    if (!date) {
      newErrors.date = 'Selecciona una fecha';
    } else if (!normalizeDateInput(date)) {
      newErrors.date = 'Ingresa una fecha válida';
    }

    if (!categoryId) {
      newErrors.categoryId = 'Selecciona una categoría';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildSubmissionData = (): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> | null => {
    if (!validate()) return null;

    const normalizedDate = normalizeDateInput(date);
    if (!normalizedDate) return null;

    return {
      type,
      amount: Number(amount),
      investmentAmount:
        type === 'income' && investmentAmount && Number(investmentAmount) > 0
          ? Number(investmentAmount)
          : undefined,
      date: normalizedDate,
      categoryId,
      description: description.trim(),
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      paymentMethod: paymentMethod || undefined,
    };
  };

  const submitWithData = async (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
    saveAndNew: boolean
  ) => {
    setIsSubmitting(true);
    try {
      if (saveAndNew && onSaveAndNew) {
        await onSaveAndNew(data);
        setAmount('');
        setInvestmentAmount('');
        setDescription('');
        setTags('');
        setPaymentMethod('');
      } else {
        await onSubmit(data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (saveAndNew: boolean = false) => {
    const data = buildSubmissionData();
    if (!data) return;

    const needsConfirmation = ['income', 'donation', 'investment', 'expense'].includes(type);
    if (needsConfirmation) {
      setPendingData(data);
      setPendingAction(saveAndNew ? 'saveAndNew' : 'save');
      setConfirmOpen(true);
      return;
    }

    await submitWithData(data, saveAndNew);
  };

  const typeButtons: { value: TransactionType; label: string; emoji: string }[] = [
    { value: 'income', label: 'Ingreso', emoji: '💰' },
    { value: 'investment', label: 'Cooperación 10 pesos', emoji: '🤝' },
    { value: 'donation', label: 'Donación', emoji: '🎁' },
    { value: 'expense', label: 'Gasto', emoji: '💸' },
  ];

  const typeStyles: Record<TransactionType, string> = {
    income: 'border-income bg-income/10 text-income',
    donation: 'border-donation bg-donation/10 text-donation',
    investment: 'border-investment bg-investment/10 text-investment',
    expense: 'border-expense bg-expense/10 text-expense',
  };

  const typeLabels: Record<TransactionType, string> = {
    income: 'Ingreso',
    donation: 'Donación',
    investment: 'Cooperación 10 pesos',
    expense: 'Gasto',
  };

  return (
    <div className="space-y-6">
      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setPendingData(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Es correcta esta cantidad?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a registrar un movimiento de tipo {typeLabels[type]} por{' '}
              <span className="font-semibold text-foreground">
                {pendingData ? formatCurrency(pendingData.amount) : formatCurrency(Number(amount || 0))}
              </span>
              . Verifica que el monto sea correcto antes de guardar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPendingData(null); setConfirmOpen(false); }}>
              Revisar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!pendingData || isSubmitting) return;
                await submitWithData(pendingData, pendingAction === 'saveAndNew');
                setPendingData(null);
                setConfirmOpen(false);
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Sí, registrar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      {type === 'income' && (
        <div className="space-y-2">
          <Label htmlFor="investmentAmount">Monto de inversión</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="investmentAmount"
              type="number"
              placeholder="0.00"
              value={investmentAmount}
              onKeyDown={handleNumericKeyDown}
              onChange={(e) => setInvestmentAmount(sanitizeNumericInput(e.target.value))}
              className={cn('pl-10 text-lg font-semibold', errors.investmentAmount && 'border-destructive')}
              min="0"
              step="0.01"
              inputMode="decimal"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Registra el total de lo que se invirtió para lograr el ingreso.
          </p>
          {errors.investmentAmount && (
            <p className="text-sm text-destructive">{errors.investmentAmount}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="amount">
          {type === 'income' ? 'Monto del ingreso *' : 'Monto *'}
        </Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onKeyDown={handleNumericKeyDown}
            onChange={(e) => setAmount(sanitizeNumericInput(e.target.value))}
            className={cn('pl-10 text-lg font-semibold', errors.amount && 'border-destructive')}
            min="0"
            step="0.01"
            inputMode="decimal"
          />
        </div>
        {/* TEXTO DINÁMICO SEGÚN EL TIPO SELECCIONADO */}
        <p className="text-xs text-muted-foreground transition-all duration-300">
          {typeDescriptions[type]}
        </p>
        {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
      </div>

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

      <div className="flex flex-col sm:flex-row gap-2 pt-4">
        <Button type="button" onClick={() => void handleSubmit(false)} className="flex-1" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Guardando...' : submitLabel}
        </Button>
        {showSaveAndNew && onSaveAndNew && (
          <Button type="button" onClick={() => void handleSubmit(true)} variant="outline" className="flex-1" disabled={isSubmitting}>
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Guardando...' : 'Guardar y registrar otro'}
          </Button>
        )}
        {onCancel && (
          <Button type="button" onClick={onCancel} variant="ghost" disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
