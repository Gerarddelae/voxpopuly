import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// GET - Obtener información de votación para el votante actual
export async function GET() {
  try {
    const supabase = await createClient();

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Obtener el perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'voter') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No autorizado. Se requiere rol de votante.' },
        { status: 403 }
      );
    }

    // Usar service role para evitar recursión RLS en JOINs entre voters/voting_points/elections
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error de configuración del servidor' },
        { status: 500 }
      );
    }

    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Buscar el registro de votante con JOINs (usando service role para evitar RLS recursion)
    const { data: voterRecord, error: voterError } = await serviceClient
      .from('voters')
      .select(`
        id,
        has_voted,
        voted_at,
        voting_point_id,
        voting_point:voting_points (
          id,
          name,
          location,
          election_id,
          election:elections (
            id,
            title,
            description,
            start_date,
            end_date,
            is_active
          )
        )
      `)
      .eq('profile_id', user.id)
      .maybeSingle();

    // Si no hay registro de votante o hubo un error real
    if (voterError) {
      console.error('Error fetching voter record:', voterError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al consultar información del votante' },
        { status: 500 }
      );
    }

    if (!voterRecord) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          isAssigned: false,
          canVote: false,
          hasVoted: false,
          message: 'No estás asignado a ningún punto de votación actualmente.'
        }
      });
    }

    const votingPoint = voterRecord.voting_point as any;
    const election = votingPoint?.election as any;

    // Verificar si ya votó
    if (voterRecord.has_voted) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: {
          isAssigned: true,
          votingPoint,
          election,
          canVote: false,
          hasVoted: true,
          votedAt: voterRecord.voted_at,
          message: 'Ya has emitido tu voto en esta elección.'
        }
      });
    }

    // Obtener los candidatos disponibles SIEMPRE (aunque la elección no esté activa)
    const { data: candidates, error: candidatesError } = await serviceClient
      .from('candidates')
      .select(`
        id,
        full_name,
        role,
        photo_url,
        vote_count
      `)
      .eq('voting_point_id', voterRecord.voting_point_id)
      .order('full_name');

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al cargar los candidatos' },
        { status: 500 }
      );
    }

    // Determinar si puede votar (elección activa Y no ha votado)
    const canVote = election?.is_active === true && !voterRecord.has_voted;
    
    let message = '';
    if (!election?.is_active) {
      message = 'La elección no está activa en este momento. Podrás votar cuando se active.';
    } else if (candidates && candidates.length === 0) {
      message = 'No hay candidatos disponibles en tu punto de votación.';
    } else {
      message = 'Puedes votar ahora.';
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        isAssigned: true,
        votingPoint,
        election,
        canVote,
        hasVoted: false,
        candidates: candidates || [],
        voterRecordId: voterRecord.id,
        message
      }
    });
  } catch (error) {
    console.error('GET /api/voter/voting-info error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
