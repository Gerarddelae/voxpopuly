'use client';

import { useState } from 'react';
import type { VotingPointWithDetails, SlateWithDetails } from '@/lib/types/database.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, User, Users, Edit, Trash2 } from 'lucide-react';
import { SlateFormDialog } from '@/components/admin/slate-form-dialog';
import { SlateEditDialog } from '@/components/admin/slate-edit-dialog';
import { VotingPointEditDialog } from '@/components/admin/voting-point-edit-dialog';

interface VotingPointDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  votingPoint: VotingPointWithDetails | null;
  onUpdate?: () => void;
}

export function VotingPointDetailsDialog({
  open,
  onOpenChange,
  votingPoint,
  onUpdate,
}: VotingPointDetailsDialogProps) {
  const [slateFormOpen, setSlateFormOpen] = useState(false);
  const [slateEditOpen, setSlateEditOpen] = useState(false);
  const [selectedSlate, setSelectedSlate] = useState<SlateWithDetails | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);

  if (!votingPoint) return null;

  const handleAddSlate = () => {
    setSlateFormOpen(true);
  };

  const handleEdit = () => {
    setEditFormOpen(true);
  };

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar el punto de votación "${votingPoint.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/voting-points/${votingPoint.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        onOpenChange(false);
        onUpdate?.();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting voting point:', error);
      alert('Error al eliminar el punto de votación');
    }
  };

  const handleSlateFormSuccess = () => {
    setSlateFormOpen(false);
    // Re-fetch voting point details
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  };

  const handleEditSlate = (slate: SlateWithDetails) => {
    setSelectedSlate(slate);
    setSlateEditOpen(true);
  };

  const handleSlateEditSuccess = () => {
    setSlateEditOpen(false);
    setSelectedSlate(null);
    // Re-fetch voting point details
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  };

  const handleDeleteSlate = async (slate: SlateWithDetails) => {
    if (!confirm(`¿Estás seguro de eliminar la plancha "${slate.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/slates/${slate.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        // Re-fetch voting point details
        onOpenChange(false);
        setTimeout(() => onOpenChange(true), 100);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting slate:', error);
      alert('Error al eliminar la plancha');
    }
  };

  const handleEditSuccess = () => {
    setEditFormOpen(false);
    onOpenChange(false);
    onUpdate?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{votingPoint.name}</DialogTitle>
            <DialogDescription>
              {votingPoint.location && (
                <span className="flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {votingPoint.location}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Info Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Información</CardTitle>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleEdit}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {votingPoint.delegate ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Delegado asignado</p>
                      <p className="text-sm text-muted-foreground">
                        {votingPoint.delegate.full_name} ({votingPoint.delegate.document})
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <p className="text-sm">Sin delegado asignado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Slates Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Planchas ({votingPoint.slates?.length || 0})
                </h3>
                <Button size="sm" onClick={handleAddSlate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar plancha
                </Button>
              </div>

              {!votingPoint.slates || votingPoint.slates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No hay planchas creadas para este punto de votación
                    </p>
                    <Button onClick={handleAddSlate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear primera plancha
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {votingPoint.slates.map((slate) => (
                    <Card key={slate.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{slate.name}</CardTitle>
                            {slate.description && (
                              <CardDescription className="mt-1">
                                {slate.description}
                              </CardDescription>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {slate.vote_count} votos
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditSlate(slate)}
                              title="Editar plancha"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteSlate(slate)}
                              title="Eliminar plancha"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {slate.members && slate.members.length > 0 && (
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Candidatos:</p>
                            <div className="grid gap-2">
                              {slate.members.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                                >
                                  <span className="font-medium">{member.full_name}</span>
                                  {member.role && (
                                    <span className="text-muted-foreground">{member.role}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SlateFormDialog
        open={slateFormOpen}
        onOpenChange={setSlateFormOpen}
        votingPointId={votingPoint.id}
        onSuccess={handleSlateFormSuccess}
      />

      <SlateEditDialog
        open={slateEditOpen}
        onOpenChange={setSlateEditOpen}
        slate={selectedSlate}
        onSuccess={handleSlateEditSuccess}
      />

      <VotingPointEditDialog
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        votingPoint={votingPoint}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
