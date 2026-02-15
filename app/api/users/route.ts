import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Profile } from '@/lib/types/database.types';

// GET - Obtener lista de todos los usuarios (solo admins)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Obtener todos los usuarios
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Calcular estadísticas
    const stats = {
      total: profiles?.length || 0,
      admins: profiles?.filter(p => p.role === 'admin').length || 0,
      delegates: profiles?.filter(p => p.role === 'delegate').length || 0,
      voters: profiles?.filter(p => p.role === 'voter').length || 0,
    };

    return NextResponse.json<ApiResponse<{ profiles: Profile[]; stats: typeof stats }>>({
      success: true,
      data: {
        profiles: profiles || [],
        stats,
      },
    });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
