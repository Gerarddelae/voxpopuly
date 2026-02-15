import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Voter } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// POST - Asignar votante(s) a un punto de votación
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { pointId: votingPointId } = await params;

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

    // Verificar que el punto de votación existe y su elección no ha iniciado
    const { data: votingPoint } = await supabase
      .from('voting_points')
      .select('*, election:elections!voting_points_election_id_fkey(start_date)')
      .eq('id', votingPointId)
      .single();

    if (!votingPoint) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Punto de votación no encontrado' },
        { status: 404 }
      );
    }

    if (new Date((votingPoint.election as any).start_date) <= new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede modificar una elección que ya ha iniciado' },
        { status: 400 }
      );
    }

    // Obtener profile_id(s) del body
    const body = await request.json();
    const profileIds: string[] = Array.isArray(body.profile_ids) 
      ? body.profile_ids 
      : [body.profile_id].filter(Boolean);

    if (profileIds.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Debe proporcionar al menos un votante' },
        { status: 400 }
      );
    }

    // Verificar que todos los profiles existen y tienen rol voter
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', profileIds);

    if (!profiles || profiles.length !== profileIds.length) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Uno o más votantes no existen' },
        { status: 400 }
      );
    }

    const invalidProfiles = profiles.filter(p => p.role !== 'voter');
    if (invalidProfiles.length > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Todos los perfiles deben tener rol de votante' },
        { status: 400 }
      );
    }

    // Insertar votantes (ignorar duplicados)
    const votersToInsert = profileIds.map(profileId => ({
      profile_id: profileId,
      voting_point_id: votingPointId,
    }));

    const { data: voters, error } = await supabase
      .from('voters')
      .upsert(votersToInsert, {
        onConflict: 'profile_id,voting_point_id',
        ignoreDuplicates: true,
      })
      .select(`
        *,
        profile:profiles!voters_profile_id_fkey (
          id,
          full_name,
          document
        )
      `);

    if (error) {
      console.error('Error assigning voters:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'voters_assigned',
      entity_type: 'voting_point',
      entity_id: votingPointId,
      metadata: { 
        voter_count: voters?.length || 0,
        profile_ids: profileIds,
      },
    });

    return NextResponse.json<ApiResponse<Voter[]>>({
      success: true,
      data: voters || [],
      message: `${voters?.length || 0} votante(s) asignado(s) exitosamente`,
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/voting-points/[pointId]/voters error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener votantes de un punto de votación
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { pointId: votingPointId } = await params;

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener votantes con información del perfil
    const { data: voters, error } = await supabase
      .from('voters')
      .select(`
        *,
        profile:profiles!voters_profile_id_fkey (
          id,
          full_name,
          document
        )
      `)
      .eq('voting_point_id', votingPointId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching voters:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Voter[]>>({
      success: true,
      data: voters || [],
    });
  } catch (error) {
    console.error('GET /api/voting-points/[pointId]/voters error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
