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
  BarChart
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

  useEffect(() => {
    loadDashboardData();
  }, []);

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
        }));
      }

      if (electionsJson?.success) {
        const elections = electionsJson.data || [];
        const now = new Date();
        const active = elections.filter((e: any) => {
          const start = new Date(e.start_date);
          const end = new Date(e.end_date);
          return e.is_active && now >= start && now <= end;
        });

        setStats((prev) => ({
          ...prev,
          totalElections: prev.totalElections || elections.length,
          activeElections: active.length,
        }));

        setRecentElections(elections.slice(0, 5));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getElectionStatus = (election: any) => {
    const now = new Date();
    const start = new Date(election.start_date);
    const end = new Date(election.end_date);

    if (!election.is_active) {
      return { label: 'Inactiva', variant: 'secondary' as const };
    }
    if (now < start) {
      return { label: 'Próxima', variant: 'default' as const };
    }
    if (now >= start && now <= end) {
      return { label: 'En curso', variant: 'default' as const };
    }
    return { label: 'Finalizada', variant: 'secondary' as const };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Administrativo</h2>
        <p className="text-muted-foreground">
          Vista general del sistema de votación
        </p>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(election.start_date).toLocaleDateString('es-ES')}
                        {' - '}
                        {new Date(election.end_date).toLocaleDateString('es-ES')}
                      </p>
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
    </div>
  );
}
