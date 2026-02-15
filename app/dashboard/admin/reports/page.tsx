'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  Vote,
  Users,
  FileText,
  Download,
  RefreshCcw,
  MapPin,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  Cell,
} from 'recharts';

type StatSlate = {
  id: string;
  name: string;
  description?: string | null;
  vote_count: number;
};

type StatVotingPoint = {
  id: string;
  name: string;
  location?: string | null;
  election: {
    id: string;
    title: string;
    is_active: boolean;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
  delegate: {
    id: string;
    full_name: string;
    document: string;
  } | null;
  slates: StatSlate[];
  totalVoters: number;
  votedCount: number;
  totalVotes: number;
};

type StatsPayload = {
  totals: {
    elections: number;
    votingPoints: number;
    voters: number;
    votes: number;
    participation: number;
  };
  votingPoints: StatVotingPoint[];
  generatedAt: string;
};

// Custom tooltips
function VotesCustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const votos = payload.find((p: any) => p.dataKey === 'votos')?.value || 0;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <div className="size-2.5 rounded-full" style={{ background: '#6e3ff3' }} />
        <span className="text-sm text-muted-foreground">Votos:</span>
        <span className="text-sm font-medium text-foreground">{Number(votos).toLocaleString()}</span>
      </div>
    </div>
  );
}

function ParticipationCustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const participacion = payload.find((p: any) => p.dataKey === 'participacion')?.value || 0;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <div className="size-2.5 rounded-full" style={{ background: '#35b9e9' }} />
        <span className="text-sm text-muted-foreground">Participación:</span>
        <span className="text-sm font-medium text-foreground">{Number(participacion).toFixed(2)}%</span>
      </div>
    </div>
  );
}

function TopSlatesCustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const votos = payload.find((p: any) => p.dataKey === 'vote_count')?.value || 0;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="flex items-center gap-2">
        <div className="size-2.5 rounded-full" style={{ background: '#e255f2' }} />
        <span className="text-sm text-muted-foreground">Votos:</span>
        <span className="text-sm font-medium text-foreground">{Number(votos).toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const supabase = useMemo(() => createClient(), []);
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    loadStats();

    return () => {
      // Limpiar todos los canales al desmontar
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recalcTotals = (votingPoints: StatVotingPoint[]) => {
    const agg = votingPoints.reduce((acc, vp) => {
      if (vp.election?.id) acc.elections.add(vp.election.id);
      acc.votes += vp.totalVotes;
      acc.voters += vp.totalVoters;
      acc.voted += vp.votedCount;
      return acc;
    }, { elections: new Set<string>(), votes: 0, voters: 0, voted: 0 });

    return {
      elections: agg.elections.size,
      votingPoints: votingPoints.length,
      voters: agg.voters,
      votes: agg.votes,
      participation: agg.voters > 0 ? Number(((agg.voted / agg.voters) * 100).toFixed(2)) : 0,
    };
  };

  const setupRealtimeChannels = () => {
    // Limpiar canales anteriores si existen
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

    // Canal 1: Cambios en planillas (slates) → votos en tiempo real
    const slatesChannel = supabase
      .channel('admin-slates-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'slates' }, (payload) => {
        console.log('🔔 Slate change', payload.eventType);
        setStats((prev) => {
          if (!prev) return prev;
          let changed = false;

          const nextVPs = prev.votingPoints.map((vp) => {
            const newSlate = payload.new as any;
            const slateIdx = vp.slates.findIndex((s) => s.id === newSlate?.id);

            if (slateIdx >= 0) {
              const nextSlates = [...vp.slates];
              nextSlates[slateIdx] = {
                ...nextSlates[slateIdx],
                vote_count: newSlate?.vote_count ?? nextSlates[slateIdx].vote_count,
                name: newSlate?.name ?? nextSlates[slateIdx].name,
                description: newSlate?.description ?? nextSlates[slateIdx].description,
              };
              changed = true;
              return { ...vp, slates: nextSlates, totalVotes: nextSlates.reduce((a, s) => a + (s.vote_count || 0), 0) };
            }

            if (newSlate?.voting_point_id === vp.id) {
              const nextSlates = [...vp.slates, {
                id: newSlate.id,
                name: newSlate.name,
                description: newSlate.description,
                vote_count: newSlate.vote_count ?? 0,
              }];
              changed = true;
              return { ...vp, slates: nextSlates, totalVotes: nextSlates.reduce((a, s) => a + (s.vote_count || 0), 0) };
            }

            return vp;
          });

          if (!changed) return prev;
          return { ...prev, votingPoints: nextVPs, totals: recalcTotals(nextVPs) };
        });
      })
      .subscribe((status) => {
        console.log('📡 Slates subscription:', status);
      });

    // Canal 2: Cambios en votantes (voters) → participación en tiempo real
    const votersChannel = supabase
      .channel('admin-voters-' + Date.now())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'voters' }, (payload) => {
        console.log('🔔 Voter change', payload.eventType);
        setStats((prev) => {
          if (!prev) return prev;
          const updatedVoter = payload.new as any;
          const votingPointId = updatedVoter.voting_point_id;
          if (!votingPointId) return prev;

          let changed = false;
          const nextVPs = prev.votingPoints.map((vp) => {
            if (vp.id === votingPointId) {
              const wasVoted = (payload.old as any)?.has_voted;
              const isVoted = updatedVoter.has_voted;
              if (wasVoted !== isVoted) {
                const votedCount = isVoted ? vp.votedCount + 1 : Math.max(0, vp.votedCount - 1);
                changed = true;
                return { ...vp, votedCount };
              }
            }
            return vp;
          });

          if (!changed) return prev;
          return { ...prev, votingPoints: nextVPs, totals: recalcTotals(nextVPs) };
        });
      })
      .subscribe((status) => {
        console.log('📡 Voters subscription:', status);
      });

    // Canal 3: Cambios en elecciones
    const electionsChannel = supabase
      .channel('admin-elections-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elections' }, (payload) => {
        console.log('🔔 Election change', payload.eventType);
        setStats((prev) => {
          if (!prev) return prev;
          const updatedElection = payload.new as any;
          let changed = false;
          const nextVPs = prev.votingPoints.map((vp) => {
            if (vp.election?.id === updatedElection?.id) {
              changed = true;
              return {
                ...vp,
                election: {
                  ...vp.election,
                  title: updatedElection.title ?? vp.election.title,
                  is_active: updatedElection.is_active ?? vp.election.is_active,
                  start_date: updatedElection.start_date ?? vp.election.start_date,
                  end_date: updatedElection.end_date ?? vp.election.end_date,
                }
              };
            }
            return vp;
          });
          if (!changed) return prev;
          return { ...prev, votingPoints: nextVPs };
        });
      })
      .subscribe((status) => {
        console.log('📡 Elections subscription:', status);
      });

    // Canal 4: Cambios en puntos de votación
    const votingPointsChannel = supabase
      .channel('admin-vps-' + Date.now())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voting_points' }, (payload) => {
        console.log('🔔 Voting point change', payload.eventType);
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          loadStats();
        } else if (payload.eventType === 'UPDATE') {
          setStats((prev) => {
            if (!prev) return prev;
            const updatedVP = payload.new as any;
            let changed = false;
            const nextVPs = prev.votingPoints.map((vp) => {
              if (vp.id === updatedVP?.id) {
                changed = true;
                return { ...vp, name: updatedVP.name ?? vp.name, location: updatedVP.location ?? vp.location };
              }
              return vp;
            });
            if (!changed) return prev;
            return { ...prev, votingPoints: nextVPs };
          });
        }
      })
      .subscribe((status) => {
        console.log('📡 Voting Points subscription:', status);
      });

    channelsRef.current = [slatesChannel, votersChannel, electionsChannel, votingPointsChannel];
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/stats');
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'No se pudieron cargar las estadísticas');
        setStats(null);
        return;
      }
      setStats(json.data);

      // Configurar suscripciones en tiempo real DESPUÉS de cargar datos
      setupRealtimeChannels();
    } catch (err) {
      setError('No se pudieron cargar las estadísticas');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/admin/stats?format=csv');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voxpopuly-stats-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('No se pudo exportar el reporte');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between w-full">
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={loadStats}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Reintentar
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  const { totals, votingPoints } = stats;

  const isDark = resolvedTheme === 'dark';
  const axisColor = isDark ? '#71717a' : '#a1a1aa';
  const gridColor = isDark ? '#27272a' : '#f4f4f5';

  const barData = votingPoints.map((vp) => ({
    name: vp.name,
    votos: vp.totalVotes,
    participacion: vp.totalVoters > 0 ? Number(((vp.votedCount / vp.totalVoters) * 100).toFixed(2)) : 0,
  }));

  const topSlates = votingPoints
    .flatMap((vp) => vp.slates.map((s) => ({ ...s, vp: vp.name })))
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 8);

  // Colores específicos para cada barra en top slates
  const slateColors = ['#6e3ff3', '#35b9e9', '#e255f2', '#375dfb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Estadísticas Globales</h2>
          <p className="text-muted-foreground">Supervisión en tiempo real de todos los puntos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadStats}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Elecciones</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.elections}</div>
            <p className="text-xs text-muted-foreground">Total de elecciones activas o históricas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.votingPoints}</div>
            <p className="text-xs text-muted-foreground">Puntos de votación registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Votos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.votes}</div>
            <p className="text-xs text-muted-foreground">Votos contabilizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participación</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.participation}%</div>
            <p className="text-xs text-muted-foreground">Votantes que ya sufragaron</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Votantes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.voters}</div>
            <p className="text-xs text-muted-foreground">Censo total cargado</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <CardTitle className="text-base sm:text-lg mb-1">Votos por punto</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Distribución total de votos</CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full" style={{ background: '#6e3ff3' }} />
              <span className="text-xs text-muted-foreground">Votos</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: axisColor }} 
                interval={0} 
                angle={-45} 
                textAnchor="end" 
                height={80}
              />
              <YAxis 
                allowDecimals={false} 
                tick={{ fontSize: 12, fill: axisColor }}
              />
              <Tooltip content={<VotesCustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="votos" fill="#6e3ff3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <CardTitle className="text-base sm:text-lg mb-1">Participación por punto</CardTitle>
              <CardDescription className="text-xs sm:text-sm">% de votantes que ya sufragaron</CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="size-2.5 rounded-full" style={{ background: '#35b9e9' }} />
              <span className="text-xs text-muted-foreground">Participación</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 11, fill: axisColor }} 
                interval={0} 
                angle={-45} 
                textAnchor="end" 
                height={80}
              />
              <YAxis 
                domain={[0, 100]} 
                tickFormatter={(v) => `${v}%`} 
                tick={{ fontSize: 12, fill: axisColor }}
              />
              <Tooltip content={<ParticipationCustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
              <Bar dataKey="participacion" fill="#35b9e9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg mb-1">Top 8 planchas</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Planchas con más votos en toda la elección</CardDescription>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {topSlates.slice(0, 4).map((slate, i) => (
              <div key={slate.id} className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full" style={{ background: slateColors[i] }} />
                <span className="text-xs text-muted-foreground truncate max-w-[120px]">{slate.name}</span>
              </div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={topSlates} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis 
              type="number" 
              allowDecimals={false} 
              tick={{ fontSize: 12, fill: axisColor }}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={110} 
              tick={{ fontSize: 11, fill: axisColor }} 
            />
            <Tooltip content={<TopSlatesCustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="vote_count" radius={[0, 6, 6, 0]}>
              {topSlates.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={slateColors[index % slateColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por punto de votación</CardTitle>
          <CardDescription>Resultados parciales en tiempo real</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Punto</TableHead>
                <TableHead>Elección</TableHead>
                <TableHead>Delegado</TableHead>
                <TableHead>Participación</TableHead>
                <TableHead>Votantes</TableHead>
                <TableHead>Votos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votingPoints.map((vp) => {
                const participation = vp.totalVoters > 0 ? ((vp.votedCount / vp.totalVoters) * 100).toFixed(2) : '0.00';
                return (
                  <TableRow key={vp.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{vp.name}</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {vp.location || 'Sin ubicación'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{vp.election?.title || 'Sin elección'}</span>
                        {vp.election && (
                          <Badge variant={vp.election.is_active ? 'default' : 'secondary'} className="w-fit">
                            {vp.election.is_active ? 'Activa' : 'Cerrada'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{vp.delegate?.full_name || 'Sin delegado'}</TableCell>
                    <TableCell>{participation}%</TableCell>
                    <TableCell>
                      {vp.votedCount} / {vp.totalVoters}
                    </TableCell>
                    <TableCell>{vp.totalVotes}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalle por plancha</CardTitle>
          <CardDescription>Resultados parciales por punto y plancha</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {votingPoints.map((vp) => (
            <div key={vp.id} className="border rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 bg-muted/50">
                <div>
                  <p className="font-semibold">{vp.name}</p>
                  <p className="text-xs text-muted-foreground">{vp.election?.title || 'Sin elección'}</p>
                </div>
                <Badge variant="outline">{vp.slates.length} planchas</Badge>
              </div>
              {vp.slates.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">Sin planchas registradas</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plancha</TableHead>
                      <TableHead>Votos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vp.slates.map((slate) => (
                      <TableRow key={slate.id}>
                        <TableCell className="font-medium">{slate.name}</TableCell>
                        <TableCell>{slate.vote_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
