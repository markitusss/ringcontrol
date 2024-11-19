'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { MonthYearSelector } from './components/month-year-selector';
import { PercentageControl } from './components/percentage-control';
import { ActionButtons } from './components/action-buttons';
import { StatsCards } from './components/stats-cards';
import { InvoiceLists } from './components/invoice-lists';

interface Invoice {
  invoiceNumber: string;
  clientNumber: string;
  amount: string;
  variation?: string;
}

interface InvoiceLists {
  newClients: Invoice[];
  missingClients: Invoice[];
  importantChanges: Invoice[];
  totals: {
    newClients: string;
    missingClients: string;
    importantChanges: string;
  };
}

export default function BillingControl() {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'MMMM', { locale: ca }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [percentage, setPercentage] = useState('15');
  const [stats, setStats] = useState({
    totalInvoices: 0,
    reviewInvoices: 0,
    totalAmount: '0,00 €'
  });
  const [invoiceLists, setInvoiceLists] = useState<InvoiceLists>({
    newClients: [],
    missingClients: [],
    importantChanges: [],
    totals: {
      newClients: '0,00 €',
      missingClients: '0,00 €',
      importantChanges: '0,00 €'
    }
  });

  const getMonthNumber = (monthName: string) => {
    const months = Array.from({ length: 12 }, (_, i) =>
      format(new Date(2024, i, 1), 'MMMM', { locale: ca })
    );
    return months.indexOf(monthName) + 1;
  };

  const handleSavePercentage = async () => {
    try {
      const { data: settings, error: settingsError } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1);

      if (settingsError) throw settingsError;

      if (settings && settings.length > 0) {
        const { error: updateError } = await supabase
          .from('company_settings')
          .update({ review_percentage: parseInt(percentage) })
          .eq('id', settings[0].id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('company_settings')
          .insert([{ review_percentage: parseInt(percentage) }]);

        if (insertError) throw insertError;
      }

      toast({
        title: 'Percentatge actualitzat',
        description: 'El percentatge s\'ha guardat correctament.',
      });

      loadInvoices();
    } catch (error) {
      console.error('Error saving percentage:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut guardar el percentatge.',
      });
    }
  };

  const loadInvoices = async () => {
    try {
      const monthNumber = getMonthNumber(selectedMonth);
      
      const { data: currentInvoices, error: currentError } = await supabase
        .from('facturas')
        .select('*')
        .eq('mes', monthNumber)
        .eq('anio', selectedYear);

      if (currentError) throw currentError;

      const reviewableInvoices = currentInvoices?.filter(inv => !inv.no_revisar) || [];
      const totalAmount = reviewableInvoices.reduce((sum, inv) => sum + inv.total, 0);

      setStats({
        totalInvoices: currentInvoices?.length || 0,
        reviewInvoices: reviewableInvoices.length,
        totalAmount: new Intl.NumberFormat('ca-ES', { 
          style: 'currency', 
          currency: 'EUR' 
        }).format(totalAmount)
      });

      const prevMonth = monthNumber === 1 ? 12 : monthNumber - 1;
      const prevYear = monthNumber === 1 ? parseInt(selectedYear) - 1 : parseInt(selectedYear);

      const { data: previousInvoices, error: prevError } = await supabase
        .from('facturas')
        .select('*')
        .eq('mes', prevMonth)
        .eq('anio', prevYear);

      if (prevError) throw prevError;

      const reviewableCurrentInvoices = currentInvoices?.filter(inv => !inv.no_revisar) || [];
      const reviewablePreviousInvoices = previousInvoices?.filter(inv => !inv.no_revisar) || [];

      const prevClients = new Set(reviewablePreviousInvoices.map(inv => inv.alias));
      const currentClients = new Set(reviewableCurrentInvoices.map(inv => inv.alias));

      const newClients = reviewableCurrentInvoices.filter(inv => !prevClients.has(inv.alias));
      const missingClients = reviewablePreviousInvoices.filter(inv => !currentClients.has(inv.alias));

      const importantChanges = [];
      for (const currentInv of reviewableCurrentInvoices) {
        const prevInv = reviewablePreviousInvoices.find(inv => inv.alias === currentInv.alias);
        if (prevInv) {
          const variation = ((currentInv.total - prevInv.total) / prevInv.total) * 100;
          if (Math.abs(variation) >= parseInt(percentage)) {
            importantChanges.push({
              ...currentInv,
              variation: variation.toFixed(2)
            });
          }
        }
      }

      setInvoiceLists({
        newClients: newClients.map(inv => ({
          invoiceNumber: inv.numero_factura,
          clientNumber: inv.alias,
          amount: new Intl.NumberFormat('ca-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }).format(inv.total)
        })),
        missingClients: missingClients.map(inv => ({
          invoiceNumber: inv.numero_factura,
          clientNumber: inv.alias,
          amount: new Intl.NumberFormat('ca-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }).format(inv.total)
        })),
        importantChanges: importantChanges.map(inv => ({
          invoiceNumber: inv.numero_factura,
          clientNumber: inv.alias,
          amount: new Intl.NumberFormat('ca-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }).format(inv.total),
          variation: `${inv.variation}%`
        })),
        totals: {
          newClients: new Intl.NumberFormat('ca-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }).format(newClients.reduce((sum, inv) => sum + inv.total, 0)),
          missingClients: new Intl.NumberFormat('ca-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }).format(missingClients.reduce((sum, inv) => sum + inv.total, 0)),
          importantChanges: new Intl.NumberFormat('ca-ES', { 
            style: 'currency', 
            currency: 'EUR' 
          }).format(importantChanges.reduce((sum, inv) => sum + inv.total, 0))
        }
      });

    } catch (error) {
      console.error('Error loading invoices:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'han pogut carregar les factures.',
      });
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [selectedMonth, selectedYear]);

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <MonthYearSelector
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={setSelectedMonth}
          onYearChange={setSelectedYear}
        />
        <PercentageControl
          percentage={percentage}
          onPercentageChange={setPercentage}
          onSave={handleSavePercentage}
        />
        <ActionButtons
          onUploadComplete={loadInvoices}
          selectedMonth={getMonthNumber(selectedMonth)}
          selectedYear={parseInt(selectedYear)}
        />
      </div>

      <Separator />

      <StatsCards
        totalInvoices={stats.totalInvoices}
        reviewInvoices={stats.reviewInvoices}
        totalAmount={stats.totalAmount}
      />

      <InvoiceLists
        newClients={invoiceLists.newClients}
        missingClients={invoiceLists.missingClients}
        importantChanges={invoiceLists.importantChanges}
        totals={invoiceLists.totals}
      />
    </div>
  );
}