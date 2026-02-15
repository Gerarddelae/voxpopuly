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

    if (profile?.role !== 'voter') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json<ApiResponse>({ success: false, error: 'Error de configuración' }, { status: 500 });
    }

    const service = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: voterRecord } = await service
      .from('voters')
      .select('id')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (!voterRecord) {
      return NextResponse.json<ApiResponse>({ success: true, data: [] });
    }

    const { data: votes, error: votesError } = await service
      .from('votes')
      .select(`
        id,
        created_at,
        slate:slates (
          id,
          name,
          voting_point:voting_points (
            id,
            name,
            location,
            election:elections (
              id,
              title,
              start_date,
              end_date,
              is_active
            )
          )
        )
      `)
      .eq('voter_id', voterRecord.id)
      .order('created_at', { ascending: false });

    if (votesError) {
      console.error('Error fetching votes history:', votesError);
      return NextResponse.json<ApiResponse>({ success: false, error: 'Error al cargar historial' }, { status: 500 });
    }

    return NextResponse.json<ApiResponse>({ success: true, data: votes || [] });
  } catch (error) {
    console.error('GET /api/voter/history error:', error);
    return NextResponse.json<ApiResponse>({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
