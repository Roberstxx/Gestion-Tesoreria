import React from 'react';
import { AppLayout } from '@/components/treasury';

export default function Settings() {
  return (
    <AppLayout title="Ajustes" subtitle="Categorías y configuración">
      <div className="card-treasury text-center py-12">
        <p className="text-muted-foreground">⚙️ Configuración en desarrollo</p>
        <p className="text-caption mt-2">Pronto podrás gestionar categorías y periodos</p>
      </div>
    </AppLayout>
  );
}
