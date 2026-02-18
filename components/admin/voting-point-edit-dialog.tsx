'use client';

import { useState, useEffect, useMemo } from 'react';
import type { VotingPoint, VotingPointFormData, Profile, Candidate, Voter } from '@/lib/types/database.types';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Plus, Edit, Trash2, Users, UserCheck, UserCircle, Upload } from 'lucide-react';
import { DelegateFormDialog } from './delegate-form-dialog';
import { CandidateFormDialog } from './candidate-form-dialog';
import { CandidateEditDialog } from './candidate-edit-dialog';
import { VoterAssignInline } from './voter-assign-dialog';
import { VoterFormDialog } from './voter-form-dialog';
import { VoterBulkUploadDialog } from './voter-bulk-upload-dialog';

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
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [delegateFormOpen, setDelegateFormOpen] = useState(false);
  const [candidateFormOpen, setCandidateFormOpen] = useState(false);
  const [candidateEditOpen, setCandidateEditOpen] = useState(false);
  const [showAssignVoters, setShowAssignVoters] = useState(false);
  const [voterFormOpen, setVoterFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState<VotingPointFormData>({
    name: votingPoint.name,
    location: votingPoint.location || '',
    delegate_id: votingPoint.delegate_id || undefined,
  });

  useEffect(() => {
    if (open) {
      loadDelegates();
      loadCandidates();
      loadVoters();
      setFormData({
        name: votingPoint.name,
        location: votingPoint.location || '',
        delegate_id: votingPoint.delegate_id || undefined,
      });
      setActiveTab('info');
      setShowAssignVoters(false);
    }
  }, [open, votingPoint]);

  const loadDelegates = async () => {
    try {
      // Excluir delegados ya asignados globalmente, permitiendo el delegado actual del punto
      const params = new URLSearchParams();
      if (votingPoint.delegate_id) params.set('allowDelegateId', votingPoint.delegate_id);
      console.log('[VP Edit] Loading delegates', {
        allowDelegateId: votingPoint.delegate_id,
        url: `/api/delegates?${params.toString()}`,
      });
      const response = await fetch(`/api/delegates?${params.toString()}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      console.log('[VP Edit] Delegates API response:', result);
      if (result.success) {
        const data: Profile[] = result.data || [];
        console.log('[VP Edit] Delegates count from API:', data.length);
        setDelegates(data);
      }
    } catch (error) {
      console.error('Error loading delegates:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      const response = await fetch(`/api/voting-points/${votingPoint.id}/candidates`);
      const result = await response.json();
      if (result.success) {
        setCandidates(result.data);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const loadVoters = async () => {
    try {
      const response = await fetch(`/api/voting-points/${votingPoint.id}/voters`);
      const result = await response.json();
      if (result.success) {
        setVoters(result.data);
      }
    } catch (error) {
      console.error('Error loading voters:', error);
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

  const handleEditCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setCandidateEditOpen(true);
  };

  const handleCandidateEditSuccess = () => {
    setCandidateEditOpen(false);
    setSelectedCandidate(null);
    loadCandidates();
  };

  const handleCandidateFormSuccess = () => {
    setCandidateFormOpen(false);
    loadCandidates();
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
        loadCandidates();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('Error al eliminar el candidato');
    }
  };

  const handleDeleteVoter = async (voter: Voter) => {
    const voterName = voter.profile?.full_name || 'este votante';
    if (!confirm(`¿Estás seguro de eliminar a "${voterName}" de este punto de votación?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/voting-points/${votingPoint.id}/voters/${voter.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        loadVoters();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting voter:', error);
      alert('Error al eliminar el votante');
    }
  };

  // Memoizar los IDs de votantes asignados para evitar recrear el array
  const assignedVoterIds = useMemo(
    () => voters.map(v => v.profile_id),
    [voters]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Punto de Votación</DialogTitle>
            <DialogDescription>
              Modifica la información del punto de votación y gestiona sus candidatos
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="candidates">
                Candidatos ({candidates.length})
              </TabsTrigger>
              <TabsTrigger value="voters">
                Votantes ({voters.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab de Información */}
            <TabsContent value="info" className="space-y-4">
              <form onSubmit={handleSubmit}>
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
                    Actualizar
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* Tab de Candidatos */}
            <TabsContent value="candidates" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Gestiona los candidatos del tarjetón para este punto de votación
                </p>
                <Button size="sm" onClick={() => setCandidateFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo candidato
                </Button>
              </div>

              {candidates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No hay candidatos en el tarjetón de este punto de votación
                    </p>
                    <Button onClick={() => setCandidateFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar primer candidato
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {candidates.map((candidate) => (
                    <Card key={candidate.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          {candidate.photo_url ? (
                            <img
                              src={candidate.photo_url}
                              alt={candidate.full_name}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <UserCircle className="h-6 w-6 text-muted-foreground/50" />
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* Tab de Votantes */}
            <TabsContent value="voters" className="space-y-4">
              {showAssignVoters ? (
                <VoterAssignInline
                  votingPointId={votingPoint.id}
                  assignedVoterIds={assignedVoterIds}
                  onSuccess={() => {
                    setShowAssignVoters(false);
                    loadVoters();
                  }}
                  onBack={() => setShowAssignVoters(false)}
                />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Gestiona los votantes autorizados para este punto de votación
                    </p>
                  </div>

                  {/* Action buttons group */}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setVoterFormOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Crear votante
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setBulkUploadOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Carga masiva
                    </Button>
                    <Button size="sm" onClick={() => setShowAssignVoters(true)}>
                      <Users className="mr-2 h-4 w-4" />
                      Asignar existentes
                    </Button>
                  </div>

                  {voters.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-2">
                          No hay votantes asignados a este punto de votación
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Usa los botones de arriba para crear, cargar o asignar votantes
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-3">
                      {voters.map((voter) => (
                        <Card key={voter.id}>
                          <CardContent className="py-3">
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1">
                                <p className="font-medium">
                                  {voter.profile?.full_name || 'Sin nombre'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Doc: {voter.profile?.document || 'N/A'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {voter.has_voted ? (
                                  <Badge variant="default">Ya votó</Badge>
                                ) : (
                                  <Badge variant="outline">Pendiente</Badge>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteVoter(voter)}
                                  title="Eliminar votante"
                                  disabled={voter.has_voted}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                    >
                      Cerrar
                    </Button>
                  </DialogFooter>
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DelegateFormDialog
        open={delegateFormOpen}
        onOpenChange={setDelegateFormOpen}
        onSuccess={() => {
          setDelegateFormOpen(false);
          loadDelegates();
        }}
      />

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

      <VoterFormDialog
        open={voterFormOpen}
        onOpenChange={setVoterFormOpen}
        votingPointId={votingPoint.id}
        onSuccess={() => {
          setVoterFormOpen(false);
          loadVoters();
        }}
      />

      <VoterBulkUploadDialog
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        votingPointId={votingPoint.id}
        onSuccess={() => {
          setBulkUploadOpen(false);
          loadVoters();
        }}
      />


    </>
  );
}
