'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Candidate, CandidateFormData } from '@/lib/types/database.types';
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
import { Loader2, Camera, UserCircle } from 'lucide-react';

interface CandidateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate | null;
  onSuccess: () => void;
}

export function CandidateEditDialog({
  open,
  onOpenChange,
  candidate,
  onSuccess,
}: CandidateEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [formData, setFormData] = useState<CandidateFormData>({
    full_name: '',
    role: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadCandidateData = useCallback(async () => {
    if (!candidate) return;

    setLoadingData(true);
    try {
      const response = await fetch(`/api/candidates/${candidate.id}`);
      const result = await response.json();

      if (result.success && result.data) {
        const c = result.data;
        setFormData({
          full_name: c.full_name || '',
          role: c.role || '',
          photo_url: c.photo_url || '',
        });
        setPhotoPreview(c.photo_url || null);
        setPhotoFile(null);
      }
    } catch (error) {
      console.error('Error loading candidate data:', error);
    } finally {
      setLoadingData(false);
    }
  }, [candidate]);

  useEffect(() => {
    if (candidate && open) {
      loadCandidateData();
    }
  }, [candidate, open, loadCandidateData]);

  const handlePhotoChange = (file: File | null) => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append('file', file);

      const response = await fetch('/api/upload/candidate-photo', {
        method: 'POST',
        body: fd,
      });

      const result = await response.json();
      if (result.success) {
        return result.data.url;
      }
      console.error('Error uploading photo:', result.error);
      return null;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidate) return;

    setLoading(true);

    try {
      let photo_url = formData.photo_url;
      if (photoFile) {
        const url = await uploadPhoto(photoFile);
        if (url) photo_url = url;
      }

      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          role: formData.role || null,
          photo_url: photo_url || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating candidate:', error);
      alert('Error al actualizar el candidato');
    } finally {
      setLoading(false);
    }
  };

  if (!candidate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar Candidato</DialogTitle>
            <DialogDescription>
              Actualiza la información del candidato
            </DialogDescription>
          </DialogHeader>

          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative w-24 h-24 rounded-full overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-12 w-12 text-muted-foreground/50" />
                  )}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white opacity-0 hover:opacity-100" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    handlePhotoChange(file);
                  }}
                />
                <span className="text-xs text-muted-foreground">Foto del candidato (opcional)</span>
              </div>

              {/* Candidate Info */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">
                    Nombre completo <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Ej: Juan Pérez García"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="role">Cargo (opcional)</Label>
                  <Input
                    id="role"
                    value={formData.role || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    placeholder="Ej: Presidente, Secretario..."
                  />
                </div>
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
