import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/database.types';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'delegate') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json<ApiResponse>({ success: false, error: 'Error de configuración del servidor' }, { status: 500 });
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Obtener el punto asignado al delegado
    const { data: votingPoint } = await service
      .from('voting_points')
      .select('id, name')
      .eq('delegate_id', user.id)
      .maybeSingle();

    if (!votingPoint) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No tienes un punto asignado' }, { status: 404 });
    }

    // Lista de votantes del punto con datos de perfil
    const { data: voters, error: votersError } = await service
      .from('voters')
      .select(`
        id,
        has_voted,
        voted_at,
        profile:profiles (id, full_name, document)
      `)
      .eq('voting_point_id', votingPoint.id)
      .order('has_voted', { ascending: true })
      .order('voted_at', { ascending: false });

    if (votersError) {
      console.error('Error fetching voters:', votersError);
      return NextResponse.json<ApiResponse>({ success: false, error: 'Error al cargar votantes' }, { status: 500 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: { voters: voters || [], votingPoint } });
  } catch (error) {
    console.error('GET /api/delegate/voters error:', error);
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
