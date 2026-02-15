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

    // Obtener punto de votación asignado al delegado
    const { data: votingPoint, error: vpError } = await service
      .from('voting_points')
      .select(`
        id,
        name,
        location,
        election:elections (
          id,
          title,
          is_active,
          start_date,
          end_date
        )
      `)
      .eq('delegate_id', user.id)
      .maybeSingle();

    if (vpError) {
      console.error('Error fetching delegate voting point:', vpError);
      return NextResponse.json<ApiResponse>({ success: false, error: 'Error al consultar el punto de votación' }, { status: 500 });
    }

    if (!votingPoint) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No tienes un punto de votación asignado' }, { status: 404 });
    }

    // Obtener planchas del punto con conteo y miembros
    const { data: slates, error: slatesError } = await service
      .from('slates')
      .select(`
        id,
        name,
        description,
        vote_count,
        slate_members ( id, full_name, role )
      `)
      .eq('voting_point_id', votingPoint.id)
      .order('name');

    if (slatesError) {
      console.error('Error fetching slates stats:', slatesError);
      return NextResponse.json<ApiResponse>({ success: false, error: 'Error al cargar estadísticas' }, { status: 500 });
    }

    const totalVotes = (slates || []).reduce((acc, s) => acc + (s.vote_count || 0), 0);

    // Mapear slate_members a members para compatibilidad con front-end
    const slatesWithMembers = (slates || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      vote_count: s.vote_count,
      members: s.slate_members || [],
    }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        votingPoint,
        slates: slatesWithMembers,
        totalVotes,
      }
    });
  } catch (error) {
    console.error('GET /api/delegate/stats error:', error);
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
