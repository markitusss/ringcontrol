'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { UploadExcelDialog } from './excel-upload-dialog';
import { ExcludedInvoicesDialog } from './excluded-invoices-dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface ActionButtonsProps {
  onUploadComplete: () => void;
  selectedMonth: number;
  selectedYear: number;
}

interface ExcludedInvoice {
  numero_factura: string;
  alias: string;
  total: number;
}

export function ActionButtons({ onUploadComplete, selectedMonth, selectedYear }: ActionButtonsProps) {
  const { toast } = useToast();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isExcludedDialogOpen, setIsExcludedDialogOpen] = useState(false);
  const [excludedInvoices, setExcludedInvoices] = useState<ExcludedInvoice[]>([]);

  const handleShowExcluded = async () => {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('numero_factura, alias, total')
        .eq('mes', selectedMonth)
        .eq('anio', selectedYear)
        .eq('no_revisar', true)
        .order('alias');

      if (error) throw error;

      setExcludedInvoices(data || []);
      setIsExcludedDialogOpen(true);
    } catch (error) {
      console.error('Error loading excluded invoices:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'han pogut carregar les factures excloses.',
      });
    }
  };

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={() => setIsUploadDialogOpen(true)}
      >
        <FileText className="h-4 w-4" />
        Pujar Excel
      </Button>
      <Button 
        variant="outline" 
        className="flex items-center gap-2" 
        onClick={handleShowExcluded}
      >
        <FileText className="h-4 w-4" />
        Exclosos
      </Button>
      <UploadExcelDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />
      <ExcludedInvoicesDialog
        open={isExcludedDialogOpen}
        onOpenChange={setIsExcludedDialogOpen}
        invoices={excludedInvoices}
      />
    </div>
  );
}