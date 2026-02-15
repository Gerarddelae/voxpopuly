import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, SlateFormData, Slate, SlateMemberFormData } from '@/lib/types/database.types';

// GET - Obtener una plancha específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slateId: string }> }
) {
  try {
    const supabase = await createClient();
    const { slateId } = await params;

    console.log('🔍 GET /api/slates/[slateId] - Buscando plancha:', slateId);

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener plancha con miembros
    const { data: slate, error } = await supabase
      .from('slates')
      .select(`
        *,
        slate_members (
          id,
          full_name,
          role,
          created_at
        ),
        voting_points (
          *,
          elections (*)
        )
      `)
      .eq('id', slateId)
      .single();

    console.log('📦 Datos de Supabase:', { slate, error });

    if (error || !slate) {
      console.error('❌ Error o plancha no encontrada:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Plancha no encontrada' },
        { status: 404 }
      );
    }

    // Mapear slate_members a members para compatibilidad con el frontend
    const slateWithMembers = {
      ...slate,
      members: slate.slate_members || [],
      voting_point: slate.voting_points,
    };

    console.log('✅ Plancha encontrada con', slateWithMembers.members?.length || 0, 'miembros');

    return NextResponse.json<ApiResponse<Slate>>({
      success: true,
      data: slateWithMembers,
    });
  } catch (error) {
    console.error('💥 GET /api/slates/[slateId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar plancha
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slateId: string }> }
) {
  try {
    const supabase = await createClient();
    const { slateId } = await params;

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

    // Verificar que la plancha existe y su elección no ha iniciado
    const { data: slate } = await supabase
      .from('slates')
      .select('*, voting_point:voting_points!slates_voting_point_id_fkey(*, election:elections!voting_points_election_id_fkey(start_date))')
      .eq('id', slateId)
      .single();

    if (!slate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Plancha no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la elección no ha iniciado
    const election = (slate.voting_point as any)?.election;
    if (election && new Date(election.start_date) <= new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede modificar una plancha cuya elección ya ha iniciado' },
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

    // Actualizar plancha
    const { data: updatedSlate, error: updateError } = await supabase
      .from('slates')
      .update({
        name: body.name,
        description: body.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', slateId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating slate:', updateError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    // Actualizar miembros si se proporcionaron
    if (body.members !== undefined) {
      // Eliminar miembros existentes
      await supabase
        .from('slate_members')
        .delete()
        .eq('slate_id', slateId);

      // Agregar nuevos miembros (filtrar vacíos)
      const validMembers = body.members.filter((m) => m.full_name.trim() !== '');
      
      if (validMembers.length > 0) {
        const membersData = validMembers.map(member => ({
          slate_id: slateId,
          full_name: member.full_name,
          role: member.role || null,
        }));

        const { error: membersError } = await supabase
          .from('slate_members')
          .insert(membersData);

        if (membersError) {
          console.error('Error updating slate members:', membersError);
          // No retornar error, la plancha ya fue actualizada
        }
      }
    }

    // Obtener plancha actualizada con miembros
    const { data: slateWithMembers } = await supabase
      .from('slates')
      .select('*, members:slate_members(*)')
      .eq('id', slateId)
      .single();

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'slate_updated',
      entity_type: 'slate',
      entity_id: slateId,
      metadata: { 
        name: updatedSlate.name,
      },
    });

    return NextResponse.json<ApiResponse<Slate>>({
      success: true,
      data: slateWithMembers || updatedSlate,
      message: 'Plancha actualizada exitosamente',
    });
  } catch (error) {
    console.error('PUT /api/slates/[slateId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar plancha
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slateId: string }> }
) {
  try {
    const supabase = await createClient();
    const { slateId } = await params;

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

    // Verificar que la plancha existe y su elección no ha iniciado
    const { data: slate } = await supabase
      .from('slates')
      .select('*, voting_point:voting_points!slates_voting_point_id_fkey(*, election:elections!voting_points_election_id_fkey(start_date))')
      .eq('id', slateId)
      .single();

    if (!slate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Plancha no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la elección no ha iniciado
    const election = (slate.voting_point as any)?.election;
    if (election && new Date(election.start_date) <= new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede eliminar una plancha cuya elección ya ha iniciado' },
        { status: 400 }
      );
    }

    // Eliminar plancha (los miembros se eliminan automáticamente por CASCADE)
    const { error: deleteError } = await supabase
      .from('slates')
      .delete()
      .eq('id', slateId);

    if (deleteError) {
      console.error('Error deleting slate:', deleteError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'slate_deleted',
      entity_type: 'slate',
      entity_id: slateId,
      metadata: { 
        name: slate.name,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Plancha eliminada exitosamente',
    });
  } catch (error) {
    console.error('DELETE /api/slates/[slateId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
