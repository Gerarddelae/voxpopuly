'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2, MapPin, Vote } from 'lucide-react';

interface VotingInfo {
  election?: any;
  votingPoint?: any;
  canVote: boolean;
  slates?: any[];
  isAssigned: boolean;
  message: string;
}

export default function VoterElectionsPage() {
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
        <h2 className="text-2xl font-bold tracking-tight">Elecciones activas</h2>
        <Badge variant={info.election?.is_active ? 'default' : 'secondary'}>
          {info.election?.is_active ? 'Activa' : 'Inactiva'}
        </Badge>
        <Badge variant={info.canVote ? 'default' : 'outline'}>
          {info.canVote ? 'Puedes votar' : 'No disponible'}
        </Badge>
      </div>
      <p className="text-muted-foreground">Consulta la elección asignada a tu punto.</p>

      <Card>
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
          <div className="flex items-center gap-2">
            <Badge variant="outline">Planchas: {info.slates?.length || 0}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
