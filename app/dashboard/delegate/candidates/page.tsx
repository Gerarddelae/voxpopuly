'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Candidate {
  id: string;
  full_name: string;
  role?: string | null;
  photo_url?: string | null;
  vote_count?: number | null;
}

interface StatsPayload {
  candidates: Candidate[];
}

export default function DelegateCandidatesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getInitials(name?: string) {
    if (!name) return "--";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "--";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/delegate/stats');
        const json = await res.json();
        if (!json.success) setError(json.error || 'No se pudieron cargar los candidatos');
        else setData({ candidates: json.data.candidates || [] });
      } catch (e) {
        setError('No se pudieron cargar los candidatos');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) return <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-2xl font-bold tracking-tight">Candidatos</h2>
        <Badge variant="outline">Solo lectura</Badge>
      </div>
      <p className="text-muted-foreground">Candidatos registrados en tu punto de votación.</p>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(data?.candidates || []).map((candidate) => (
          <Card key={candidate.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                {candidate.photo_url ? (
                  <img
                    src={candidate.photo_url}
                    alt={candidate.full_name}
                    className="h-14 w-14 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold shrink-0">
                    {getInitials(candidate.full_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base truncate">{candidate.full_name}</p>
                  {candidate.role && (
                    <p className="text-sm text-muted-foreground">{candidate.role}</p>
                  )}
                </div>
                <Badge variant="default" className="shrink-0">
                  {candidate.vote_count ?? 0} votos
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(data?.candidates || []).length === 0 && (
        <Alert>
          <AlertDescription>No hay candidatos registrados para tu punto.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
