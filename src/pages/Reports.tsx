import React from 'react';
import { AppLayout } from '@/components/treasury';

export default function Reports() {
  return (
    <AppLayout title="Reportes" subtitle="Estados de cuenta y exportación">
      <div className="card-treasury text-center py-12">
        <p className="text-muted-foreground">📊 Módulo de reportes en desarrollo</p>
        <p className="text-caption mt-2">Pronto podrás generar estados de cuenta y exportar a PDF/Excel</p>
      </div>
    </AppLayout>
  );
}
