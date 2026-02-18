import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, VotingPointFormData, VotingPoint } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// POST - Crear punto de votación para una elección
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: electionId } = await params;

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

    // Verificar que la elección existe
    const { data: election } = await supabase
      .from('elections')
      .select('id')
      .eq('id', electionId)
      .single();

    if (!election) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Elección no encontrada' },
        { status: 404 }
      );
    }

    // Obtener datos del body
    const body: VotingPointFormData = await request.json();

    // Validaciones
    if (!body.name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El nombre del punto de votación es requerido' },
        { status: 400 }
      );
    }

    // Si se asigna un delegado, verificar que tenga el rol correcto
    if (body.delegate_id) {
      const { data: delegateProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', body.delegate_id)
        .single();

      if (!delegateProfile || delegateProfile.role !== 'delegate') {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'El usuario asignado no tiene rol de delegado' },
          { status: 400 }
        );
      }
    }

    // Crear punto de votación
    const { data: votingPoint, error } = await supabase
      .from('voting_points')
      .insert({
        election_id: electionId,
        name: body.name,
        location: body.location || null,
        delegate_id: body.delegate_id || null,
      })
      .select(`
        *,
        delegate:profiles!voting_points_delegate_id_fkey (
          id,
          full_name,
          document
        )
      `)
      .single();

    if (error) {
      console.error('Error creating voting point:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'voting_point_created',
      entity_type: 'voting_point',
      entity_id: votingPoint.id,
      metadata: { 
        name: votingPoint.name, 
        election_id: electionId 
      },
    });

    return NextResponse.json<ApiResponse<VotingPoint>>({
      success: true,
      data: votingPoint,
      message: 'Punto de votación creado exitosamente',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/elections/[id]/voting-points error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener puntos de votación de una elección
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: electionId } = await params;

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener puntos de votación
    console.log('[VotingPoints API] Fetching voting points for election:', electionId);
    const { data: votingPoints, error } = await supabase
      .from('voting_points')
      .select(`
        *,
        delegate:profiles!voting_points_delegate_id_fkey (
          id,
          full_name,
          document
        ),
        slates (
          *,
          members:slate_members (*)
        )
      `)
      .eq('election_id', electionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching voting points:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log('[VotingPoints API] Found voting points:', votingPoints?.length || 0);
    console.log('[VotingPoints API] Voting points data:', votingPoints?.map((vp: any) => ({
      id: vp.id,
      name: vp.name,
      delegate_id: vp.delegate_id
    })));

    return NextResponse.json<ApiResponse<VotingPoint[]>>({
      success: true,
      data: votingPoints,
    });
  } catch (error) {
    console.error('GET /api/elections/[id]/voting-points error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
