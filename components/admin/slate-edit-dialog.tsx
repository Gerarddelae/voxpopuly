'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SlateFormData, SlateMemberFormData, SlateWithDetails } from '@/lib/types/database.types';
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
import { Loader2, Plus, X } from 'lucide-react';

interface SlateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slate: SlateWithDetails | null;
  onSuccess: () => void;
}

export function SlateEditDialog({
  open,
  onOpenChange,
  slate,
  onSuccess,
}: SlateEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState<SlateFormData>({
    name: '',
    description: '',
  });
  const [members, setMembers] = useState<SlateMemberFormData[]>([
    { full_name: '', role: '' },
  ]);

  // Cargar datos frescos de la plancha
  const loadSlateData = useCallback(async () => {
    if (!slate) return;
    
    console.log('🔍 Cargando datos de plancha:', slate.id);
    setLoadingData(true);
    try {
      const response = await fetch(`/api/slates/${slate.id}`);
      const result = await response.json();
      
      console.log('📦 Datos recibidos de la API:', result);
      
      if (result.success && result.data) {
        const slateData = result.data;
        
        console.log('✅ Datos de la plancha:', slateData);
        console.log('👥 Miembros encontrados:', slateData.members);
        
        setFormData({
          name: slateData.name,
          description: slateData.description || '',
        });
        
        // Cargar miembros existentes o uno vacío
        if (slateData.members && slateData.members.length > 0) {
          const mappedMembers = slateData.members.map((m: any) => ({
            full_name: m.full_name || '',
            role: m.role || '',
          }));
          console.log('✨ Miembros mapeados:', mappedMembers);
          setMembers(mappedMembers);
        } else {
          console.log('⚠️ No se encontraron miembros, usando array vacío');
          setMembers([{ full_name: '', role: '' }]);
        }
      } else {
        console.error('❌ Error en la respuesta:', result);
      }
    } catch (error) {
      console.error('💥 Error loading slate data:', error);
    } finally {
      setLoadingData(false);
    }
  }, [slate]);

  // Cargar datos cuando se abre el diálogo
  useEffect(() => {
    if (slate && open) {
      loadSlateData();
    }
  }, [slate, open, loadSlateData]);

  const handleAddMember = () => {
    setMembers([...members, { full_name: '', role: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleMemberChange = (
    index: number,
    field: keyof SlateMemberFormData,
    value: string
  ) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!slate) return;
    
    setLoading(true);

    try {
      // Filtrar miembros vacíos
      const validMembers = members.filter((m) => m.full_name.trim() !== '');

      const response = await fetch(`/api/slates/${slate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          members: validMembers,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating slate:', error);
      alert('Error al actualizar la plancha');
    } finally {
      setLoading(false);
    }
  };

  if (!slate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Plancha</DialogTitle>
            <DialogDescription>
              Actualiza la información de la plancha y sus candidatos
            </DialogDescription>
          </DialogHeader>

          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              {/* Slate Info */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Nombre de la plancha <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Ej: Lista A - Renovación"
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
                    placeholder="Descripción de la plancha o propuesta"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Members Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Candidatos</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMember}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar candidato
                  </Button>
                </div>

                <div className="space-y-3">
                  {members.map((member, index) => (
                    <div
                      key={index}
                      className="flex gap-2 items-start p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Nombre completo"
                          value={member.full_name || ''}
                          onChange={(e) =>
                            handleMemberChange(index, 'full_name', e.target.value)
                          }
                          autoComplete="off"
                        />
                        <Input
                          placeholder="Cargo (opcional)"
                          value={member.role || ''}
                          onChange={(e) =>
                            handleMemberChange(index, 'role', e.target.value)
                          }
                          autoComplete="off"
                        />
                      </div>
                      {members.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  Puedes agregar todos los candidatos que necesites. Los campos de cargo son opcionales.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || loadingData}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || loadingData}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
