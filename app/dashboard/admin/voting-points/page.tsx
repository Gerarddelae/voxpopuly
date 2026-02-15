'use client';

import { useState, useEffect } from 'react';
import type { VotingPoint, Election, Profile } from '@/lib/types/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, User, Users, Calendar } from 'lucide-react';

export default function VotingPointsPage() {
  const [votingPoints, setVotingPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVotingPoints();
  }, []);

  const loadVotingPoints = async () => {
    try {
      setLoading(true);
      // Cargar elecciones y sus puntos de votación
      const response = await fetch('/api/elections');
      const result = await response.json();
      
      if (result.success) {
        // Extraer todos los puntos de votación de todas las elecciones
        const allPoints: any[] = [];
        
        for (const election of result.data) {
          const detailsResponse = await fetch(`/api/elections/${election.id}`);
          const detailsResult = await detailsResponse.json();
          
          if (detailsResult.success && detailsResult.data.voting_points) {
            detailsResult.data.voting_points.forEach((vp: any) => {
              allPoints.push({
                ...vp,
                election: {
                  id: election.id,
                  title: election.title,
                  start_date: election.start_date,
                  end_date: election.end_date,
                },
              });
            });
          }
        }
        
        setVotingPoints(allPoints);
      }
    } catch (error) {
      console.error('Error loading voting points:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando puntos de votación...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Puntos de Votación</h2>
          <p className="text-muted-foreground">
            Vista general de todos los puntos de votación
          </p>
        </div>
      </div>

      {/* Voting Points List */}
      {votingPoints.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No hay puntos de votación creados todavía
            </p>
            <p className="text-sm text-muted-foreground">
              Los puntos de votación se crean desde la gestión de elecciones
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {votingPoints.map((vp) => (
            <Card key={vp.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{vp.name}</CardTitle>
                    <Badge variant="outline" className="mb-2">
                      {vp.election.title}
                    </Badge>
                  </div>
                </div>
                {vp.location && (
                  <CardDescription className="flex items-center gap-1 mt-2">
                    <MapPin className="h-3 w-3" />
                    {vp.location}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {vp.delegate ? (
                    <div className="flex items-center text-muted-foreground">
                      <User className="mr-2 h-4 w-4" />
                      <span>
                        Delegado: {vp.delegate.full_name}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center text-muted-foreground">
                      <User className="mr-2 h-4 w-4" />
                      <span>Sin delegado asignado</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-muted-foreground">
                    <Users className="mr-2 h-4 w-4" />
                    <span>{vp.slates?.length || 0} planchas</span>
                  </div>

                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="mr-2 h-4 w-4" />
                    <span className="text-xs">
                      {new Date(vp.election.start_date).toLocaleDateString('es-ES')}
                    </span>
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
