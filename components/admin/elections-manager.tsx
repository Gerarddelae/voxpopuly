'use client';

import { useState, useEffect } from 'react';
import type { Election, ElectionWithDetails } from '@/lib/types/database.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, MapPin, Users, Edit, Trash2, Eye } from 'lucide-react';
import { ElectionFormDialog } from '@/components/admin/election-form-dialog';
import { ElectionDetailsDialog } from '@/components/admin/election-details-dialog';

export function ElectionsManager() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [selectedElectionId, setSelectedElectionId] = useState<string | null>(null);

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/elections');
      const result = await response.json();
      
      if (result.success) {
        setElections(result.data);
      } else {
        console.error('Error loading elections:', result.error);
      }
    } catch (error) {
      console.error('Error loading elections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedElection(null);
    setFormOpen(true);
  };

  const handleEdit = (election: Election) => {
    setSelectedElection(election);
    setFormOpen(true);
  };

  const handleViewDetails = (electionId: string) => {
    setSelectedElectionId(electionId);
    setDetailsOpen(true);
  };

  const handleDelete = async (election: Election) => {
    if (!confirm(`¿Estás seguro de eliminar la elección "${election.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/elections/${election.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        await loadElections();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting election:', error);
      alert('Error al eliminar la elección');
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    loadElections();
  };

  const getElectionStatus = (election: Election) => {
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

  const canEdit = (election: Election) => {
    return new Date(election.start_date) > new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando elecciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Elecciones</h2>
          <p className="text-muted-foreground">
            Crea y administra eventos de votación
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Elección
        </Button>
      </div>

      {/* Elections List */}
      {elections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No hay elecciones creadas todavía
            </p>
            <Button onClick={handleCreate} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Crear primera elección
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {elections.map((election) => {
            const status = getElectionStatus(election);
            const editable = canEdit(election);

            return (
              <Card key={election.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{election.title}</CardTitle>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  </div>
                  {election.description && (
                    <CardDescription className="mt-2">
                      {election.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      <span>
                        {new Date(election.start_date).toLocaleDateString('es-ES')}
                        {' - '}
                        {new Date(election.end_date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleViewDetails(election.id)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalles
                    </Button>
                    
                    {editable && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(election)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(election)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ElectionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        election={selectedElection}
        onSuccess={handleFormSuccess}
      />

      <ElectionDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        electionId={selectedElectionId}
        onUpdate={loadElections}
      />
    </div>
  );
}
