import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, VotingPoint, VotingPointFormData } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// GET - Obtener un punto de votación específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { pointId } = await params;

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener punto de votación
    const { data: votingPoint, error } = await supabase
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
      .eq('id', pointId)
      .single();

    if (error) {
      console.error('Error fetching voting point:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<VotingPoint>>({
      success: true,
      data: votingPoint,
    });
  } catch (error) {
    console.error('GET /api/voting-points/[pointId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar punto de votación
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { pointId } = await params;

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

    // Verificar que el punto de votación existe
    const { data: existingPoint } = await supabase
      .from('voting_points')
      .select('*, election:elections!voting_points_election_id_fkey(start_date)')
      .eq('id', pointId)
      .single();

    if (!existingPoint) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Punto de votación no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que la elección no haya iniciado
    if (new Date((existingPoint.election as any).start_date) <= new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede modificar un punto de una elección que ya ha iniciado' },
        { status: 400 }
      );
    }

    // Obtener datos del body
    const body: Partial<VotingPointFormData> = await request.json();

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

    // Actualizar punto de votación
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.location !== undefined) updateData.location = body.location || null;
    if (body.delegate_id !== undefined) updateData.delegate_id = body.delegate_id || null;

    const { data: votingPoint, error } = await supabase
      .from('voting_points')
      .update(updateData)
      .eq('id', pointId)
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
      console.error('Error updating voting point:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'voting_point_updated',
      entity_type: 'voting_point',
      entity_id: votingPoint.id,
      metadata: updateData,
    });

    return NextResponse.json<ApiResponse<VotingPoint>>({
      success: true,
      data: votingPoint,
      message: 'Punto de votación actualizado exitosamente',
    });
  } catch (error) {
    console.error('PUT /api/voting-points/[pointId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar punto de votación
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { pointId } = await params;

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

    // Verificar que el punto existe y su elección no ha iniciado
    const { data: existingPoint } = await supabase
      .from('voting_points')
      .select('name, election:elections!voting_points_election_id_fkey(start_date)')
      .eq('id', pointId)
      .single();

    if (!existingPoint) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Punto de votación no encontrado' },
        { status: 404 }
      );
    }

    if (new Date((existingPoint.election as any).start_date) <= new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede eliminar un punto de una elección que ya ha iniciado' },
        { status: 400 }
      );
    }

    // Eliminar punto de votación (CASCADE eliminará slates y members)
    const { error } = await supabase
      .from('voting_points')
      .delete()
      .eq('id', pointId);

    if (error) {
      console.error('Error deleting voting point:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'voting_point_deleted',
      entity_type: 'voting_point',
      entity_id: pointId,
      metadata: { name: existingPoint.name },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Punto de votación eliminado exitosamente',
    });
  } catch (error) {
    console.error('DELETE /api/voting-points/[pointId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
