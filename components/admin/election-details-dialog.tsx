'use client';

import { useState, useEffect } from 'react';
import type { ElectionWithDetails, VotingPointWithDetails } from '@/lib/types/database.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Users, ChevronRight } from 'lucide-react';
import { VotingPointFormDialog } from '@/components/admin/voting-point-form-dialog';
import { VotingPointDetailsDialog } from '@/components/admin/voting-point-details-dialog';

interface ElectionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  electionId: string | null;
  onUpdate: () => void;
}

export function ElectionDetailsDialog({
  open,
  onOpenChange,
  electionId,
  onUpdate,
}: ElectionDetailsDialogProps) {
  const [election, setElection] = useState<ElectionWithDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [vpFormOpen, setVpFormOpen] = useState(false);
  const [vpDetailsOpen, setVpDetailsOpen] = useState(false);
  const [selectedVotingPoint, setSelectedVotingPoint] = useState<VotingPointWithDetails | null>(null);

  useEffect(() => {
    if (open && electionId) {
      loadElectionDetails();
    }
  }, [open, electionId]);

  const loadElectionDetails = async () => {
    if (!electionId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/elections/${electionId}`);
      const result = await response.json();

      if (result.success) {
        setElection(result.data);
      } else {
        console.error('Error loading election:', result.error);
      }
    } catch (error) {
      console.error('Error loading election:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVotingPoint = () => {
    setVpFormOpen(true);
  };

  const handleViewVotingPoint = (vp: VotingPointWithDetails) => {
    setSelectedVotingPoint(vp);
    setVpDetailsOpen(true);
  };

  const handleVpFormSuccess = () => {
    setVpFormOpen(false);
    loadElectionDetails();
  };

  const assignedDelegateIds = election?.voting_points?.map((vp) => vp.delegate_id).filter(Boolean) as string[] | undefined;

  const handleVpUpdate = () => {
    loadElectionDetails();
    // Actualizar el selectedVotingPoint con los datos más recientes
    if (selectedVotingPoint && election) {
      const updatedVp = election.voting_points?.find(vp => vp.id === selectedVotingPoint.id);
      if (updatedVp) {
        setSelectedVotingPoint(updatedVp);
      }
    }
  };

  const handleVpDetailsClose = () => {
    setVpDetailsOpen(false);
    setSelectedVotingPoint(null);
    loadElectionDetails();
  };

  if (!election && !loading) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{election?.title}</DialogTitle>
            <DialogDescription>{election?.description}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Cargando detalles...</p>
            </div>
          ) : election ? (
            <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="voting-points">
                  Puntos de Votación ({election.voting_points?.length || 0})
                </TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto mt-4">
                <TabsContent value="overview" className="space-y-4 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Información General</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Fecha y hora de inicio</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(election.start_date).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Fecha y hora de fin</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(election.end_date).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Estado</p>
                        <Badge variant={election.is_active ? 'default' : 'secondary'}>
                          {election.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Estadísticas</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-2xl font-bold">{election.voting_points?.length || 0}</p>
                        <p className="text-xs text-muted-foreground">Puntos de votación</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold">
                          {election.voting_points?.reduce((acc, vp) => acc + (vp.candidates?.length || 0), 0) || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Candidatos totales</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-bold">
                          {election.voting_points?.reduce((acc, vp) => acc + (vp.total_voters || 0), 0) || 0}
                        </p>
                        <p className="text-xs text-muted-foreground">Votantes registrados</p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="voting-points" className="space-y-4 mt-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Gestiona los puntos de votación para esta elección
                    </p>
                    <Button size="sm" onClick={handleAddVotingPoint}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar punto
                    </Button>
                  </div>

                  {!election.voting_points || election.voting_points.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                          No hay puntos de votación creados
                        </p>
                        <Button onClick={handleAddVotingPoint}>
                          <Plus className="mr-2 h-4 w-4" />
                          Crear primer punto de votación
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-4">
                      {election.voting_points.map((vp) => (
                        <Card
                          key={vp.id}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleViewVotingPoint(vp)}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-lg">{vp.name}</CardTitle>
                                {vp.location && (
                                  <CardDescription className="mt-1">
                                    <MapPin className="inline h-3 w-3 mr-1" />
                                    {vp.location}
                                  </CardDescription>
                                )}
                              </div>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Users className="mr-1 h-4 w-4" />
                                {vp.candidates?.length || 0} candidatos
                              </div>
                              {vp.delegate && (
                                <div className="flex items-center">
                                  <span className="font-medium">Delegado:</span>
                                  <span className="ml-1">{vp.delegate.full_name}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {electionId && (
        <>
          <VotingPointFormDialog
            open={vpFormOpen}
            onOpenChange={setVpFormOpen}
            electionId={electionId}
            assignedDelegateIds={assignedDelegateIds}
            onSuccess={handleVpFormSuccess}
          />

          <VotingPointDetailsDialog
            open={vpDetailsOpen}
            onOpenChange={(open: boolean) => {
              if (!open) handleVpDetailsClose();
            }}
            votingPoint={selectedVotingPoint}
            onUpdate={handleVpUpdate}
          />
        </>
      )}
    </>
  );
}
