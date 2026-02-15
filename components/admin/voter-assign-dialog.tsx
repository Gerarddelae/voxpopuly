'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Profile } from '@/lib/types/database.types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Search, UserPlus, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VoterAssignInlineProps {
  votingPointId: string;
  assignedVoterIds: string[];
  onSuccess: () => void;
  onBack: () => void;
}

export function VoterAssignInline({
  votingPointId,
  assignedVoterIds,
  onSuccess,
  onBack,
}: VoterAssignInlineProps) {
  const [loading, setLoading] = useState(false);
  const [loadingVoters, setLoadingVoters] = useState(true);
  const [allVoters, setAllVoters] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadVoters = async () => {
      setLoadingVoters(true);
      try {
        const response = await fetch('/api/voters');
        const result = await response.json();
        if (!cancelled && result.success) {
          setAllVoters(result.data);
        }
      } catch (error) {
        console.error('Error loading voters:', error);
      } finally {
        if (!cancelled) setLoadingVoters(false);
      }
    };

    loadVoters();
    return () => { cancelled = true; };
  }, []);

  const availableVoters = useMemo(() => {
    return allVoters.filter((v) => !assignedVoterIds.includes(v.id));
  }, [allVoters, assignedVoterIds]);

  const filteredVoters = useMemo(() => {
    if (!searchTerm) return availableVoters;
    const term = searchTerm.toLowerCase();
    return availableVoters.filter(
      (voter) =>
        voter.full_name.toLowerCase().includes(term) ||
        voter.document.includes(searchTerm)
    );
  }, [availableVoters, searchTerm]);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/voting-points/${votingPointId}/voters`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile_ids: selectedIds }),
        }
      );

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        alert(result.error || 'Error al asignar votantes');
      }
    } catch (error) {
      console.error('Error assigning voters:', error);
      alert('Error al asignar votantes');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (voterId: string) => {
    setSelectedIds((prev) =>
      prev.includes(voterId)
        ? prev.filter((id) => id !== voterId)
        : [...prev, voterId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredVoters.length && filteredVoters.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVoters.map((v) => v.id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <h3 className="text-sm font-medium flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Asignar Votantes
        </h3>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o documento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de votantes */}
      <div className="border rounded-lg">
        <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
          <Checkbox
            id="select-all-inline"
            checked={
              selectedIds.length === filteredVoters.length &&
              filteredVoters.length > 0
            }
            onCheckedChange={toggleSelectAll}
          />
          <label
            htmlFor="select-all-inline"
            className="text-sm font-medium cursor-pointer flex-1"
          >
            Seleccionar todos ({filteredVoters.length} disponibles)
          </label>
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} seleccionados
          </span>
        </div>

        <ScrollArea className="h-[250px]">
          {loadingVoters ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
              Cargando votantes...
            </div>
          ) : filteredVoters.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchTerm
                ? 'No se encontraron votantes'
                : 'No hay votantes disponibles para asignar'}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredVoters.map((voter) => (
                <div
                  key={voter.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => toggleSelection(voter.id)}
                >
                  <Checkbox
                    checked={selectedIds.includes(voter.id)}
                    onCheckedChange={() => toggleSelection(voter.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {voter.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Doc: {voter.document}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || selectedIds.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Asignando...
            </>
          ) : (
            `Asignar ${selectedIds.length} votante${selectedIds.length !== 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </div>
  );
}
