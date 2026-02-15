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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CheckCircle2,
  Clock,
  Activity,
  FileDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  PieChart,
  Pie,
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

type ElectionInfo = {
  id: string;
  title: string;
  is_active: boolean;
  start_date?: string | null;
  end_date?: string | null;
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

function PieCustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{entry.name}</p>
      <div className="flex items-center gap-2">
        <div className="size-2.5 rounded-full" style={{ background: entry.payload?.fill }} />
        <span className="text-sm text-muted-foreground">Votos:</span>
        <span className="text-sm font-medium text-foreground">{Number(entry.value).toLocaleString()}</span>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');
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

  // Extract unique elections from all voting points (reactive to real-time updates)
  const elections = useMemo<ElectionInfo[]>(() => {
    if (!stats) return [];
    const map = new Map<string, ElectionInfo>();
    stats.votingPoints.forEach((vp) => {
      if (vp.election && vp.election.id && !map.has(vp.election.id)) {
        map.set(vp.election.id, { ...vp.election });
      }
    });
    return Array.from(map.values());
  }, [stats]);

  // Auto-select Election when there is only one
  useEffect(() => {
    if (elections.length === 1 && selectedElectionId === 'all') {
      setSelectedElectionId(elections[0].id);
    }
  }, [elections, selectedElectionId]);

  // Filtered voting points based on selected election
  const filteredVotingPoints = useMemo(() => {
    if (!stats) return [];
    if (selectedElectionId === 'all') return stats.votingPoints;
    return stats.votingPoints.filter((vp) => vp.election?.id === selectedElectionId);
  }, [stats, selectedElectionId]);

  // Recalculated totals for the filtered view
  const filteredTotals = useMemo(() => {
    const agg = filteredVotingPoints.reduce(
      (acc, vp) => {
        if (vp.election?.id) acc.elections.add(vp.election.id);
        acc.votes += vp.totalVotes;
        acc.voters += vp.totalVoters;
        acc.voted += vp.votedCount;
        return acc;
      },
      { elections: new Set<string>(), votes: 0, voters: 0, voted: 0 }
    );
    return {
      elections: agg.elections.size,
      votingPoints: filteredVotingPoints.length,
      voters: agg.voters,
      votes: agg.votes,
      participation: agg.voters > 0 ? Number(((agg.voted / agg.voters) * 100).toFixed(2)) : 0,
    };
  }, [filteredVotingPoints]);

  // Currently selected election info
  const selectedElection = useMemo<ElectionInfo | null>(() => {
    if (selectedElectionId === 'all') return null;
    return elections.find((e) => e.id === selectedElectionId) ?? null;
  }, [elections, selectedElectionId]);

  const slateColors = ['#6e3ff3', '#35b9e9', '#e255f2', '#375dfb', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  // Aggregate slates by name for pie chart when a specific election is selected
  const slateAggregation = useMemo(() => {
    const map = new Map<string, number>();
    filteredVotingPoints.forEach((vp) => {
      vp.slates.forEach((s) => {
        map.set(s.name, (map.get(s.name) ?? 0) + (s.vote_count || 0));
      });
    });
    return Array.from(map.entries())
      .map(([name, votes], i) => ({ name, votes, fill: slateColors[i % slateColors.length] }))
      .sort((a, b) => b.votes - a.votes);
  }, [filteredVotingPoints]);

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
            if (vp.election?.id === updatedElection?.id && vp.election) {
              changed = true;
              return {
                ...vp,
                election: {
                  id: vp.election.id,
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

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('VoxPopuly - Reporte de Estadísticas', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Election title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      const electionTitle = selectedElection?.title || 'Todas las elecciones';
      doc.text(electionTitle, pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Date and time
      doc.setFontSize(10);
      doc.setTextColor(100);
      const now = new Date().toLocaleString('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.text(`Generado: ${now}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Election info banner (if specific election)
      if (selectedElection) {
        doc.setFillColor(240, 240, 255);
        doc.rect(15, yPos - 5, pageWidth - 30, 25, 'F');
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text('Estado:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        const status = selectedElection.is_active ? 'Activa' : 'Inactiva';
        doc.text(status, 40, yPos);
        
        yPos += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Inicio:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedElection.start_date), 40, yPos);
        
        yPos += 7;
        doc.setFont('helvetica', 'bold');
        doc.text('Fin:', 20, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(formatDate(selectedElection.end_date), 40, yPos);
        yPos += 15;
      }

      // Summary statistics
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Resumen General', 15, yPos);
      yPos += 10;

      const statsData = [
        ['Métrica', 'Valor'],
        ['Total Puntos de Votación', String(filteredTotals.votingPoints)],
        ['Total Votantes Registrados', String(filteredTotals.voters)],
        ['Votos Emitidos', String(filteredTotals.votes)],
        ['Participación', `${filteredTotals.participation}%`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [statsData[0]],
        body: statsData.slice(1),
        theme: 'grid',
        headStyles: { fillColor: [110, 63, 243], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9 },
        alternateRowStyles: { fillColor: [245, 245, 250] },
        margin: { left: 15, right: 15 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Voting Points Table
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle por Punto de Votación', 15, yPos);
      yPos += 10;

      const vpData = filteredVotingPoints.map((vp) => {
        const participation = vp.totalVoters > 0 ? ((vp.votedCount / vp.totalVoters) * 100).toFixed(2) : '0.00';
        return [
          vp.name,
          vp.location || 'Sin ubicación',
          vp.delegate?.full_name || 'Sin delegado',
          `${vp.votedCount}/${vp.totalVoters}`,
          `${participation}%`,
          String(vp.totalVotes),
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Punto', 'Ubicación', 'Delegado', 'Votantes', 'Participación', 'Votos']],
        body: vpData,
        theme: 'striped',
        headStyles: { fillColor: [53, 185, 233], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [240, 248, 255] },
        margin: { left: 15, right: 15 },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Top Slates Table
      if (topSlates.length > 0) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Planchas', 15, yPos);
        yPos += 10;

        const slatesData = topSlates.map((slate, index) => [
          String(index + 1),
          slate.name,
          String(slate.vote_count),
          slate.vpName,
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Plancha', 'Votos', 'Punto']],
          body: slatesData,
          theme: 'striped',
          headStyles: { fillColor: [226, 85, 242], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [253, 242, 255] },
          margin: { left: 15, right: 15 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 60 },
            2: { cellWidth: 25 },
            3: { cellWidth: 50 },
          },
        });
      }

      // Footer on all pages
      const totalPages = (doc as any).internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `VoxPopuly | Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const filename = selectedElection
        ? `VoxPopuly-${selectedElection.title.replace(/\s/g, '_')}-${Date.now()}.pdf`
        : `VoxPopuly-Reporte-${Date.now()}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('No se pudo generar el PDF');
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

  const isDark = resolvedTheme === 'dark';
  const axisColor = isDark ? '#71717a' : '#a1a1aa';
  const gridColor = isDark ? '#27272a' : '#f4f4f5';

  const barData = filteredVotingPoints.map((vp) => ({
    name: vp.name,
    votos: vp.totalVotes,
    participacion: vp.totalVoters > 0 ? Number(((vp.votedCount / vp.totalVoters) * 100).toFixed(2)) : 0,
  }));

  const topSlates = filteredVotingPoints
    .flatMap((vp) => vp.slates.map((s) => ({ ...s, vpName: vp.name, electionTitle: vp.election?.title ?? '' })))
    .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
    .slice(0, 8);

  const getElectionStatusBadge = (e: ElectionInfo) => {
    const now = Date.now();
    const start = e.start_date ? Date.parse(e.start_date) : NaN;
    const end = e.end_date ? Date.parse(e.end_date) : NaN;
    if (!e.is_active) return <Badge variant="secondary">Inactiva</Badge>;
    if (!Number.isNaN(end) && now > end) return <Badge variant="outline">Finalizada</Badge>;
    if (!Number.isNaN(start) && now >= start) return <Badge className="bg-green-600 hover:bg-green-700 text-white">En curso</Badge>;
    return <Badge variant="outline">Programada</Badge>;
  };

  const formatDate = (d?: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reportes y Estadísticas</h2>
          <p className="text-muted-foreground">Supervisión en tiempo real por elección</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedElectionId} onValueChange={setSelectedElectionId}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Seleccionar elección" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las elecciones</SelectItem>
              {elections.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  <span className="flex items-center gap-2">
                    {e.is_active ? <Activity className="h-3 w-3 text-green-500" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                    {e.title}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadStats}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {/* Election info banner */}
      {selectedElection && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-3">
              <Vote className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold text-lg">{selectedElection.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(selectedElection.start_date)} — {formatDate(selectedElection.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getElectionStatusBadge(selectedElection)}
              <Badge variant="outline">{filteredTotals.votingPoints} puntos</Badge>
              <Badge variant="outline">{filteredTotals.voters} votantes</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Elecciones</CardTitle>
            <Vote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTotals.elections}</div>
            <p className="text-xs text-muted-foreground">
              {selectedElectionId === 'all' ? 'Total en el sistema' : 'Elección seleccionada'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTotals.votingPoints}</div>
            <p className="text-xs text-muted-foreground">Puntos de votación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Votos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTotals.votes}</div>
            <p className="text-xs text-muted-foreground">Votos contabilizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participación</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTotals.participation}%</div>
            <p className="text-xs text-muted-foreground">Votantes que ya sufragaron</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Votantes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredTotals.voters}</div>
            <p className="text-xs text-muted-foreground">Censo total cargado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for organized content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Resumen Visual</TabsTrigger>
          <TabsTrigger value="points">Detalle por Punto</TabsTrigger>
          <TabsTrigger value="slates">Detalle por Plancha</TabsTrigger>
        </TabsList>

        {/* TAB: Resumen Visual */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {filteredVotingPoints.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Vote className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No hay puntos de votación para la elección seleccionada.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Votes per point chart */}
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
                      <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: axisColor }} />
                      <Tooltip content={<VotesCustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="votos" fill="#6e3ff3" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Participation per point chart */}
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
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12, fill: axisColor }} />
                      <Tooltip content={<ParticipationCustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="participacion" fill="#35b9e9" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {/* Slate distribution: horizontal bar + pie (when specific election) */}
              <div className={`grid gap-4 ${selectedElectionId !== 'all' ? 'lg:grid-cols-2' : ''}`}>
                <Card className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
                    <div>
                      <CardTitle className="text-base sm:text-lg mb-1">Top planchas</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {selectedElectionId !== 'all'
                          ? 'Planchas con más votos en esta elección'
                          : 'Planchas con más votos (todas las elecciones)'}
                      </CardDescription>
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
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: axisColor }} />
                      <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fill: axisColor }} />
                      <Tooltip content={<TopSlatesCustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }} />
                      <Bar dataKey="vote_count" radius={[0, 6, 6, 0]}>
                        {topSlates.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={slateColors[index % slateColors.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Pie chart only when a specific election is selected */}
                {selectedElectionId !== 'all' && slateAggregation.length > 0 && (
                  <Card className="p-4 sm:p-6">
                    <div className="mb-6">
                      <CardTitle className="text-base sm:text-lg mb-1">Distribución de votos</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Proporción de votos por plancha</CardDescription>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={slateAggregation}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          dataKey="votes"
                          nameKey="name"
                          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(1)}%)`}
                          labelLine
                        >
                          {slateAggregation.map((entry, i) => (
                            <Cell key={`pie-${i}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieCustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Legend below pie */}
                    <div className="flex flex-wrap gap-3 mt-4 justify-center">
                      {slateAggregation.map((s) => (
                        <div key={s.name} className="flex items-center gap-1.5">
                          <div className="size-2.5 rounded-full" style={{ background: s.fill }} />
                          <span className="text-xs text-muted-foreground">{s.name}: {s.votes}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* TAB: Detalle por punto */}
        <TabsContent value="points" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalle por punto de votación</CardTitle>
              <CardDescription>
                {selectedElectionId !== 'all'
                  ? `Resultados en tiempo real — ${selectedElection?.title}`
                  : 'Resultados de todos los puntos en todas las elecciones'}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {filteredVotingPoints.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay puntos de votación para mostrar.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Punto</TableHead>
                      {selectedElectionId === 'all' && <TableHead>Elección</TableHead>}
                      <TableHead>Delegado</TableHead>
                      <TableHead>Participación</TableHead>
                      <TableHead>Votantes</TableHead>
                      <TableHead>Votos</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVotingPoints.map((vp) => {
                      const participation = vp.totalVoters > 0 ? ((vp.votedCount / vp.totalVoters) * 100).toFixed(2) : '0.00';
                      const pctNum = parseFloat(participation);
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
                          {selectedElectionId === 'all' && (
                            <TableCell>
                              <span className="text-sm">{vp.election?.title || 'Sin elección'}</span>
                            </TableCell>
                          )}
                          <TableCell>{vp.delegate?.full_name || 'Sin delegado'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${Math.min(pctNum, 100)}%` }}
                                />
                              </div>
                              <span className="text-sm">{participation}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {vp.votedCount} / {vp.totalVoters}
                          </TableCell>
                          <TableCell>{vp.totalVotes}</TableCell>
                          <TableCell>
                            {vp.election ? (
                              <Badge variant={vp.election.is_active ? 'default' : 'secondary'}>
                                {vp.election.is_active ? 'Activa' : 'Cerrada'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">—</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Detalle por plancha */}
        <TabsContent value="slates" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalle por plancha</CardTitle>
              <CardDescription>
                {selectedElectionId !== 'all'
                  ? `Resultados parciales por punto y plancha — ${selectedElection?.title}`
                  : 'Resultados de todas las planchas por punto'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredVotingPoints.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No hay datos para mostrar.</p>
              ) : (
                filteredVotingPoints.map((vp) => {
                  const totalVpVotes = vp.slates.reduce((a, s) => a + (s.vote_count || 0), 0);
                  return (
                    <div key={vp.id} className="border rounded-lg">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 bg-muted/50">
                        <div>
                          <p className="font-semibold">{vp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {vp.election?.title || 'Sin elección'} · {vp.location || 'Sin ubicación'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{vp.slates.length} planchas</Badge>
                          <Badge variant="outline">{totalVpVotes} votos</Badge>
                        </div>
                      </div>
                      {vp.slates.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Sin planchas registradas</div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Plancha</TableHead>
                              <TableHead>Votos</TableHead>
                              <TableHead>% del punto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...vp.slates]
                              .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
                              .map((slate, i) => {
                                const pct = totalVpVotes > 0 ? ((slate.vote_count / totalVpVotes) * 100).toFixed(1) : '0.0';
                                return (
                                  <TableRow key={slate.id}>
                                    <TableCell className="font-medium">
                                      <div className="flex items-center gap-2">
                                        <div className="size-2.5 rounded-full" style={{ background: slateColors[i % slateColors.length] }} />
                                        {slate.name}
                                      </div>
                                    </TableCell>
                                    <TableCell>{slate.vote_count}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className="h-2 w-12 rounded-full bg-muted overflow-hidden">
                                          <div
                                            className="h-full rounded-full transition-all"
                                            style={{ width: `${Math.min(parseFloat(pct), 100)}%`, background: slateColors[i % slateColors.length] }}
                                          />
                                        </div>
                                        <span className="text-sm">{pct}%</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Timestamp */}
      {stats.generatedAt && (
        <p className="text-xs text-muted-foreground text-right">
          Datos generados: {new Date(stats.generatedAt).toLocaleString('es-CO')}
        </p>
      )}
    </div>
  );
}
