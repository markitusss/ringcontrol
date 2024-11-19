'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users } from 'lucide-react';

interface StatsCardsProps {
  totalInvoices: number;
  reviewInvoices: number;
  totalAmount: string;
}

export function StatsCards({ totalInvoices, reviewInvoices, totalAmount }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">
            Total Factures
          </CardTitle>
          <FileText className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{totalInvoices}</div>
          <p className="text-xs text-primary/60">
            Inclou factures no revisables
          </p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">
            Factures a Revisar
          </CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{reviewInvoices}</div>
          <p className="text-xs text-primary/60">
            Factures que requereixen revisió
          </p>
        </CardContent>
      </Card>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">
            Import Total
          </CardTitle>
          <FileText className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{totalAmount}</div>
          <p className="text-xs text-primary/60">
            Suma total de totes les factures
          </p>
        </CardContent>
      </Card>
    </div>
  );
}