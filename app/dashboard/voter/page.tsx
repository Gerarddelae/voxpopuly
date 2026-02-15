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
  UserCheck
} from 'lucide-react';

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
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Punto de votación</p>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{votingInfo.votingPoint?.name || 'No asignado'}</span>
            </div>
            {votingInfo.votingPoint?.location && (
              <p className="text-sm text-muted-foreground">{votingInfo.votingPoint.location}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">Periodo</p>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{period}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span><strong>Planchas:</strong> {slates.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={votingInfo.election?.is_active ? 'default' : 'secondary'}>
                {electionStatus}
              </Badge>
              <Badge variant={votingInfo.canVote ? 'default' : 'outline'}>
                {votingInfo.canVote ? 'Puedes votar' : 'No disponible'}
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
        <AlertDescription>
          <strong>Cómo votar:</strong> selecciona una plancha y confirma. El voto es anónimo. Si la elección está cerrada, podrás revisar la información pero no votar.
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
          <div className="grid gap-4 md:grid-cols-2">
            {slates.map((slate) => (
              <Card
                key={slate.id}
                className={`transition-all ${
                  canActuallyVote
                    ? `cursor-pointer ${
                        selectedSlate === slate.id
                          ? 'border-primary ring-2 ring-primary'
                          : 'hover:border-primary/50'
                      }`
                    : 'opacity-75 cursor-not-allowed'
                }`}
                onClick={() => canActuallyVote && setSelectedSlate(slate.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{slate.name}</CardTitle>
                      {slate.description && (
                        <CardDescription className="mt-2">
                          {slate.description}
                        </CardDescription>
                      )}
                    </div>
                    {selectedSlate === slate.id && canActuallyVote && (
                      <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {slate.members && slate.members.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Candidatos:
                      </p>
                      <div className="grid gap-2">
                        {slate.members.map((member: any) => (
                          <div
                            key={member.id}
                            className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/50"
                          >
                            <span className="font-medium">{member.full_name}</span>
                            {member.role && (
                              <Badge variant="secondary" className="text-xs">
                                {member.role}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Botón de confirmación */}
          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              onClick={handleVote}
              disabled={!canActuallyVote || !selectedSlate || submitting}
              className="min-w-[200px]"
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
        </>
      )}
    </div>
  );
}

