'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, History as HistoryIcon, Loader2, MapPin, Vote } from 'lucide-react';

interface VoteItem {
  id: string;
  created_at: string;
  slate?: {
    name: string;
    voting_point?: {
      name: string;
      location?: string;
      election?: {
        title: string;
        start_date?: string;
        end_date?: string;
        is_active?: boolean;
      };
    };
  };
}

export default function VoterHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<VoteItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/voter/history');
        const json = await res.json();
        if (json.success) {
          setHistory(json.data || []);
        } else {
          setError(json.error || 'No se pudo cargar el historial');
        }
      } catch (e) {
        setError('No se pudo cargar el historial');
      } finally {
        setLoading(false);
      }
    };
    load();
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

  if (history.length === 0) {
    return (
      <Alert>
        <AlertDescription>No tienes votos registrados aún.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Historial</h2>
        <Badge variant="outline" className="flex items-center gap-1">
          <HistoryIcon className="h-3 w-3" /> {history.length} voto{history.length === 1 ? '' : 's'}
        </Badge>
      </div>
      <p className="text-muted-foreground">Consulta tu historial de participación.</p>

      <div className="grid gap-3">
        {history.map((item) => {
          const election = item.slate?.voting_point?.election;
          const period = `${election?.start_date ? new Date(election.start_date).toLocaleDateString('es-ES') : 'N/A'} - ${election?.end_date ? new Date(election.end_date).toLocaleDateString('es-ES') : 'N/A'}`;
          return (
            <Card key={item.id}>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Vote className="h-4 w-4" />
                  <CardTitle className="text-base">{item.slate?.name || 'Plancha'}</CardTitle>
                </div>
                <Badge variant="secondary">{new Date(item.created_at).toLocaleString('es-ES')}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{item.slate?.voting_point?.name} {item.slate?.voting_point?.location ? `· ${item.slate.voting_point.location}` : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{election?.title || 'Elección'} · {period}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
