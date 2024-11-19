'use client';

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { read, utils } from "xlsx";
import { supabase } from "@/lib/supabase";
import { parse, isValid } from "date-fns";

const months = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

interface UploadExcelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMonth: number;
  selectedYear: number;
}

type ImportStatus = {
  status: 'idle' | 'processing' | 'success' | 'error';
  message: string;
  progress: number;
};

type FacturaData = {
  numero_factura: string;
  fecha: Date;
  alias: string;
  total: number;
  mes: number;
  anio: number;
  no_revisar: boolean;
};

interface ExcelRow {
  [key: string]: any;
  'numero factura'?: string;
  'numero_factura'?: string;
  fecha: any;
  alias: string;
  total: any;
  'no revisar'?: boolean;
  'no_revisar'?: boolean;
}

const parseExcelDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  if (typeof dateValue === 'number') {
    const date = new Date(Math.round((dateValue - 25569) * 86400 * 1000));
    if (isValid(date)) return date;
  }

  if (typeof dateValue === 'string') {
    const formats = [
      'dd/MM/yyyy',
      'MM/dd/yyyy',
      'yyyy-MM-dd',
      'dd-MM-yyyy',
      'dd.MM.yyyy',
      'yyyy.MM.dd',
    ];

    for (const format of formats) {
      const parsedDate = parse(dateValue, format, new Date());
      if (isValid(parsedDate)) {
        return parsedDate;
      }
    }
  }

  if (dateValue instanceof Date && isValid(dateValue)) {
    return dateValue;
  }

  return null;
};

export function UploadExcelDialog({
  open,
  onOpenChange,
  selectedMonth,
  selectedYear,
}: UploadExcelDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [targetMonth, setTargetMonth] = useState<number>(selectedMonth);
  const [targetYear, setTargetYear] = useState<number>(selectedYear);
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    status: 'idle',
    message: '',
    progress: 0,
  });

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const updateStatus = (status: ImportStatus) => {
    setImportStatus(status);
    if (status.status === 'error') {
      toast({
        variant: "destructive",
        title: "Error en la importación",
        description: status.message,
      });
    }
  };

  const resetStatus = () => {
    setImportStatus({
      status: 'idle',
      message: '',
      progress: 0,
    });
    setFile(null);
    setTargetMonth(selectedMonth);
    setTargetYear(selectedYear);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        updateStatus({
          status: 'error',
          message: 'El archivo debe ser de tipo Excel (.xlsx, .xls)',
          progress: 0,
        });
        return;
      }
      setFile(selectedFile);
      setImportStatus({
        status: 'idle',
        message: '',
        progress: 0,
      });
    }
  };

  const validateExcelData = (data: ExcelRow[]): boolean => {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("El archivo no contiene datos válidos");
    }

    const requiredColumns = ['numero factura', 'fecha', 'alias', 'total', 'no revisar'];
    const firstRow = data[0];
    
    if (!firstRow) {
      throw new Error("El archivo está vacío");
    }

    const headers = Object.keys(firstRow).map(key => key.toLowerCase().trim());
    
    const missingColumns = requiredColumns.filter(col => 
      !headers.some(header => header.replace(/_/g, ' ') === col)
    );

    if (missingColumns.length > 0) {
      throw new Error(`Columnas requeridas faltantes: ${missingColumns.join(', ')}`);
    }

    return true;
  };

  const parseTotal = (value: any): number => {
    if (!value && value !== 0) {
      throw new Error("El total no puede estar vacío");
    }

    if (typeof value === 'string') {
      const cleanValue = value
        .replace(/[^0-9,.-]/g, '')
        .replace(',', '.');
      const number = parseFloat(cleanValue);
      if (isNaN(number)) {
        throw new Error(`Total inválido: ${value}`);
      }
      return number;
    }

    const number = Number(value);
    if (isNaN(number)) {
      throw new Error(`Total inválido: ${value}`);
    }
    return number;
  };

  const ensureClientsExist = async (aliases: string[]) => {
    const uniqueAliases = Object.keys(
      aliases.reduce((acc: { [key: string]: boolean }, alias) => {
        acc[alias] = true;
        return acc;
      }, {})
    );
    
    const { data: existingClients, error: queryError } = await supabase
      .from('clients')
      .select('alias')
      .in('alias', uniqueAliases);

    if (queryError) throw queryError;

    const existingAliasSet = (existingClients || []).reduce((acc: { [key: string]: boolean }, client) => {
      acc[client.alias] = true;
      return acc;
    }, {});

    const newAliases = uniqueAliases.filter(alias => !existingAliasSet[alias]);

    if (newAliases.length > 0) {
      const { error: insertError } = await supabase
        .from('clients')
        .insert(newAliases.map(alias => ({ alias })));

      if (insertError) throw insertError;
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      updateStatus({
        status: 'processing',
        message: 'Leyendo archivo Excel...',
        progress: 10,
      });

      const buffer = await file.arrayBuffer();
      const workbook = read(buffer, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = utils.sheet_to_json(worksheet) as ExcelRow[];

      validateExcelData(rawData);

      updateStatus({
        status: 'processing',
        message: 'Procesando datos...',
        progress: 30,
      });

      const facturas: FacturaData[] = [];
      const errores: string[] = [];
      const aliases = new Set<string>();

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        try {
          const numeroFactura = (row['numero factura'] || row['numero_factura'])?.toString().trim();
          if (!numeroFactura) {
            throw new Error('Falta el número de factura');
          }

          const fecha = parseExcelDate(row.fecha);
          if (!fecha) {
            throw new Error(`Fecha inválida: ${row.fecha}. Use el formato dd/mm/yyyy`);
          }

          const alias = String(row.alias || '').trim();
          if (!alias) {
            throw new Error('Falta el alias');
          }
          aliases.add(alias);

          const total = parseTotal(row.total);
          const noRevisar = Boolean(row['no revisar'] || row['no_revisar']);

          facturas.push({
            numero_factura: numeroFactura,
            fecha,
            alias,
            total,
            mes: targetMonth,
            anio: targetYear,
            no_revisar: noRevisar
          });
        } catch (error: any) {
          errores.push(`Fila ${i + 2}: ${error.message}`);
        }
      }

      if (errores.length > 0) {
        throw new Error(`Errores en los datos:\n${errores.join('\n')}`);
      }

      if (facturas.length === 0) {
        throw new Error("No hay facturas válidas para importar");
      }

      updateStatus({
        status: 'processing',
        message: 'Verificando clientes...',
        progress: 50,
      });

      await ensureClientsExist(Array.from(aliases));

      updateStatus({
        status: 'processing',
        message: 'Importando datos...',
        progress: 70,
      });

      const { error: deleteError } = await supabase
        .from('facturas')
        .delete()
        .eq('mes', targetMonth)
        .eq('anio', targetYear);

      if (deleteError) {
        throw deleteError;
      }

      const { error: insertError } = await supabase
        .from('facturas')
        .insert(
          facturas.map(f => ({
            ...f,
            fecha: f.fecha.toISOString()
          }))
        );

      if (insertError) {
        throw insertError;
      }

      const { error: historialError } = await supabase
        .from('historial_importacion')
        .insert([{
          mes: targetMonth,
          anio: targetYear,
          fecha_importacion: new Date().toISOString()
        }]);

      if (historialError) {
        console.error("Error al registrar en historial:", historialError);
      }

      updateStatus({
        status: 'success',
        message: `Se importaron ${facturas.length} facturas correctamente`,
        progress: 100,
      });

      toast({
        title: "Importación exitosa",
        description: `Se han importado ${facturas.length} facturas correctamente.`,
      });

      setTimeout(() => {
        onOpenChange(false);
        resetStatus();
      }, 2000);

    } catch (error: any) {
      console.error("Error durante la importación:", error);
      updateStatus({
        status: 'error',
        message: error.message || "Error desconocido durante la importación",
        progress: 0,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetStatus();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar Facturas</DialogTitle>
          <DialogDescription>
            Selecciona el archivo Excel y el período al que corresponden las facturas
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="excel-file">Archivo Excel</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importStatus.status === 'processing'}
            />
            <p className="text-sm text-muted-foreground">
              El archivo debe contener las columnas: numero factura, fecha, alias, total, no revisar
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Mes</Label>
              <Select
                value={targetMonth.toString()}
                onValueChange={(value) => setTargetMonth(parseInt(value))}
                disabled={importStatus.status === 'processing'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Año</Label>
              <Select
                value={targetYear.toString()}
                onValueChange={(value) => setTargetYear(parseInt(value))}
                disabled={importStatus.status === 'processing'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {importStatus.status !== 'idle' && (
            <div className="space-y-2">
              <Progress value={importStatus.progress} className="w-full" />
              <div className="flex items-center gap-2 text-sm">
                {importStatus.status === 'processing' && (
                  <Upload className="h-4 w-4 animate-spin" />
                )}
                {importStatus.status === 'success' && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {importStatus.status === 'error' && (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                )}
                <span className={
                  importStatus.status === 'error' ? 'text-destructive' : 
                  importStatus.status === 'success' ? 'text-green-500' : ''
                }>
                  {importStatus.message}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetStatus();
            }}
            disabled={importStatus.status === 'processing'}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!file || importStatus.status === 'processing'}
          >
            {importStatus.status === 'processing' ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}