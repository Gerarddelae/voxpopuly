'use client';

import { useState } from 'react';
import type { VotingPointWithDetails, Candidate } from '@/lib/types/database.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, User, Users, Edit, Trash2, UserCircle } from 'lucide-react';
import { CandidateFormDialog } from '@/components/admin/candidate-form-dialog';
import { CandidateEditDialog } from '@/components/admin/candidate-edit-dialog';
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
  const [candidateFormOpen, setCandidateFormOpen] = useState(false);
  const [candidateEditOpen, setCandidateEditOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);

  if (!votingPoint) return null;

  const handleAddCandidate = () => {
    setCandidateFormOpen(true);
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

  const handleCandidateFormSuccess = () => {
    setCandidateFormOpen(false);
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  };

  const handleEditCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCandidateEditOpen(true);
  };

  const handleCandidateEditSuccess = () => {
    setCandidateEditOpen(false);
    setSelectedCandidate(null);
    onOpenChange(false);
    setTimeout(() => onOpenChange(true), 100);
  };

  const handleDeleteCandidate = async (candidate: Candidate) => {
    if (!confirm(`¿Estás seguro de eliminar al candidato "${candidate.full_name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/candidates/${candidate.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        onOpenChange(false);
        setTimeout(() => onOpenChange(true), 100);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Error al eliminar el candidato');
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

            {/* Candidates Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Candidatos ({votingPoint.candidates?.length || 0})
                </h3>
                <Button size="sm" onClick={handleAddCandidate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar candidato
                </Button>
              </div>

              {!votingPoint.candidates || votingPoint.candidates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No hay candidatos en el tarjetón de este punto de votación
                    </p>
                    <Button onClick={handleAddCandidate}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar primer candidato
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {votingPoint.candidates.map((candidate) => (
                    <Card key={candidate.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          {candidate.photo_url ? (
                            <img
                              src={candidate.photo_url}
                              alt={candidate.full_name}
                              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <UserCircle className="h-7 w-7 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{candidate.full_name}</p>
                              {candidate.full_name === 'Voto en Blanco' && (
                                <Badge variant="secondary" className="text-xs">Automático</Badge>
                              )}
                            </div>
                            {candidate.role && (
                              <p className="text-sm text-muted-foreground">{candidate.role}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {candidate.vote_count} votos
                            </Badge>
                            {candidate.full_name !== 'Voto en Blanco' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditCandidate(candidate)}
                                  title="Editar candidato"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteCandidate(candidate)}
                                  title="Eliminar candidato"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CandidateFormDialog
        open={candidateFormOpen}
        onOpenChange={setCandidateFormOpen}
        votingPointId={votingPoint.id}
        onSuccess={handleCandidateFormSuccess}
      />

      <CandidateEditDialog
        open={candidateEditOpen}
        onOpenChange={setCandidateEditOpen}
        candidate={selectedCandidate}
        onSuccess={handleCandidateEditSuccess}
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
