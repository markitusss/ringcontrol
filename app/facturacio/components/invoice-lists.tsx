'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Invoice {
  invoiceNumber: string;
  clientNumber: string;
  amount: string;
  variation?: string;
}

interface InvoiceListsProps {
  newClients: Invoice[];
  missingClients: Invoice[];
  importantChanges: Invoice[];
  totals: {
    newClients: string;
    missingClients: string;
    importantChanges: string;
  };
}

interface ClientNames {
  [key: string]: string;
}

export function InvoiceLists({ newClients, missingClients, importantChanges, totals }: InvoiceListsProps) {
  const [clientNames, setClientNames] = useState<ClientNames>({});

  useEffect(() => {
    const loadClientNames = async () => {
      const allAliases = [
        ...newClients.map(i => i.clientNumber),
        ...missingClients.map(i => i.clientNumber),
        ...importantChanges.map(i => i.clientNumber)
      ];

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

    loadClientNames();
  }, [newClients, missingClients, importantChanges]);

  const getClientDisplay = (alias: string) => clientNames[alias] || alias;

  return (
    <div className="grid grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Nous Clients</CardTitle>
            <div className="text-lg font-semibold text-primary">{totals.newClients}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Núm. Factura</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newClients.map((invoice) => (
                <TableRow 
                  key={invoice.invoiceNumber}
                  className="bg-green-50 dark:bg-green-900/20"
                >
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{getClientDisplay(invoice.clientNumber)}</TableCell>
                  <TableCell className="text-right">{invoice.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Clients que Falten</CardTitle>
            <div className="text-lg font-semibold text-primary">{totals.missingClients}</div>
          </div>
        </CardHeader>
        <CardContent>
          {missingClients.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Sense canvis
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Núm. Factura</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missingClients.map((invoice) => (
                  <TableRow 
                    key={invoice.invoiceNumber}
                    className="bg-red-50 dark:bg-red-900/20"
                  >
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{getClientDisplay(invoice.clientNumber)}</TableCell>
                    <TableCell className="text-right">{invoice.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Canvis Importants</CardTitle>
            <div className="text-lg font-semibold text-primary">{totals.importantChanges}</div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Núm. Factura</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Variació</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {importantChanges.map((invoice) => {
                const variation = parseFloat(invoice.variation?.replace('%', '') || '0');
                const isPositive = variation > 0;
                return (
                  <TableRow 
                    key={invoice.invoiceNumber}
                    className={cn(
                      isPositive ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20',
                      'transition-colors'
                    )}
                  >
                    <TableCell>{invoice.invoiceNumber}</TableCell>
                    <TableCell>{getClientDisplay(invoice.clientNumber)}</TableCell>
                    <TableCell className="text-right">{invoice.amount}</TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {isPositive ? '+' : ''}{invoice.variation}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}