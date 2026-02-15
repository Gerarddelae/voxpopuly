import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

type ActivityItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: string;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
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
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Fetch recent audit logs
    const { data: logs, error: logsError } = await supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      console.error('Error fetching audit logs:', logsError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al obtener actividad' },
        { status: 500 }
      );
    }

    const activity: ActivityItem[] = (logs || []).map((log) => {
      const actionLabels: Record<string, string> = {
        election_created: 'Elección creada',
        election_updated: 'Elección actualizada',
        election_deleted: 'Elección eliminada',
        voting_point_created: 'Punto de votación creado',
        voting_point_updated: 'Punto de votación actualizado',
        voting_point_deleted: 'Punto de votación eliminado',
        voter_created: 'Votante creado',
        voter_updated: 'Votante actualizado',
        vote_cast: 'Voto registrado',
        slate_created: 'Plancha creada',
        slate_updated: 'Plancha actualizada',
      };

      const title = actionLabels[log.action] || log.action;
      const entityInfo = log.metadata?.title || log.entity_id || '';
      const message = `${log.entity_type}: ${entityInfo}`;

      return {
        id: log.id,
        title,
        message,
        timestamp: log.created_at,
        type: log.action,
      };
    });

    return NextResponse.json<ApiResponse<ActivityItem[]>>({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('GET /api/admin/activity error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
