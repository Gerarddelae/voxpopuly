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
  members?: {
    id: string;
    full_name: string;
    role?: string | null;
  }[];
}

interface StatsPayload {
  slates: Slate[];
}

export default function DelegateSlatesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  function getInitials(name?: string) {
    if (!name) return "--";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "--";
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

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
          <Card key={slate.id} className="min-h-[72px]">
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-lg truncate">{slate.name}</span>
                    </div>
                  </div>

                  {slate.members && slate.members.length > 0 && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {slate.members.slice(0, 3).map((m) => (
                        <div key={m.id} className="flex items-center gap-2 bg-muted/10 px-2 py-1 rounded-md">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                            {getInitials(m.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm truncate font-medium">{m.full_name}</div>
                            {m.role && <div className="text-xs text-muted-foreground">{m.role}</div>}
                          </div>
                        </div>
                      ))}
                      {slate.members.length > 3 && (
                        <div className="text-sm text-muted-foreground">+{slate.members.length - 3} más</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {slate.vote_count !== undefined && (
                    <Badge variant="default">{slate.vote_count ?? 0} votos</Badge>
                  )}
                </div>
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
