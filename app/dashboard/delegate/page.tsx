'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, MapPin, BarChart3 } from 'lucide-react';

interface StatsPayload {
  votingPoint?: {
    name: string;
    location?: string | null;
    election?: {
      title: string;
      is_active: boolean;
      start_date?: string;
      end_date?: string;
    };
  };
  slates: { id: string; name: string; vote_count?: number | null }[];
  totalVotes: number;
}

export default function DelegatePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/delegate/stats');
        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'No se pudieron cargar los datos');
        } else {
          setStats(json.data);
        }
      } catch (e) {
        setError('No se pudieron cargar los datos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if (!stats?.votingPoint) return <Alert><AlertDescription>No tienes un punto asignado.</AlertDescription></Alert>;

  const election = stats.votingPoint.election;
  const period = `${election?.start_date ? new Date(election.start_date).toLocaleDateString('es-ES') : 'N/A'} - ${election?.end_date ? new Date(election.end_date).toLocaleDateString('es-ES') : 'N/A'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold">Panel del delegado</h2>
        <Badge variant={election?.is_active ? 'default' : 'secondary'}>
          {election?.is_active ? 'Elección activa' : 'Elección cerrada'}
        </Badge>
        <Badge variant="outline">Votos totales: {stats.totalVotes}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">Resumen de tu punto y avance de votación.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Punto de votación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">{stats.votingPoint.name}</p>
            {stats.votingPoint.location && <p className="text-muted-foreground">{stats.votingPoint.location}</p>}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{period}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Avance de votación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(stats.slates || []).map((s) => (
              <div key={s.id} className="flex items-center justify-between border-b last:border-b-0 py-1">
                <span>{s.name}</span>
                <Badge variant="default">{s.vote_count ?? 0} votos</Badge>
              </div>
            ))}
            {stats.slates.length === 0 && (
              <p className="text-muted-foreground">Sin planchas registradas.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
