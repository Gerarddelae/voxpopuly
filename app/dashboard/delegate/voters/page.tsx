'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, CheckCircle2, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface VoterRow {
  id: string;
  has_voted: boolean;
  voted_at?: string | null;
  profile?: {
    id: string;
    full_name?: string | null;
    document?: string | null;
  };
}

interface VotersPayload {
  voters: VoterRow[];
  votingPoint: { id: string; name: string };
}

export default function DelegateVotersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VotersPayload | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/delegate/voters');
        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'No se pudieron cargar los votantes');
        } else {
          setData(json.data);
          
          // Configurar suscripción en tiempo real para votantes del punto
          if (json.data?.votingPoint?.id) {
            // Limpiar canal anterior si existe
            if (channelRef.current) {
              supabase.removeChannel(channelRef.current);
            }

            // Crear nuevo canal de suscripción
            const channel = supabase.channel(`voters-vp-${json.data.votingPoint.id}`);
            channel.on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'voters',
              filter: `voting_point_id=eq.${json.data.votingPoint.id}`,
            }, (payload) => {
              setData((prev) => {
                if (!prev) return prev;
                
                const updatedVoter = payload.new as any;
                const updatedVoters = prev.voters.map((voter) => {
                  if (voter.id === updatedVoter.id) {
                    return {
                      ...voter,
                      has_voted: updatedVoter.has_voted ?? voter.has_voted,
                      voted_at: updatedVoter.voted_at ?? voter.voted_at,
                    };
                  }
                  return voter;
                });

                return { ...prev, voters: updatedVoters };
              });
            });

            channel.subscribe((status) => {
              if (status === 'SUBSCRIBED') {
                console.log('✅ Suscripción en tiempo real activa para votantes');
              }
            });

            channelRef.current = channel;
          }
        }
      } catch (e) {
        setError('No se pudieron cargar los votantes');
      } finally {
        setLoading(false);
      }
    };
    load();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No hay datos disponibles.</AlertDescription>
      </Alert>
    );
  }

  const voters = data.voters || [];
  const votedCount = voters.filter((v) => v.has_voted).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Votantes</h2>
        <Badge variant="outline">{data.votingPoint.name}</Badge>
        <Badge variant="secondary">{votedCount}/{voters.length} han votado</Badge>
      </div>
      <p className="text-muted-foreground">Lista de votantes asignados a tu punto (solo lectura).</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Lista de votantes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {voters.length === 0 && (
            <Alert>
              <AlertDescription>No hay votantes asignados.</AlertDescription>
            </Alert>
          )}

          {voters.map((voter) => (
            <div
              key={voter.id}
              className="flex items-center justify-between border-b last:border-b-0 py-2"
            >
              <div className="flex flex-col">
                <span className="font-medium">{voter.profile?.full_name || 'Sin nombre'}</span>
                {voter.profile?.document && (
                  <span className="text-xs text-muted-foreground">Doc: {voter.profile.document}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={voter.has_voted ? 'default' : 'secondary'} className="flex items-center gap-1">
                  {voter.has_voted ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" /> Votó
                    </>
                  ) : (
                    <>
                      <Clock className="h-3 w-3" /> Pendiente
                    </>
                  )}
                </Badge>
                {voter.voted_at && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(voter.voted_at).toLocaleString('es-ES')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
