'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PercentageControlProps {
  percentage: string;
  onPercentageChange: (value: string) => void;
  onSave: () => void;
}

export function PercentageControl({
  percentage,
  onPercentageChange,
  onSave,
}: PercentageControlProps) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        value={percentage}
        onChange={(e) => onPercentageChange(e.target.value)}
        className="w-20 text-center"
        min="0"
        max="100"
      />
      <span className="text-muted-foreground">%</span>
      <Button variant="outline" size="sm" onClick={onSave}>
        Guardar
      </Button>
    </div>
  );
}