'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, MapPin, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SlateStat {
  id: string;
  name: string;
  description?: string | null;
  vote_count: number;
}

interface StatsPayload {
  votingPoint: {
    id: string;
    name: string;
    location?: string | null;
    election?: {
      id: string;
      title: string;
      is_active: boolean;
      start_date?: string;
      end_date?: string;
    };
  };
  slates: SlateStat[];
  totalVotes: number;
}

export default function DelegateResultsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    loadStats();
    // Suscripción en tiempo real a cambios en slates.vote_count del punto del delegado
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function subscribe(votingPointId: string) {
      channel = supabase
        .channel(`slates-vp-${votingPointId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'slates',
          filter: `voting_point_id=eq.${votingPointId}`,
        }, (payload) => {
          setStats((prev) => {
            if (!prev) return prev;
            const updated = [...prev.slates];
            if (payload.eventType === 'DELETE') {
              return prev; // no-op for now
            }
            const row = payload.new as SlateStat;
            const idx = updated.findIndex((s) => s.id === row.id);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], vote_count: row.vote_count ?? 0, name: row.name, description: row.description };
            } else {
              updated.push({ id: row.id, name: row.name, description: row.description, vote_count: row.vote_count ?? 0 });
            }
            const totalVotes = updated.reduce((a, s) => a + (s.vote_count || 0), 0);
            return { ...prev, slates: updated, totalVotes };
          });
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            // console.log('Realtime subscribed for slates');
          }
        });
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/delegate/stats');
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'No se pudieron cargar las estadísticas');
        setStats(null);
        return;
      }
      setStats(json.data);
      // iniciar suscripción con el punto asignado
      if (json.data?.votingPoint?.id) {
        const channel = supabase.channel(`slates-vp-${json.data.votingPoint.id}`);
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'slates',
          filter: `voting_point_id=eq.${json.data.votingPoint.id}`,
        }, (payload) => {
          setStats((prev) => {
            if (!prev) return prev;
            const updated = [...prev.slates];
            const row = payload.new as SlateStat;
            const idx = updated.findIndex((s) => s.id === row.id);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], vote_count: row.vote_count ?? 0, name: row.name, description: row.description };
            }
            const totalVotes = updated.reduce((a, s) => a + (s.vote_count || 0), 0);
            return { ...prev, slates: updated, totalVotes };
          });
        });
        channel.subscribe();
      }
    } catch (e) {
      setError('No se pudieron cargar las estadísticas');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

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

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>No hay datos disponibles.</AlertDescription>
      </Alert>
    );
  }

  const { votingPoint, slates, totalVotes } = stats;
  const election = votingPoint.election;
  const period = `${election?.start_date ? new Date(election.start_date).toLocaleDateString('es-ES') : 'N/A'} - ${election?.end_date ? new Date(election.end_date).toLocaleDateString('es-ES') : 'N/A'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Resultados en tiempo real</h2>
        <Badge variant={election?.is_active ? 'default' : 'secondary'}>
          {election?.is_active ? 'Votación activa' : 'Votación cerrada'}
        </Badge>
        <Badge variant="outline">Votos totales: {totalVotes}</Badge>
      </div>
      <p className="text-muted-foreground">Estadísticas del punto: {votingPoint.name} {votingPoint.location ? `· ${votingPoint.location}` : ''}</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Resumen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{votingPoint.name} {votingPoint.location ? `· ${votingPoint.location}` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{period}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {slates.map((slate) => (
          <Card key={slate.id} className="border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{slate.name}</span>
                <Badge variant="default">{slate.vote_count ?? 0} votos</Badge>
              </CardTitle>
            </CardHeader>
            {slate.description && (
              <CardContent>
                <p className="text-sm text-muted-foreground">{slate.description}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
