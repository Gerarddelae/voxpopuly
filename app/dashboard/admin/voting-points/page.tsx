'use client';

import { useState, useEffect } from 'react';
import type { VotingPoint, Election, ElectionWithDetails } from '@/lib/types/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MapPin, User, Users, Calendar, ChevronDown, ChevronRight, UserCheck } from 'lucide-react';
import { VotingPointEditDialog } from '@/components/admin/voting-point-edit-dialog';

export default function VotingPointsPage() {
  const [elections, setElections] = useState<ElectionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [openElection, setOpenElection] = useState<string | null>(null);
  const [selectedVotingPoint, setSelectedVotingPoint] = useState<VotingPoint | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    loadElectionsWithPoints();
  }, []);

  const loadElectionsWithPoints = async () => {
    try {
      setLoading(true);
      // Cargar elecciones
      const response = await fetch('/api/elections');
      const result = await response.json();
      
      if (result.success) {
        // Cargar detalles de cada elección con sus puntos de votación
        const electionsWithDetails = await Promise.all(
          result.data.map(async (election: Election) => {
            const detailsResponse = await fetch(`/api/elections/${election.id}`);
            const detailsResult = await detailsResponse.json();
            
            if (detailsResult.success) {
              return detailsResult.data;
            }
            return election;
          })
        );
        
        setElections(electionsWithDetails);
        
        // Abrir automáticamente la primera elección que tenga puntos de votación
        const firstWithPoints = electionsWithDetails.find(
          (e: ElectionWithDetails) => e.voting_points && e.voting_points.length > 0
        );
        if (firstWithPoints) {
          setOpenElection(firstWithPoints.id);
        }
      }
    } catch (error) {
      console.error('Error loading elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVotingPointClick = (votingPoint: VotingPoint) => {
    setSelectedVotingPoint(votingPoint);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedVotingPoint(null);
    loadElectionsWithPoints(); // Recargar datos
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const start = new Date(election.start_date);
    const end = new Date(election.end_date);

    if (now < start) return { label: 'Próxima', variant: 'secondary' as const };
    if (now > end) return { label: 'Finalizada', variant: 'outline' as const };
    if (election.is_active) return { label: 'Activa', variant: 'default' as const };
    return { label: 'Inactiva', variant: 'destructive' as const };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando puntos de votación...</p>
      </div>
    );
  }

  const totalVotingPoints = elections.reduce(
    (sum, e) => sum + (e.voting_points?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Puntos de Votación</h2>
          <p className="text-muted-foreground">
            Vista general organizada por elección - {totalVotingPoints} puntos totales
          </p>
        </div>
      </div>

      {/* Elections with Voting Points */}
      {elections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No hay elecciones creadas todavía
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {elections.map((election) => {
            const status = getElectionStatus(election);
            const votingPoints = election.voting_points || [];
            const isOpen = openElection === election.id;

            return (
              <Card key={election.id}>
                <Collapsible
                  open={isOpen}
                  onOpenChange={(open) => setOpenElection(open ? election.id : null)}
                >
                  <CardHeader className="pb-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70 transition-opacity">
                      <div className="flex items-center gap-3">
                        {isOpen ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div className="text-left">
                          <CardTitle className="text-xl">{election.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">
                              {new Date(election.start_date).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} - {new Date(election.end_date).toLocaleString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <Badge variant="secondary">
                          {votingPoints.length} {votingPoints.length === 1 ? 'punto' : 'puntos'}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent>
                      {votingPoints.length === 0 ? (
                        <div className="text-center py-8">
                          <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No hay puntos de votación en esta elección
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                          {votingPoints.map((vp) => (
                            <Card
                              key={vp.id}
                              className="hover:shadow-md transition-all cursor-pointer hover:border-primary"
                              onClick={() => handleVotingPointClick(vp)}
                            >
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold">
                                  {vp.name}
                                </CardTitle>
                                {vp.location && (
                                  <CardDescription className="flex items-center gap-1 text-xs">
                                    <MapPin className="h-3 w-3" />
                                    {vp.location}
                                  </CardDescription>
                                )}
                              </CardHeader>
                              <CardContent className="space-y-2 text-sm">
                                {vp.delegate ? (
                                  <div className="flex items-center text-muted-foreground">
                                    <User className="mr-2 h-3.5 w-3.5" />
                                    <span className="text-xs truncate">
                                      {vp.delegate.full_name}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-muted-foreground">
                                    <User className="mr-2 h-3.5 w-3.5" />
                                    <span className="text-xs">Sin delegado</span>
                                  </div>
                                )}

                                <div className="flex items-center text-muted-foreground">
                                  <Users className="mr-2 h-3.5 w-3.5" />
                                  <span className="text-xs">
                                    {vp.candidates?.length || 0}{' '}
                                    {vp.candidates?.length === 1 ? 'candidato' : 'candidatos'}
                                  </span>
                                </div>

                                <div className="flex items-center text-muted-foreground">
                                  <UserCheck className="mr-2 h-3.5 w-3.5" />
                                  <span className="text-xs">
                                    {vp.total_voters || 0}{' '}
                                    {vp.total_voters === 1 ? 'votante' : 'votantes'}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      {selectedVotingPoint && (
        <VotingPointEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          votingPoint={selectedVotingPoint}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
