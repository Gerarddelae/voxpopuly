import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Election, ElectionFormData } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// GET - Obtener una elección específica con detalles
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener elección con puntos de votación
    const { data: election, error } = await supabase
      .from('elections')
      .select(`
        *,
        voting_points (
          *,
          delegate:profiles!voting_points_delegate_id_fkey (
            id,
            full_name,
            document
          ),
          candidates (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching election:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 404 }
      );
    }

    // Agregar conteo de votantes para cada punto de votación
    if (election.voting_points) {
      const votingPointsWithCounts = await Promise.all(
        election.voting_points.map(async (vp: any) => {
          const { count } = await supabase
            .from('voters')
            .select('*', { count: 'exact', head: true })
            .eq('voting_point_id', vp.id);
          
          return {
            ...vp,
            total_voters: count || 0
          };
        })
      );
      
      election.voting_points = votingPointsWithCounts;
    }

    return NextResponse.json<ApiResponse<Election>>({
      success: true,
      data: election,
    });
  } catch (error) {
    console.error('GET /api/elections/[id] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar elección
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    // Obtener datos del body
    const body: Partial<ElectionFormData> & { is_active?: boolean } = await request.json();

    // Verificar que la elección exista y decidir qué campos se pueden modificar
    const { data: existingElection } = await supabase
      .from('elections')
      .select('start_date')
      .eq('id', id)
      .single();

    if (!existingElection) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Elección no encontrada' },
        { status: 404 }
      );
    }

    const electionStarted = new Date(existingElection.start_date) <= new Date();

    // Si la elección ya inició, solo permitimos cambiar is_active (activar/desactivar)
    const allowedKeysIfStarted = ['is_active'];
    if (electionStarted) {
      const invalidKeys = Object.keys(body).filter(
        (k) => body[k as keyof typeof body] !== undefined && !allowedKeysIfStarted.includes(k)
      );
      if (invalidKeys.length > 0) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Solo puedes activar/desactivar una elección que ya inició' },
          { status: 400 }
        );
      }
    }

    // Validar fechas si se están actualizando
    if (body.start_date && body.end_date) {
      if (new Date(body.start_date) >= new Date(body.end_date)) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
          { status: 400 }
        );
      }
    }

    // Actualizar elección
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.title) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.start_date) updateData.start_date = body.start_date;
    if (body.end_date) updateData.end_date = body.end_date;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data: election, error } = await supabase
      .from('elections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating election:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'election_updated',
      entity_type: 'election',
      entity_id: election.id,
      metadata: updateData,
    });

    return NextResponse.json<ApiResponse<Election>>({
      success: true,
      data: election,
      message: 'Elección actualizada exitosamente',
    });
  } catch (error) {
    console.error('PUT /api/elections/[id] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar elección
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

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

    // Verificar que la elección no haya iniciado
    const { data: existingElection } = await supabase
      .from('elections')
      .select('start_date, title')
      .eq('id', id)
      .single();

    if (!existingElection) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Elección no encontrada' },
        { status: 404 }
      );
    }

    if (new Date(existingElection.start_date) <= new Date()) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede eliminar una elección que ya ha iniciado' },
        { status: 400 }
      );
    }

    // Eliminar elección (CASCADE eliminará voting_points, candidates, etc.)
    const { error } = await supabase
      .from('elections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting election:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'election_deleted',
      entity_type: 'election',
      entity_id: id,
      metadata: { title: existingElection.title },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Elección eliminada exitosamente',
    });
  } catch (error) {
    console.error('DELETE /api/elections/[id] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
