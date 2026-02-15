'use client';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Vote } from 'lucide-react';

interface Slate {
  id: string;
  name: string;
  description?: string | null;
  vote_count?: number | null;
}

interface StatsPayload {
  slates: Slate[];
}

export default function DelegateSlatesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/delegate/stats');
        const json = await res.json();
        if (!json.success) setError(json.error || 'No se pudieron cargar las planchas');
        else setData({ slates: json.data.slates || [] });
      } catch (e) {
        setError('No se pudieron cargar las planchas');
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
        <h2 className="text-2xl font-bold tracking-tight">Planchas</h2>
        <Badge variant="outline">Solo lectura</Badge>
      </div>
      <p className="text-muted-foreground">Planchas asociadas a tu punto.</p>

      <div className="grid gap-3 md:grid-cols-2">
        {(data?.slates || []).map((slate) => (
          <Card key={slate.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{slate.name}</span>
                {slate.vote_count !== undefined && (
                  <Badge variant="default">{slate.vote_count ?? 0} votos</Badge>
                )}
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

      {(data?.slates || []).length === 0 && (
        <Alert>
          <AlertDescription>No hay planchas registradas para tu punto.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
