import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { recordAudit } from '@/lib/server/audit';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, CandidateFormData, Candidate } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// POST - Crear candidato para un punto de votación
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

    // Verificar que el punto de votación existe y su elección no está activa
    const { data: votingPoint } = await supabase
      .from('voting_points')
      .select('*, election:elections!voting_points_election_id_fkey(is_active)')
      .eq('id', votingPointId)
      .single();

    if (!votingPoint) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Punto de votación no encontrado' },
        { status: 404 }
      );
    }

    if ((votingPoint.election as any).is_active) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se puede modificar una elección que está activa' },
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

    // Crear candidato
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .insert({
        voting_point_id: votingPointId,
        full_name: body.full_name,
        role: body.role || null,
        photo_url: body.photo_url || null,
      })
      .select()
      .single();

    if (candidateError) {
      console.error('Error creating candidate:', candidateError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: candidateError.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
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
        action: 'candidate_created',
        entityType: 'candidate',
        entityId: candidate.id,
        metadata: { 
          full_name: candidate.full_name,
          voting_point_id: votingPointId
        },
      });
    }

    return NextResponse.json<ApiResponse<Candidate>>({
      success: true,
      data: candidate,
      message: 'Candidato creado exitosamente',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/voting-points/[pointId]/candidates error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener candidatos de un punto de votación
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pointId: string }> }
) {
  try {
    const supabase = await createClient();
    const { pointId: votingPointId } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('voting_point_id', votingPointId)
      .order('full_name');

    if (error) {
      console.error('Error fetching candidates:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Candidate[]>>({
      success: true,
      data: candidates || [],
    });
  } catch (error) {
    console.error('GET /api/voting-points/[pointId]/candidates error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
