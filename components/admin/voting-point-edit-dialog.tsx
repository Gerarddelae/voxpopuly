'use client';

import { useState, useEffect, useMemo } from 'react';
import type { VotingPoint, VotingPointFormData, Profile, SlateWithDetails, Voter } from '@/lib/types/database.types';
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
import { Loader2, UserPlus, Plus, Edit, Trash2, Users, UserCheck, UserCircle } from 'lucide-react';
import { DelegateFormDialog } from './delegate-form-dialog';
import { SlateFormDialog } from './slate-form-dialog';
import { SlateEditDialog } from './slate-edit-dialog';
import { VoterAssignInline } from './voter-assign-dialog';

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
  const [slates, setSlates] = useState<SlateWithDetails[]>([]);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [delegateFormOpen, setDelegateFormOpen] = useState(false);
  const [slateFormOpen, setSlateFormOpen] = useState(false);
  const [slateEditOpen, setSlateEditOpen] = useState(false);
  const [showAssignVoters, setShowAssignVoters] = useState(false);
  const [selectedSlate, setSelectedSlate] = useState<SlateWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState<VotingPointFormData>({
    name: votingPoint.name,
    location: votingPoint.location || '',
    delegate_id: votingPoint.delegate_id || undefined,
  });

  useEffect(() => {
    if (open) {
      loadDelegates();
      loadSlates();
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

  const loadSlates = async () => {
    try {
      const response = await fetch(`/api/voting-points/${votingPoint.id}/slates`);
      const result = await response.json();
      if (result.success) {
        setSlates(result.data);
      }
    } catch (error) {
      console.error('Error loading slates:', error);
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

  const handleEditSlate = (slate: SlateWithDetails) => {
    setSelectedSlate(slate);
    setSlateEditOpen(true);
  };

  const handleSlateEditSuccess = () => {
    setSlateEditOpen(false);
    setSelectedSlate(null);
    loadSlates();
  };

  const handleSlateFormSuccess = () => {
    setSlateFormOpen(false);
    loadSlates();
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
        loadSlates();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting slate:', error);
      alert('Error al eliminar la plancha');
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
              Modifica la información del punto de votación y gestiona sus planchas
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Información</TabsTrigger>
              <TabsTrigger value="slates">
                Planchas ({slates.length})
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

            {/* Tab de Planchas */}
            <TabsContent value="slates" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Gestiona las planchas de candidatos para este punto de votación
                </p>
                <Button size="sm" onClick={() => setSlateFormOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva plancha
                </Button>
              </div>

              {slates.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      No hay planchas creadas para este punto de votación
                    </p>
                    <Button onClick={() => setSlateFormOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear primera plancha
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {slates.map((slate) => (
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
                                  className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/50"
                                >
                                  {member.photo_url ? (
                                    <img
                                      src={member.photo_url}
                                      alt={member.full_name}
                                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                      <UserCircle className="h-5 w-5 text-muted-foreground/50" />
                                    </div>
                                  )}
                                  <span className="font-medium flex-1">{member.full_name}</span>
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
                    <Button size="sm" onClick={() => setShowAssignVoters(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Asignar votantes
                    </Button>
                  </div>

                  {voters.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <UserCheck className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          No hay votantes asignados a este punto de votación
                        </p>
                        <Button onClick={() => setShowAssignVoters(true)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Asignar primeros votantes
                        </Button>
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


    </>
  );
}
