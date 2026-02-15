'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Activity, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

interface SlateStat {
  id: string;
  name: string;
  description?: string | null;
  vote_count: number;
}

interface StatsPayload {
  votingPoint: {
    id: string;
    name: string;
    location?: string | null;
    election?: {
      id: string;
      title: string;
      is_active: boolean;
      start_date?: string;
      end_date?: string;
    };
  };
  slates: SlateStat[];
  totalVotes: number;
}

export default function DelegateResultsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadStats();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/delegate/stats');
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'No se pudieron cargar las estadísticas');
        setStats(null);
        return;
      }
      setStats(json.data);
      
      // Configurar suscripción en tiempo real para el punto de votación del delegado
      if (json.data?.votingPoint?.id) {
        // Limpiar canal anterior si existe
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        // Crear nuevo canal de suscripción
        const channel = supabase.channel(`slates-vp-${json.data.votingPoint.id}`);
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'slates',
          filter: `voting_point_id=eq.${json.data.votingPoint.id}`,
        }, (payload) => {
          setStats((prev) => {
            if (!prev) return prev;
            const updated = [...prev.slates];
            
            if (payload.eventType === 'DELETE') {
              // Remover planilla eliminada
              const deletedId = (payload.old as any)?.id;
              const filtered = updated.filter((s) => s.id !== deletedId);
              const totalVotes = filtered.reduce((a, s) => a + (s.vote_count || 0), 0);
              return { ...prev, slates: filtered, totalVotes };
            }
            
            const row = payload.new as SlateStat;
            const idx = updated.findIndex((s) => s.id === row.id);
            
            if (idx >= 0) {
              // Actualizar planilla existente
              updated[idx] = { 
                ...updated[idx], 
                vote_count: row.vote_count ?? 0, 
                name: row.name, 
                description: row.description 
              };
            } else {
              // Agregar nueva planilla
              updated.push({ 
                id: row.id, 
                name: row.name, 
                description: row.description, 
                vote_count: row.vote_count ?? 0 
              });
            }
            
            const totalVotes = updated.reduce((a, s) => a + (s.vote_count || 0), 0);
            return { ...prev, slates: updated, totalVotes };
          });
        });
        
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Suscripción en tiempo real activa para resultados');
          }
        });
        
        channelRef.current = channel;
      }
    } catch (e) {
      setError('No se pudieron cargar las estadísticas');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

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

  if (!stats) {
    return (
      <Alert>
        <AlertDescription>No hay datos disponibles.</AlertDescription>
      </Alert>
    );
  }

  const { votingPoint, slates, totalVotes } = stats;
  const election = votingPoint.election;

  // Ordenar planchas por votos (descendente)
  const sortedSlates = [...slates].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
  
  // Calcular porcentajes
  const slatesWithPercentage = sortedSlates.map(slate => ({
    ...slate,
    percentage: totalVotes > 0 ? ((slate.vote_count || 0) / totalVotes * 100).toFixed(1) : '0.0'
  }));

  const getPositionColor = (index: number) => {
    if (index === 0) return 'from-yellow-500 to-yellow-600';
    if (index === 1) return 'from-gray-400 to-gray-500';
    if (index === 2) return 'from-orange-600 to-orange-700';
    return 'from-primary to-primary/80';
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Encabezado
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ACTA DE RESULTADOS ELECTORALES', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('VoxPopuly - Sistema de Votacion Digital', pageWidth / 2, 28, { align: 'center' });
    
    // Línea decorativa
    doc.setLineWidth(0.5);
    doc.line(20, 32, pageWidth - 20, 32);
    
    // Información del punto de votación
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    let yPos = 42;
    
    doc.text('INFORMACION DEL PUNTO DE VOTACION', 20, yPos);
    yPos += 8;
    doc.setFontSize(10);
    doc.text(`Punto de Votacion: ${votingPoint.name}`, 25, yPos);
    yPos += 6;
    if (votingPoint.location) {
      doc.text(`Ubicacion: ${votingPoint.location}`, 25, yPos);
      yPos += 6;
    }
    if (election) {
      doc.text(`Eleccion: ${election.title}`, 25, yPos);
      yPos += 6;
    }
    
    // Fecha y hora de generación
    const now = new Date();
    doc.text(`Fecha de generacion: ${now.toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, 25, yPos);
    yPos += 6;
    doc.text(`Hora: ${now.toLocaleTimeString('es-ES')}`, 25, yPos);
    yPos += 10;
    
    // Estado de la votación
    doc.setFont('helvetica', 'bold');
    doc.text(`Estado: ${election?.is_active ? 'VOTACION ACTIVA' : 'VOTACION CERRADA'}`, 25, yPos);
    yPos += 12;
    
    // Resultados
    doc.setFontSize(11);
    doc.text('RESULTADOS DE LA VOTACION', 20, yPos);
    yPos += 8;
    
    // Tabla de resultados
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Pos.', 25, yPos);
    doc.text('Plancha', 50, yPos);
    doc.text('Votos', pageWidth - 50, yPos, { align: 'right' });
    doc.text('Porcentaje', pageWidth - 20, yPos, { align: 'right' });
    yPos += 5;
    
    // Línea de encabezado
    doc.setLineWidth(0.3);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 6;
    
    // Datos de cada plancha
    doc.setFont('helvetica', 'normal');
    slatesWithPercentage.forEach((slate, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      // Usar formato numérico simple para posiciones
      let position = '';
      if (index === 0) position = '1ro';
      else if (index === 1) position = '2do';
      else if (index === 2) position = '3ro';
      else position = `${index + 1}`;
      
      doc.text(position, 25, yPos);
      
      // Truncar nombre largo si es necesario
      const maxNameLength = 45;
      const displayName = slate.name.length > maxNameLength 
        ? slate.name.substring(0, maxNameLength) + '...' 
        : slate.name;
      doc.text(displayName, 50, yPos);
      
      doc.text(`${slate.vote_count || 0}`, pageWidth - 50, yPos, { align: 'right' });
      doc.text(`${slate.percentage}%`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 6;
    });
    
    // Línea de separación
    yPos += 2;
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 8;
    
    // Total de votos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TOTAL DE VOTOS: ${totalVotes}`, 25, yPos);
    yPos += 15;
    
    // Espacio para firmas
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    yPos += 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('_________________________________', 30, yPos);
    doc.text('_________________________________', pageWidth - 80, yPos);
    yPos += 5;
    doc.text('Delegado(a) de Mesa', 30, yPos);
    doc.text('Testigo', pageWidth - 80, yPos);
    
    // Pie de página
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Acta generada por VoxPopuly - Pagina ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }
    
    // Descargar PDF
    const fileName = `Acta_${votingPoint.name.replace(/\s+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-background p-4 rounded-lg border border-primary/20">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🗳️ Resultados en Tiempo Real</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {votingPoint.name} {votingPoint.location && `· ${votingPoint.location}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {election?.is_active && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 rounded-md">
              <Activity className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm font-semibold">EN VIVO</span>
            </div>
          )}
          <Button 
            onClick={generatePDF}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar Acta PDF
          </Button>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-3xl font-bold tabular-nums">{totalVotes}</div>
          </div>
        </div>
      </div>

      {/* Grid de planchas - 2 columnas para aprovechar el espacio */}
      {slatesWithPercentage.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg text-muted-foreground">No hay planchas registradas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {slatesWithPercentage.map((slate, index) => (
            <Card 
              key={slate.id} 
              className={cn(
                "relative overflow-hidden border-2 transition-all hover:shadow-lg",
                index < 3 && "ring-1 ring-primary/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Posición compacta */}
                  <div className="text-center shrink-0 w-12">
                    <div className="text-3xl font-bold">
                      {typeof getMedalEmoji(index) === 'string' && getMedalEmoji(index).includes('#') 
                        ? <span className="text-xl text-muted-foreground">{getMedalEmoji(index)}</span>
                        : <span role="img" aria-label={`Posición ${index + 1}`}>{getMedalEmoji(index)}</span>
                      }
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-lg font-bold truncate">{slate.name}</h3>
                      <div className="text-3xl font-bold tabular-nums shrink-0">{slate.vote_count || 0}</div>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div className="relative h-6 bg-muted rounded-md overflow-hidden">
                      <div 
                        className={cn(
                          "h-full bg-gradient-to-r rounded-md transition-all duration-1000 ease-out relative",
                          getPositionColor(index)
                        )}
                        style={{ width: `${slate.percentage}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20" />
                        <div className="absolute inset-0 flex items-center justify-end pr-3">
                          <span className="text-sm font-bold text-white drop-shadow-md">
                            {slate.percentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
