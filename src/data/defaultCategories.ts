import { Category } from '@/types';

export function getDefaultCategories(): Category[] {
  return [
    // Income
    { id: 'cat-income-1', name: 'Ventas sábado', type: 'income', isDefault: true },
    { id: 'cat-income-2', name: 'Ventas evento', type: 'income', isDefault: true },
    { id: 'cat-income-3', name: 'Otros ingresos', type: 'income', isDefault: true },
    // Donations
    { id: 'cat-donation-1', name: 'Donación', type: 'donation', isDefault: true },
    { id: 'cat-donation-2', name: 'Apoyo', type: 'donation', isDefault: true },
    { id: 'cat-donation-3', name: 'Cooperación', type: 'donation', isDefault: true },
    // Cooperation
    { id: 'cat-investment-1', name: 'Cooperación sábado', type: 'investment', isDefault: true },
    { id: 'cat-investment-2', name: 'Cooperación evento', type: 'investment', isDefault: true },
    { id: 'cat-investment-3', name: 'Cooperación especial', type: 'investment', isDefault: true },
    // Expenses
    { id: 'cat-expense-1', name: 'Actividad', type: 'expense', isDefault: true },
    { id: 'cat-expense-2', name: 'Pastel/Comida', type: 'expense', isDefault: true },
    { id: 'cat-expense-3', name: 'Decoración', type: 'expense', isDefault: true },
    { id: 'cat-expense-4', name: 'Apoyo a persona', type: 'expense', isDefault: true },
    { id: 'cat-expense-5', name: 'Materiales', type: 'expense', isDefault: true },
  ];
}
