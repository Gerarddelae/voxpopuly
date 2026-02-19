'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle2, Loader2, MapPin, Vote } from 'lucide-react';

interface VotingInfo {
  isAssigned: boolean;
  hasVoted: boolean;
  votedAt?: string;
  votingPoint?: any;
  election?: any;
  message: string;
}

export default function VoterMyVotesPage() {
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<VotingInfo | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/voter/voting-info');
        const json = await res.json();
        if (json.success) setInfo(json.data);
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

  if (!info || !info.isAssigned) {
    return (
      <Alert>
        <AlertDescription>{info?.message || 'No estás asignado a un punto de votación.'}</AlertDescription>
      </Alert>
    );
  }

  const period = `${info.election?.start_date ? new Date(info.election.start_date).toLocaleDateString('es-ES') : 'N/A'} - ${info.election?.end_date ? new Date(info.election.end_date).toLocaleDateString('es-ES') : 'N/A'}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Mi voto</h2>
        <Badge variant={info.hasVoted ? 'default' : 'secondary'} className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> {info.hasVoted ? 'Voto emitido' : 'Pendiente'}
        </Badge>
      </div>
      <p className="text-muted-foreground">Estado de tu participación en la elección asignada.</p>

      <Card className={info.hasVoted ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="h-4 w-4" /> {info.election?.title || 'Sin título'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{info.votingPoint?.name} {info.votingPoint?.location ? `· ${info.votingPoint.location}` : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{period}</span>
          </div>

          {info.hasVoted ? (
            <Alert className="bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-900">
              <AlertDescription>
                <strong>Voto registrado:</strong> {info.votedAt ? new Date(info.votedAt.endsWith('Z') ? info.votedAt : info.votedAt + 'Z').toLocaleString('es-ES', {
                  timeZone: 'America/Bogota',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                }) : 'N/A'}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <AlertDescription>{info.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
