'use client';

import { useState, useEffect } from 'react';
import type { Election, ElectionFormData } from '@/lib/types/database.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ElectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election: Election | null;
  onSuccess: () => void;
}

export function ElectionFormDialog({
  open,
  onOpenChange,
  election,
  onSuccess,
}: ElectionFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ElectionFormData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (election) {
      // Convert UTC to local datetime-local format (YYYY-MM-DDTHH:mm)
      const startDate = new Date(election.start_date);
      const endDate = new Date(election.end_date);
      
      const formatDateTimeLocal = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        title: election.title,
        description: election.description || '',
        start_date: formatDateTimeLocal(startDate),
        end_date: formatDateTimeLocal(endDate),
      });
    } else {
      setFormData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
      });
    }
  }, [election, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = election
        ? `/api/elections/${election.id}`
        : '/api/elections';
      
      const method = election ? 'PUT' : 'POST';

      // Convert datetime-local to ISO string
      // datetime-local format: YYYY-MM-DDTHH:mm (in local time)
      // We need to convert this to ISO format preserving the local time as-is
      const startDateTime = new Date(formData.start_date);
      const endDateTime = new Date(formData.end_date);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving election:', error);
      alert('Error al guardar la elección');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {election ? 'Editar Elección' : 'Nueva Elección'}
            </DialogTitle>
            <DialogDescription>
              {election
                ? 'Modifica los detalles de la elección'
                : 'Crea un nuevo evento de votación'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Ej: Elecciones Estudiantiles 2026"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del evento electoral"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">
                  Fecha y hora de inicio <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">Hora local de Colombia (COT)</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">
                  Fecha y hora de fin <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="end_date"
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">Hora local de Colombia (COT)</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {election ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
