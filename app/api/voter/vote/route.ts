import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// POST - Registrar voto del votante
export async function POST(request: NextRequest) {
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

    // Obtener datos del body
    const body = await request.json();
    const { slate_id } = body;

    if (!slate_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Se requiere seleccionar una plancha' },
        { status: 400 }
      );
    }

    // Usar service role para evitar recursión RLS en JOINs
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

    // Buscar el registro de votante (usando service role para evitar RLS recursion)
    const { data: voterRecord, error: voterError } = await serviceClient
      .from('voters')
      .select(`
        id,
        has_voted,
        voting_point_id,
        voting_point:voting_points (
          id,
          election_id,
          election:elections (
            id,
            is_active
          )
        )
      `)
      .eq('profile_id', user.id)
      .single();

    if (voterError || !voterRecord) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No estás asignado a ningún punto de votación' },
        { status: 404 }
      );
    }

    // Verificar que no haya votado ya
    if (voterRecord.has_voted) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Ya has emitido tu voto en esta elección' },
        { status: 400 }
      );
    }

    const votingPoint = voterRecord.voting_point as any;
    const election = votingPoint?.election as any;

    // Verificar que la elección esté activa
    if (!election?.is_active) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'La elección no está activa en este momento' },
        { status: 400 }
      );
    }

    // Verificar que la plancha pertenezca al punto de votación del votante
    const { data: slate, error: slateError } = await serviceClient
      .from('slates')
      .select('id, voting_point_id, name')
      .eq('id', slate_id)
      .single();

    if (slateError || !slate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Plancha no encontrada' },
        { status: 404 }
      );
    }

    if (slate.voting_point_id !== voterRecord.voting_point_id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Esta plancha no pertenece a tu punto de votación' },
        { status: 403 }
      );
    }

    // Iniciar transacción: registrar voto y actualizar contadores
    // 1. Insertar el voto en la tabla votes
    const { data: vote, error: voteError } = await serviceClient
      .from('votes')
      .insert({
        voter_id: voterRecord.id,
        slate_id: slate_id
      })
      .select()
      .single();

    if (voteError) {
      console.error('Error inserting vote:', voteError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al registrar el voto' },
        { status: 500 }
      );
    }

    // 2. Marcar al votante como que ya votó
    const { error: updateVoterError } = await serviceClient
      .from('voters')
      .update({
        has_voted: true,
        voted_at: new Date().toISOString()
      })
      .eq('id', voterRecord.id);

    if (updateVoterError) {
      console.error('Error updating voter:', updateVoterError);
      // Intentar revertir el voto
      await serviceClient.from('votes').delete().eq('id', vote.id);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al actualizar el registro de votante' },
        { status: 500 }
      );
    }

    // 3. Incrementar el contador de votos de la plancha
    const { error: updateSlateError } = await serviceClient.rpc('increment_slate_votes', {
      slate_id: slate_id
    });

    if (updateSlateError) {
      console.error('Error incrementing slate votes:', updateSlateError);
      // No revertimos aquí porque el voto ya está registrado
      // Solo logueamos el error
    }

    // Registrar auditoría
    await serviceClient.from('audit_logs').insert({
      user_id: user.id,
      action: 'vote_cast',
      entity_type: 'vote',
      entity_id: vote.id,
      metadata: {
        voting_point_id: voterRecord.voting_point_id,
        election_id: election.id
      }
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      message: '¡Voto registrado exitosamente!',
      data: {
        voted_at: vote.created_at
      }
    });
  } catch (error) {
    console.error('POST /api/voter/vote error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
