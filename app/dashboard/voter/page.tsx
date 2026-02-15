'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  Vote, 
  Calendar, 
  MapPin, 
  Users, 
  Loader2,
  AlertCircle,
  UserCheck,
  UserCircle,
  
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

interface VotingInfo {
  isAssigned: boolean;
  votingPoint?: any;
  election?: any;
  canVote: boolean;
  hasVoted: boolean;
  votedAt?: string;
  slates?: any[];
  voterRecordId?: string;
  message: string;
}

export default function VoterPage() {
  const [loading, setLoading] = useState(true);
  const [votingInfo, setVotingInfo] = useState<VotingInfo | null>(null);
  const [selectedSlate, setSelectedSlate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [dialogSlate, setDialogSlate] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openSlateDialog = (slate: any) => {
    setDialogSlate(slate);
    setDialogOpen(true);
  };
  const closeSlateDialog = () => {
    setDialogSlate(null);
    setDialogOpen(false);
  };

  useEffect(() => {
    loadVotingInfo();
  }, []);

  const loadVotingInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/voter/voting-info');
      const result = await response.json();
      
      if (result.success) {
        setVotingInfo(result.data);
      } else {
        console.error('Error loading voting info:', result.error);
      }
    } catch (error) {
      console.error('Error loading voting info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!selectedSlate) return;

    if (!confirm('¿Estás seguro de que deseas emitir tu voto? Esta acción no se puede deshacer.')) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/voter/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slate_id: selectedSlate }),
      });

      const result = await response.json();

      if (result.success) {
        setVoteSuccess(true);
        setSelectedSlate(null);
        // Recargar información
        setTimeout(() => {
          loadVotingInfo();
        }, 2000);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error voting:', error);
      alert('Error al registrar el voto');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!votingInfo) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar la información de votación. Por favor, intenta nuevamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Si ya votó, mostrar confirmación
  if (votingInfo.hasVoted || voteSuccess) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Mi Voto</h2>
          <p className="text-muted-foreground">Estado de participación en la elección</p>
        </div>

        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  ¡Voto Registrado Exitosamente!
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Tu participación ha sido confirmada
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Calendar className="h-4 w-4" />
                <span>
                  Votado el: {new Date(votingInfo.votedAt || new Date()).toLocaleString('es-ES')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <MapPin className="h-4 w-4" />
                <span>Punto de votación: {votingInfo.votingPoint?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <Vote className="h-4 w-4" />
                <span>Elección: {votingInfo.election?.title}</span>
              </div>
            </div>
            <Alert>
              <AlertDescription>
                Tu voto es completamente anónimo y ha sido registrado de forma segura.
                Gracias por participar en el proceso democrático.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si no está asignado a un punto
  if (!votingInfo.isAssigned) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Panel de Votación</h2>
          <p className="text-muted-foreground">Emite tu voto en las elecciones activas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              No asignado a punto de votación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{votingInfo.message}</AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>¿Qué significa esto?</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Aún no has sido asignado a ningún punto de votación</li>
                <li>Contacta al administrador para que te asigne a un punto</li>
                <li>Una vez asignado, podrás ver las planchas disponibles aquí</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si puede votar: mostrar planchas
  const slates = votingInfo.slates || [];
  const canActuallyVote = votingInfo.canVote && slates.length > 0;
  const electionStatus = votingInfo.election?.is_active ? 'Activa' : 'Inactiva';
  const period = `${votingInfo.election?.start_date ? new Date(votingInfo.election.start_date).toLocaleDateString('es-ES') : 'N/A'} - ${votingInfo.election?.end_date ? new Date(votingInfo.election.end_date).toLocaleDateString('es-ES') : 'N/A'}`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-3xl font-bold tracking-tight">Panel de Votación</h2>
          <Badge variant={votingInfo.canVote ? 'default' : 'secondary'} className="flex items-center gap-1">
            <Vote className="h-3 w-3" /> {votingInfo.canVote ? 'Votación abierta' : 'Votación cerrada'}
          </Badge>
          <Badge variant={votingInfo.hasVoted ? 'outline' : 'default'} className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> {votingInfo.hasVoted ? 'Voto emitido' : 'Pendiente de votar'}
          </Badge>
        </div>
        <p className="text-muted-foreground">{votingInfo.election?.title || 'Sin título de elección'}</p>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Punto de votación</p>
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold block">{votingInfo.votingPoint?.name || 'No asignado'}</span>
                {votingInfo.votingPoint?.location && (
                  <p className="text-xs text-muted-foreground mt-0.5">{votingInfo.votingPoint.location}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Periodo</p>
            <div className="flex items-start gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="font-semibold">{period}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Estado</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={votingInfo.election?.is_active ? 'default' : 'secondary'} className="text-xs">
                {electionStatus}
              </Badge>
              <Badge variant={votingInfo.canVote ? 'default' : 'outline'} className="text-xs">
                {votingInfo.canVote ? 'Puedes votar' : 'No disponible'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {slates.length} {slates.length === 1 ? 'plancha' : 'planchas'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estado y mensajes */}
      {!votingInfo.canVote && votingInfo.election && (
        <Alert variant="default" className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>{votingInfo.message}</strong>
            {!votingInfo.election.is_active && (
              <p className="mt-1 text-sm">
                La votación estará disponible cuando el administrador active la elección.
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Instrucciones */}
      <Alert>
        <Vote className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>Cómo votar:</strong> Selecciona una plancha haciendo clic en ella y luego confirma tu voto. 
          El voto es completamente anónimo y no podrá ser modificado una vez confirmado.
        </AlertDescription>
      </Alert>

      {/* Planchas disponibles */}
      {slates.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay planchas disponibles en tu punto de votación en este momento.
            {!votingInfo.canVote && ' Las planchas se mostrarán cuando se activen.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {slates.length} {slates.length === 1 ? 'plancha disponible' : 'planchas disponibles'}
              </p>
              {/* Removed bulk expand control to simplify UI and avoid confusion */}
            </div>
          </div>

          {/* Dialog: detalle de plancha */}
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeSlateDialog(); setDialogOpen(open); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{dialogSlate?.name || 'Detalle de la plancha'}</DialogTitle>
                <DialogDescription className="mb-2">{dialogSlate?.description}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] overflow-y-auto space-y-2">
                {(dialogSlate?.members || []).map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.full_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                        <UserCircle className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{member.full_name}</div>
                      {member.role && <div className="text-xs text-muted-foreground">{member.role}</div>}
                    </div>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={() => { if (dialogSlate) { setSelectedSlate(dialogSlate.id); } closeSlateDialog(); }}>
                  Seleccionar plancha
                </Button>
                <DialogClose asChild>
                  <Button variant="ghost">Cerrar</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {slates.map((slate) => {
              const hasMembers = slate.members && slate.members.length > 0;
              
              return (
                <Card
                  key={slate.id}
                  className={`transition-all flex flex-col ${
                    canActuallyVote
                      ? `${
                          selectedSlate === slate.id
                            ? 'border-primary ring-2 ring-primary shadow-lg'
                            : 'hover:border-primary/50 hover:shadow-md'
                        }`
                      : 'opacity-75'
                  }`}
                >
                  <CardHeader 
                    className={`${canActuallyVote ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={() => canActuallyVote && setSelectedSlate(slate.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {slate.name}
                          {selectedSlate === slate.id && canActuallyVote && (
                            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                          )}
                        </CardTitle>
                        {slate.description && (
                          <CardDescription className="mt-1.5 text-sm line-clamp-2">
                            {slate.description}
                          </CardDescription>
                        )}
                        {hasMembers && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {slate.members.length} {slate.members.length === 1 ? 'candidato' : 'candidatos'}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {hasMembers && (
                    <CardContent className="pt-2 flex-1">
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2 items-center">
                          {slate.members.slice(0, 3).map((member: any) => (
                            <div
                              key={member.id}
                              className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                            >
                              {member.photo_url ? (
                                <img
                                  src={member.photo_url}
                                  alt={member.full_name}
                                  className="w-9 h-9 rounded-full object-cover border-2 border-background shadow-sm flex-shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-muted-foreground/10 flex items-center justify-center flex-shrink-0 border-2 border-background">
                                  <UserCircle className="h-5 w-5 text-muted-foreground/50" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium block truncate text-sm">{member.full_name}</span>
                                {member.role && (
                                  <Badge variant="secondary" className="text-xs mt-0.5">
                                    {member.role}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}

                          {slate.members.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                openSlateDialog(slate);
                              }}
                            >
                              Ver {slate.members.length - 3} más
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Botón de confirmación */}
          <div className="sticky bottom-0 py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              {selectedSlate && canActuallyVote && (
                <div className="text-sm text-muted-foreground text-center sm:text-left">
                  Plancha seleccionada: <span className="font-semibold text-foreground">
                    {slates.find(s => s.id === selectedSlate)?.name}
                  </span>
                </div>
              )}
              <Button
                size="lg"
                onClick={handleVote}
                disabled={!canActuallyVote || !selectedSlate || submitting}
                className="min-w-[200px] shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Registrando voto...
                  </>
                ) : !votingInfo.canVote ? (
                  <>
                    <Vote className="mr-2 h-5 w-5" />
                    Votación no disponible
                  </>
                ) : !selectedSlate ? (
                  <>
                    <UserCheck className="mr-2 h-5 w-5" />
                    Selecciona una plancha
                  </>
                ) : (
                  <>
                    <UserCheck className="mr-2 h-5 w-5" />
                    Confirmar Voto
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

