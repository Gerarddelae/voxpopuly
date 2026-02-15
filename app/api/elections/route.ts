import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Election, ElectionFormData } from '@/lib/types/database.types';

export const dynamic = 'force-dynamic';

// GET - Listar todas las elecciones
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

    // Obtener todas las elecciones
    const { data: elections, error } = await supabase
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching elections:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Election[]>>({
      success: true,
      data: elections,
    });
  } catch (error) {
    console.error('GET /api/elections error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva elección
export async function POST(request: NextRequest) {
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

    // Obtener datos del body
    const body: ElectionFormData = await request.json();

    // Validaciones
    if (!body.title || !body.start_date || !body.end_date) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Título, fecha de inicio y fecha de fin son requeridos' },
        { status: 400 }
      );
    }

    // Validar que la fecha de fin sea después de la fecha de inicio
    if (new Date(body.start_date) >= new Date(body.end_date)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' },
        { status: 400 }
      );
    }

    // Crear elección
    const { data: election, error } = await supabase
      .from('elections')
      .insert({
        title: body.title,
        description: body.description || null,
        start_date: body.start_date,
        end_date: body.end_date,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating election:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Registrar auditoría
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'election_created',
      entity_type: 'election',
      entity_id: election.id,
      metadata: { title: election.title },
    });

    return NextResponse.json<ApiResponse<Election>>({
      success: true,
      data: election,
      message: 'Elección creada exitosamente',
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/elections error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
