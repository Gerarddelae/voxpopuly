'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calendar, Loader2, MapPin } from 'lucide-react';

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
}

export default function DelegateVotingPointPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/delegate/stats');
        const json = await res.json();
        if (!json.success) {
          setError(json.error || 'No se pudo cargar el punto');
        } else {
          setData(json.data);
        }
      } catch (e) {
        setError('No se pudo cargar el punto');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;
  if (!data?.votingPoint) return <Alert><AlertDescription>No tienes un punto asignado.</AlertDescription></Alert>;

  const election = data.votingPoint.election;
  const period = `${election?.start_date ? new Date(election.start_date).toLocaleDateString('es-ES') : 'N/A'} - ${election?.end_date ? new Date(election.end_date).toLocaleDateString('es-ES') : 'N/A'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Mi punto de votación</h2>
        <Badge variant={election?.is_active ? 'default' : 'secondary'}>
          {election?.is_active ? 'Elección activa' : 'Elección cerrada'}
        </Badge>
      </div>
      <p className="text-muted-foreground">Información del punto asignado.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> {data.votingPoint.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.votingPoint.location && <p className="text-muted-foreground">{data.votingPoint.location}</p>}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{period}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
