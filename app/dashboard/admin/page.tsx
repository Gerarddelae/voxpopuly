'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Vote, 
  MapPin, 
  Users, 
  TrendingUp, 
  Calendar,
  ChevronRight,
  BarChart,
  RefreshCw
} from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState({
    totalElections: 0,
    activeElections: 0,
    votingPoints: 0,
    totalVotes: 0,
    participation: 0,
    voters: 0,
  });
  const [recentElections, setRecentElections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => loadDashboardData(), 30000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, electionsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/elections'),
      ]);

      const statsJson = await statsRes.json();
      const electionsJson = await electionsRes.json();

      if (statsJson?.success) {
        const totals = statsJson.data?.totals;
        setStats((prev) => ({
          ...prev,
          totalElections: totals?.elections ?? prev.totalElections,
          votingPoints: totals?.votingPoints ?? prev.votingPoints,
          totalVotes: totals?.votes ?? prev.totalVotes,
          participation: totals?.participation ?? 0,
          voters: totals?.voters ?? 0,
          activeElections: totals?.activeElections ?? prev.activeElections,
        }));
      }

      if (electionsJson?.success) {
        const elections = electionsJson.data || [];

        // Use server-side counts (already set from statsJson above)
        // Only update totalElections and recentElections list here
        setStats((prev) => ({
          ...prev,
          totalElections: prev.totalElections || elections.length,
        }));

        setRecentElections(elections.slice(0, 5));
      }

      // load recent activity (non-blocking)
      try {
        const actRes = await fetch('/api/admin/activity');
        const actJson = await actRes.json();
        setRecentActivity(actJson?.data || []);
      } catch (err) {
        setRecentActivity([]);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getElectionStatus = (election: any) => {
    const nowTs = Date.now();
    const startTs = election.start_date ? Date.parse(election.start_date) : NaN;
    const endTs = election.end_date ? Date.parse(election.end_date) : NaN;

    const normalizeIsActive = (v: any) => {
      if (v === true) return true;
      if (v === false) return false;
      if (v === 't' || v === 'true' || v === '1' || v === 1) return true;
      return false;
    };

    const isActiveFlag = normalizeIsActive(election.is_active);
    const withinDates = !Number.isNaN(startTs) && !Number.isNaN(endTs) && nowTs >= startTs && nowTs <= endTs;

    if (!isActiveFlag) return { label: 'Inactiva', variant: 'secondary' as const };
    if (!withinDates) return { label: 'Finalizada', variant: 'secondary' as const };
    return { label: 'En curso', variant: 'default' as const };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h2>
            <p className="text-muted-foreground">Vista general del sistema de votación</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => loadDashboardData()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refrescar
            </Button>
            <Button size="sm" variant={autoRefresh ? 'default' : 'outline'} onClick={() => setAutoRefresh(!autoRefresh)}>
              {autoRefresh ? 'Auto-actualización' : 'Auto off'}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{lastUpdated ? `Última actualización: ${lastUpdated.toLocaleString()}` : 'Sin actualización'}</p>
      </div>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Elecciones</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalElections}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeElections} activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos de Votación</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.votingPoints}</div>
            <p className="text-xs text-muted-foreground">
              En todas las elecciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Votos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVotes}</div>
            <p className="text-xs text-muted-foreground">
              Votos registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participación</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.participation}%</div>
            <p className="text-xs text-muted-foreground">Sobre {stats.voters} votantes</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/admin/elections">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Vote className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Elecciones</CardTitle>
              <CardDescription>
                Gestiona eventos de votación
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/voting-points">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <MapPin className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Puntos de Votación</CardTitle>
              <CardDescription>
                Vista general de puntos
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/users">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <Users className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Usuarios</CardTitle>
              <CardDescription>
                Administra usuarios y roles
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/admin/reports">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <BarChart className="h-8 w-8 mb-2 text-primary" />
              <CardTitle className="text-lg">Reportes</CardTitle>
              <CardDescription>
                Estadísticas y análisis
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* Recent Elections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Elecciones Recientes</CardTitle>
              <CardDescription>
                Últimas elecciones creadas en el sistema
              </CardDescription>
            </div>
            <Link href="/dashboard/admin/elections">
              <Button variant="ghost" size="sm">
                Ver todas
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : recentElections.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                No hay elecciones creadas
              </p>
              <Link href="/dashboard/admin/elections">
                <Button variant="outline" size="sm">
                  Crear primera elección
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentElections.map((election) => {
                const status = getElectionStatus(election);
                return (
                  <div
                    key={election.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{election.title}</h4>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      {election.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {election.description}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        <div>
                          Inicio: {new Date(election.start_date).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                        <div>
                          Fin: {new Date(election.end_date).toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </div>
                    </div>
                    <Link href="/dashboard/admin/elections">
                      <Button variant="ghost" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Actividad Reciente</CardTitle>
              <CardDescription>Acciones recientes y alertas</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => loadDashboardData()}>
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-muted-foreground">Sin actividad reciente</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 8).map((item: any, idx: number) => (
                <div key={idx} className="text-sm">
                  <div className="font-medium">{item.title || item.type || 'Actividad'}</div>
                  <div className="text-xs text-muted-foreground">{item.message || item.detail || ''}</div>
                  <div className="text-xs text-muted-foreground">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
