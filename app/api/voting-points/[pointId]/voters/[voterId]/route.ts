import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// DELETE - Eliminar votante de un punto de votación
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pointId: string; voterId: string }> }
) {
  try {
    const supabase = await createClient();
    const { pointId: votingPointId, voterId } = await params;

    // Verificar autenticación y rol de admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autorizado. Se requiere rol de admin.' },
        { status: 403 }
      );
    }

    // Verificar que el votante existe y pertenece al punto
    const { data: voter } = await supabase
      .from('voters')
      .select('*, voting_point:voting_points!voters_voting_point_id_fkey(election:elections!voting_points_election_id_fkey(start_date))')
      .eq('id', voterId)
      .eq('voting_point_id', votingPointId)
      .single();

    if (!voter) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Votante no encontrado en este punto de votación' },
        { status: 404 }
      );
    }

    // Verificar que no haya votado
    if (voter.has_voted) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede eliminar un votante que ya ha emitido su voto' },
        { status: 400 }
      );
    }

    // Verificar que la elección no haya iniciado
    const electionStartDate = new Date((voter.voting_point as any).election.start_date);
    if (electionStartDate <= new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede modificar una elección que ya ha iniciado' },
        { status: 400 }
      );
    }

    // Eliminar votante
    const { error } = await supabase
      .from('voters')
      .delete()
      .eq('id', voterId);

    if (error) {
      console.error('Error deleting voter:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'voter_removed',
      entity_type: 'voter',
      entity_id: voterId,
      metadata: { 
        voting_point_id: votingPointId,
        profile_id: voter.profile_id,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Votante eliminado exitosamente',
    });
  } catch (error) {
    console.error('DELETE /api/voting-points/[pointId]/voters/[voterId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
