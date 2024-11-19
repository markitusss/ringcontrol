'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from '@/lib/supabase';

interface ExcludedInvoice {
  numero_factura: string;
  alias: string;
  total: number;
}

interface ExcludedInvoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: ExcludedInvoice[];
}

interface ClientNames {
  [key: string]: string;
}

export function ExcludedInvoicesDialog({
  open,
  onOpenChange,
  invoices,
}: ExcludedInvoicesDialogProps) {
  const [clientNames, setClientNames] = useState<ClientNames>({});

  useEffect(() => {
    const loadClientNames = async () => {
      const allAliases = invoices.map(i => i.alias);

      const { data } = await supabase
        .from('clients')
        .select('alias, name')
        .in('alias', allAliases);

      if (data) {
        const names = data.reduce((acc, client) => ({
          ...acc,
          [client.alias]: client.name || client.alias
        }), {} as ClientNames);
        setClientNames(names);
      }
    };

    if (open && invoices.length > 0) {
      loadClientNames();
    }
  }, [open, invoices]);

  const getClientDisplay = (alias: string) => clientNames[alias] || alias;

  const totalAmount = new Intl.NumberFormat('ca-ES', { 
    style: 'currency', 
    currency: 'EUR' 
  }).format(invoices.reduce((sum, inv) => sum + inv.total, 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-center mb-4">Factures Excloses</DialogTitle>
          <div className="text-center text-2xl font-bold mb-6">{totalAmount}</div>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Núm. Factura</TableHead>
              <TableHead>Client</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.numero_factura}>
                <TableCell>{invoice.numero_factura}</TableCell>
                <TableCell>{getClientDisplay(invoice.alias)}</TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('ca-ES', { 
                    style: 'currency', 
                    currency: 'EUR' 
                  }).format(invoice.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}