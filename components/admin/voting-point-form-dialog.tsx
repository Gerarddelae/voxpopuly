'use client';

import { useState, useEffect } from 'react';
import type { VotingPointFormData, Profile } from '@/lib/types/database.types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { DelegateFormDialog } from './delegate-form-dialog';

interface VotingPointFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  electionId: string;
  assignedDelegateIds?: string[];
  onSuccess: () => void;
}

export function VotingPointFormDialog({
  open,
  onOpenChange,
  electionId,
  assignedDelegateIds,
  onSuccess,
}: VotingPointFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [delegates, setDelegates] = useState<Profile[]>([]);
  const [delegateFormOpen, setDelegateFormOpen] = useState(false);
  const [formData, setFormData] = useState<VotingPointFormData>({
    name: '',
    location: '',
    delegate_id: undefined,
  });

  useEffect(() => {
    if (open) {
      loadDelegates();
      setFormData({
        name: '',
        location: '',
        delegate_id: undefined,
      });
    }
  }, [open]);

  const loadDelegates = async () => {
    try {
      // El backend ya filtra globalmente los delegados asignados a cualquier punto
      const response = await fetch('/api/delegates', {
        cache: 'no-store',
      });
      const result = await response.json();
      if (result.success) {
        const data: Profile[] = result.data || [];
        console.log('[VotingPointForm] Available delegates:', data.length);
        setDelegates(data);
      }
    } catch (error) {
      console.error('Error loading delegates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/elections/${electionId}/voting-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving voting point:', error);
      alert('Error al guardar el punto de votación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nuevo Punto de Votación</DialogTitle>
            <DialogDescription>
              Crea un nuevo punto de votación para esta elección
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Mesa 1 - Edificio Principal"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Ej: Piso 2, Salón 201"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="delegate">Delegado asignado</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDelegateFormOpen(true)}
                  className="h-auto py-1 px-2 text-xs"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Nuevo delegado
                </Button>
              </div>
              <Select
                value={formData.delegate_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, delegate_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar delegado (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {delegates.map((delegate) => (
                    <SelectItem key={delegate.id} value={delegate.id}>
                      {delegate.full_name} ({delegate.document})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
                <p className="text-xs text-muted-foreground">
                  Puedes asignar un delegado más tarde
                </p>
                <p className="text-xs text-muted-foreground">
                  Nota: los delegados ya asignados a otra mesa no aparecen en este listado.
                </p>
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
              Crear
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <DelegateFormDialog
        open={delegateFormOpen}
        onOpenChange={setDelegateFormOpen}
        onSuccess={() => {
          setDelegateFormOpen(false);
          loadDelegates();
        }}
      />
    </Dialog>
  );
}
