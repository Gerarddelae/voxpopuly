'use client';

import { useState, useRef } from 'react';
import type { SlateFormData, SlateMemberFormData } from '@/lib/types/database.types';
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
import { Loader2, Plus, X, Camera, UserCircle } from 'lucide-react';

interface SlateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  votingPointId: string;
  onSuccess: () => void;
}

export function SlateFormDialog({
  open,
  onOpenChange,
  votingPointId,
  onSuccess,
}: SlateFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SlateFormData>({
    name: '',
    description: '',
  });
  const [members, setMembers] = useState<SlateMemberFormData[]>([
    { full_name: '', role: '' },
  ]);
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null]);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleAddMember = () => {
    setMembers([...members, { full_name: '', role: '' }]);
    setPhotoFiles([...photoFiles, null]);
    setPhotoPreviews([...photoPreviews, null]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
    setPhotoFiles(photoFiles.filter((_, i) => i !== index));
    // Revoke object URL to prevent memory leaks
    if (photoPreviews[index]) {
      URL.revokeObjectURL(photoPreviews[index]!);
    }
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const handlePhotoChange = (index: number, file: File | null) => {
    const newPhotoFiles = [...photoFiles];
    const newPreviews = [...photoPreviews];
    
    // Revoke previous preview URL
    if (newPreviews[index]) {
      URL.revokeObjectURL(newPreviews[index]!);
    }
    
    newPhotoFiles[index] = file;
    newPreviews[index] = file ? URL.createObjectURL(file) : null;
    setPhotoFiles(newPhotoFiles);
    setPhotoPreviews(newPreviews);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload/candidate-photo', {
        method: 'POST',
        body: formData,
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
    setLoading(true);

    try {
      // Filtrar miembros vacíos
      const validMembers = members
        .map((m, i) => ({ member: m, index: i }))
        .filter(({ member }) => member.full_name.trim() !== '');

      // Upload photos for valid members
      const membersWithPhotos: SlateMemberFormData[] = await Promise.all(
        validMembers.map(async ({ member, index }) => {
          let photo_url: string | undefined;
          if (photoFiles[index]) {
            const url = await uploadPhoto(photoFiles[index]!);
            if (url) photo_url = url;
          }
          return {
            full_name: member.full_name,
            role: member.role,
            photo_url,
          };
        })
      );

      const response = await fetch(`/api/voting-points/${votingPointId}/slates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          members: membersWithPhotos.length > 0 ? membersWithPhotos : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Reset form
        setFormData({ name: '', description: '' });
        setMembers([{ full_name: '', role: '' }]);
        setPhotoFiles([null]);
        // Cleanup previews
        photoPreviews.forEach(p => p && URL.revokeObjectURL(p));
        setPhotoPreviews([null]);
        onSuccess();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving slate:', error);
      alert('Error al guardar la plancha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nueva Plancha</DialogTitle>
            <DialogDescription>
              Crea una nueva plancha de candidatos para este punto de votación
            </DialogDescription>
          </DialogHeader>

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
                    className="flex gap-3 items-start p-3 border rounded-lg bg-muted/50"
                  >
                    {/* Photo Upload */}
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="relative w-16 h-16 rounded-full overflow-hidden bg-muted border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRefs.current[index]?.click()}
                      >
                        {photoPreviews[index] ? (
                          <img
                            src={photoPreviews[index]!}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserCircle className="h-8 w-8 text-muted-foreground/50" />
                        )}
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Camera className="h-4 w-4 text-white opacity-0 hover:opacity-100" />
                        </div>
                      </div>
                      <input
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handlePhotoChange(index, file);
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground">Foto</span>
                    </div>
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
              Crear plancha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
