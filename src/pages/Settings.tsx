import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/treasury';
import { useTreasury } from '@/hooks/useTreasury';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Tag, Settings2, Database, RefreshCw } from 'lucide-react';
import { TransactionType, Category, TRANSACTION_TYPE_LABELS } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/calculations';

export default function Settings() {
  const { 
    categories, 
    currentPeriod, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    getCategoriesByType,
    updatePeriod,
  } = useTreasury();
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<TransactionType>('income');
  const [initialFundInput, setInitialFundInput] = useState('');
  const [initialFundError, setInitialFundError] = useState('');
  const [resetPhraseInput, setResetPhraseInput] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  const typeOptions: TransactionType[] = ['income', 'donation', 'investment', 'expense'];
  const resetPhrase =
    'Cada peso cuenta: registrar el dinero con honestidad evita pérdidas, ayuda a planear y nos recuerda que la confianza se construye con cifras claras y decisiones responsables.';

  useEffect(() => {
    if (currentPeriod) {
      setInitialFundInput(currentPeriod.initialFund.toString());
    }
  }, [currentPeriod]);
  
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: '⚠️ Campo requerido',
        description: 'Ingresa un nombre para la categoría.',
        variant: 'destructive',
      });
      return;
    }
    
    addCategory({
      name: newCategoryName.trim(),
      type: newCategoryType,
      isDefault: false,
    });
    
    setNewCategoryName('');
    setIsAddDialogOpen(false);
    toast({
      title: '✅ Categoría agregada',
      description: `"${newCategoryName}" se agregó correctamente.`,
    });
  };
  
  const handleUpdateCategory = () => {
    if (!editingCategory || !newCategoryName.trim()) return;
    
    updateCategory(editingCategory.id, { name: newCategoryName.trim() });
    setEditingCategory(null);
    setNewCategoryName('');
    toast({
      title: '✅ Categoría actualizada',
      description: 'Los cambios se guardaron correctamente.',
    });
  };
  
  const handleDeleteCategory = (category: Category) => {
    deleteCategory(category.id);
    toast({
      title: '🗑️ Categoría eliminada',
      description: `"${category.name}" se eliminó correctamente.`,
    });
  };
  
  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setNewCategoryName(category.name);
  };
  
  const handleClearData = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleUpdateInitialFund = async () => {
    if (!currentPeriod) return;
    const trimmed = initialFundInput.trim();
    const parsed = trimmed === '' ? NaN : Number(trimmed);

    if (!Number.isFinite(parsed) || parsed < 0) {
      setInitialFundError('Ingresa un monto válido (0 o mayor).');
      return;
    }

    setInitialFundError('');
    await updatePeriod(currentPeriod.id, { initialFund: parsed });
    toast({
      title: '✅ Fondo inicial actualizado',
      description: 'El fondo inicial del periodo actual se guardó correctamente.',
    });
  };

  const CategoryList = ({ type }: { type: TransactionType }) => {
    const typeCategories = getCategoriesByType(type);
    
    return (
      <div className="space-y-2">
        {typeCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No hay categorías para este tipo
          </p>
        ) : (
          typeCategories.map((category) => (
            <div 
              key={category.id} 
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{category.name}</span>
                {category.isDefault && (
                  <span className="text-xs text-muted-foreground">(predeterminada)</span>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEditDialog(category)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se eliminará la categoría "{category.name}". Los movimientos que la usen conservarán su registro pero mostrarán "Sin categoría".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => handleDeleteCategory(category)}
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <AppLayout title="Ajustes" subtitle="Categorías y configuración">
      <div className="space-y-6">
        {/* Current Period Info */}
        {currentPeriod && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Periodo Actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-muted-foreground">Nombre</p>
                  <p className="font-medium">{currentPeriod.name}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">Fondo Inicial</p>
                  <p className="font-medium text-primary">{formatCurrency(currentPeriod.initialFund)}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">Inicio</p>
                  <p className="font-medium">{new Date(currentPeriod.startDate).toLocaleDateString('es-MX')}</p>
                </div>
                <div>
                  <p className="text-caption text-muted-foreground">Fin</p>
                  <p className="font-medium">{new Date(currentPeriod.endDate).toLocaleDateString('es-MX')}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <Label htmlFor="initial-fund">Modificar fondo inicial</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    id="initial-fund"
                    type="number"
                    min="0"
                    step="0.01"
                    value={initialFundInput}
                    onChange={(e) => setInitialFundInput(e.target.value)}
                    className={initialFundError ? 'border-destructive' : undefined}
                  />
                  <Button onClick={handleUpdateInitialFund} className="sm:w-auto">
                    Guardar
                  </Button>
                </div>
                {initialFundError && (
                  <p className="text-sm text-destructive">{initialFundError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Puedes dejarlo en 0 si el fondo inicial se definirá con la primera inversión.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Categories Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Categorías
              </CardTitle>
              <CardDescription className="mt-1">
                Organiza tus movimientos por categorías
              </CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva Categoría</DialogTitle>
                  <DialogDescription>
                    Agrega una categoría para organizar tus movimientos.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Nombre de la categoría</Label>
                    <Input
                      id="category-name"
                      placeholder="Ej: Ventas especiales"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-type">Tipo de movimiento</Label>
                    <Select value={newCategoryType} onValueChange={(v) => setNewCategoryType(v as TransactionType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {typeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {TRANSACTION_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddCategory}>
                    Agregar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="income" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="income" className="text-xs sm:text-sm">Ingresos</TabsTrigger>
                <TabsTrigger value="donation" className="text-xs sm:text-sm">Donaciones</TabsTrigger>
                <TabsTrigger value="investment" className="text-xs sm:text-sm">Inversiones</TabsTrigger>
                <TabsTrigger value="expense" className="text-xs sm:text-sm">Gastos</TabsTrigger>
              </TabsList>
              {typeOptions.map((type) => (
                <TabsContent key={type} value={type}>
                  <CategoryList type={type} />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Edit Category Dialog */}
        <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Categoría</DialogTitle>
              <DialogDescription>
                Modifica el nombre de la categoría.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">Nombre</Label>
                <Input
                  id="edit-category-name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              {editingCategory && (
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <p className="text-sm text-muted-foreground">
                    {TRANSACTION_TYPE_LABELS[editingCategory.type]}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCategory(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateCategory}>
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-5 w-5" />
              Datos
            </CardTitle>
            <CardDescription>
              Gestiona los datos de la aplicación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <AlertDialog
                open={resetDialogOpen}
                onOpenChange={(open) => {
                  setResetDialogOpen(open);
                  if (!open) {
                    setResetPhraseInput('');
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/30">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reiniciar todo
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ ¿Reiniciar todo?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción eliminará TODOS los datos: movimientos, categorías, periodos y configuraciones. La app volverá a su estado inicial con datos de ejemplo. Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="reset-phrase">Escribe la siguiente frase para continuar</Label>
                    <p className="text-xs text-muted-foreground">{resetPhrase}</p>
                    <Textarea
                      id="reset-phrase"
                      value={resetPhraseInput}
                      onChange={(e) => setResetPhraseInput(e.target.value)}
                      placeholder="Escribe la frase completa, incluyendo signos y acentos."
                      className="min-h-[110px]"
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => {
                        setResetPhraseInput('');
                        setResetDialogOpen(false);
                      }}
                    >
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={resetPhraseInput.trim() !== resetPhrase}
                      onClick={() => {
                        setResetPhraseInput('');
                        setResetDialogOpen(false);
                        handleClearData();
                      }}
                    >
                      Sí, reiniciar todo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
        
        {/* App Info */}
        <Card>
          <CardContent className="pt-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Tesorería App v1.0</p>
              <p className="text-xs mt-1">Datos almacenados localmente en este dispositivo</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
