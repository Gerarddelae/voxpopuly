import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, SlateFormData, Slate, SlateMemberFormData } from '@/lib/types/database.types';

// POST - Crear plancha para un punto de votación
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

    // Obtener datos del body
    const body: SlateFormData & { members?: SlateMemberFormData[] } = await request.json();

    // Validaciones
    if (!body.name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El nombre de la plancha es requerido' },
        { status: 400 }
      );
    }

    // Crear plancha
    const { data: slate, error: slateError } = await supabase
      .from('slates')
      .insert({
        voting_point_id: votingPointId,
        name: body.name,
        description: body.description || null,
      })
      .select()
      .single();

    if (slateError) {
      console.error('Error creating slate:', slateError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: slateError.message },
        { status: 500 }
      );
    }

    // Agregar miembros si se proporcionaron
    if (body.members && body.members.length > 0) {
      const membersData = body.members.map(member => ({
        slate_id: slate.id,
        full_name: member.full_name,
        role: member.role || null,
        photo_url: member.photo_url || null,
      }));

      const { error: membersError } = await supabase
        .from('slate_members')
        .insert(membersData);

      if (membersError) {
        console.error('Error creating slate members:', membersError);
        // No retornar error, la plancha ya fue creada
      }
    }

    // Obtener plancha con miembros
    const { data: slateWithMembers } = await supabase
      .from('slates')
      .select('*, members:slate_members(*)')
      .eq('id', slate.id)
      .single();

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'slate_created',
      entity_type: 'slate',
      entity_id: slate.id,
      metadata: { 
        name: slate.name,
        voting_point_id: votingPointId
      },
    });

    return NextResponse.json<ApiResponse<Slate>>({
      success: true,
      data: slateWithMembers || slate,
      message: 'Plancha creada exitosamente',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/voting-points/[pointId]/slates error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener planchas de un punto de votación
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

    // Obtener planchas con miembros
    const { data: slates, error } = await supabase
      .from('slates')
      .select(`
        *,
        slate_members (
          id,
          full_name,
          role,
          photo_url,
          created_at
        )
      `)
      .eq('voting_point_id', votingPointId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching slates:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Mapear slate_members a members para compatibilidad
    const slatesWithMembers = slates?.map(slate => ({
      ...slate,
      members: slate.slate_members || [],
    })) || [];

    return NextResponse.json<ApiResponse<Slate[]>>({
      success: true,
      data: slatesWithMembers,
    });
  } catch (error) {
    console.error('GET /api/voting-points/[pointId]/slates error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
