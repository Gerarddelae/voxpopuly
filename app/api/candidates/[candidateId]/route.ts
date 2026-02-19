import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/server/audit';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, CandidateFormData, Candidate } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// GET - Obtener un candidato específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const supabase = await createClient();
    const { candidateId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { data: candidate, error } = await supabase
      .from('candidates')
      .select(`
        *,
        voting_point:voting_points (
          *,
          election:elections (*)
        )
      `)
      .eq('id', candidateId)
      .single();

    if (error || !candidate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Candidato no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<Candidate>>({
      success: true,
      data: candidate,
    });
  } catch (error) {
    console.error('GET /api/candidates/[candidateId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar candidato
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const supabase = await createClient();
    const { candidateId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

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

    // Verificar que el candidato existe y su elección no está activa
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*, voting_point:voting_points!candidates_voting_point_id_fkey(*, election:elections!voting_points_election_id_fkey(is_active))')
      .eq('id', candidateId)
      .single();

    if (!candidate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Candidato no encontrado' },
        { status: 404 }
      );
    }

    const election = (candidate.voting_point as any)?.election;
    if (election?.is_active) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede modificar un candidato cuya elección está activa' },
        { status: 400 }
      );
    }

    const body: CandidateFormData = await request.json();

    if (!body.full_name) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'El nombre del candidato es requerido' },
        { status: 400 }
      );
    }

    // Proteger candidato "Voto en Blanco" de ser renombrado
    if (candidate.full_name === 'Voto en Blanco' && body.full_name !== 'Voto en Blanco') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede renombrar el candidato "Voto en Blanco". Es un candidato del sistema.' },
        { status: 400 }
      );
    }

    const { data: updatedCandidate, error: updateError } = await supabase
      .from('candidates')
      .update({
        full_name: body.full_name,
        role: body.role || null,
        photo_url: body.photo_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', candidateId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating candidate:', updateError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured; audit not recorded');
    } else {
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await recordAudit(serviceClient, {
        request,
        userId: user.id,
        action: 'candidate_updated',
        entityType: 'candidate',
        entityId: candidateId,
        metadata: { full_name: updatedCandidate.full_name },
      });
    }

    return NextResponse.json<ApiResponse<Candidate>>({
      success: true,
      data: updatedCandidate,
      message: 'Candidato actualizado exitosamente',
    });
  } catch (error) {
    console.error('PUT /api/candidates/[candidateId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar candidato
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const supabase = await createClient();
    const { candidateId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

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

    const { data: candidate } = await supabase
      .from('candidates')
      .select('*, voting_point:voting_points!candidates_voting_point_id_fkey(*, election:elections!voting_points_election_id_fkey(is_active))')
      .eq('id', candidateId)
      .single();

    if (!candidate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Candidato no encontrado' },
        { status: 404 }
      );
    }

    const election = (candidate.voting_point as any)?.election;
    if (election?.is_active) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede eliminar un candidato cuya elección está activa' },
        { status: 400 }
      );
    }

    // Proteger candidato "Voto en Blanco" de ser eliminado
    if (candidate.full_name === 'Voto en Blanco') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede eliminar el candidato "Voto en Blanco". Es un candidato del sistema.' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabase
      .from('candidates')
      .delete()
      .eq('id', candidateId);

    if (deleteError) {
      console.error('Error deleting candidate:', deleteError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured; audit not recorded');
    } else {
      const serviceClient = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await recordAudit(serviceClient, {
        request,
        userId: user.id,
        action: 'candidate_deleted',
        entityType: 'candidate',
        entityId: candidateId,
        metadata: { full_name: candidate.full_name },
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      message: 'Candidato eliminado exitosamente',
    });
  } catch (error) {
    console.error('DELETE /api/candidates/[candidateId] error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
