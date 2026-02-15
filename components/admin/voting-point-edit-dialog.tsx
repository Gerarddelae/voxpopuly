'use client';

import { useState, useEffect } from 'react';
import type { VotingPoint, VotingPointFormData, Profile } from '@/lib/types/database.types';
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

interface VotingPointEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  votingPoint: VotingPoint;
  onSuccess: () => void;
}

export function VotingPointEditDialog({
  open,
  onOpenChange,
  votingPoint,
  onSuccess,
}: VotingPointEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [delegates, setDelegates] = useState<Profile[]>([]);
  const [delegateFormOpen, setDelegateFormOpen] = useState(false);
  const [formData, setFormData] = useState<VotingPointFormData>({
    name: votingPoint.name,
    location: votingPoint.location || '',
    delegate_id: votingPoint.delegate_id || undefined,
  });

  useEffect(() => {
    if (open) {
      loadDelegates();
      setFormData({
        name: votingPoint.name,
        location: votingPoint.location || '',
        delegate_id: votingPoint.delegate_id || undefined,
      });
    }
  }, [open, votingPoint]);

  const loadDelegates = async () => {
    try {
      const response = await fetch('/api/delegates');
      const result = await response.json();
      if (result.success) {
        setDelegates(result.data);
      }
    } catch (error) {
      console.error('Error loading delegates:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/voting-points/${votingPoint.id}`, {
        method: 'PUT',
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
      console.error('Error updating voting point:', error);
      alert('Error al actualizar el punto de votación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Punto de Votación</DialogTitle>
            <DialogDescription>
              Modifica la información del punto de votación
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ej: Mesa 1 - Edificio Principal"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-location">Ubicación</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Ej: Piso 2, Salón 201"
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-delegate">Delegado asignado</Label>
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
                value={formData.delegate_id || 'none'}
                onValueChange={(value) =>
                  setFormData({ 
                    ...formData, 
                    delegate_id: value === 'none' ? undefined : value 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar delegado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin delegado</SelectItem>
                  {delegates.map((delegate) => (
                    <SelectItem key={delegate.id} value={delegate.id}>
                      {delegate.full_name} ({delegate.document})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Asigna o cambia el delegado de este punto de votación
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
              Actualizar
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
