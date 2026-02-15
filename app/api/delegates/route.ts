import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Profile } from '@/lib/types/database.types';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// GET - Obtener lista de delegados disponibles
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

    // Obtener todos los delegados
    const { data: delegates, error } = await supabase
      .from('profiles')
      .select('id, full_name, document, role, created_at, updated_at')
      .eq('role', 'delegate')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching delegates:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Profile[]>>({
      success: true,
      data: delegates || [],
    });
  } catch (error) {
    console.error('GET /api/delegates error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo delegado
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
    const body = await request.json();
    const { full_name, document, email, password } = body;

    // Validar campos requeridos
    if (!full_name || !document || !email || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Todos los campos son requeridos: full_name, document, email, password' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Validar longitud de contraseña
    if (password.length < 8) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Verificar que el documento no exista
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('document', document)
      .single();

    if (existingProfile) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Ya existe un usuario con este número de documento' },
        { status: 409 }
      );
    }

    // Crear cliente admin con service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured');
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Crear usuario en Auth
    const { data: authData, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name,
        document,
      },
    });

    if (createUserError || !authData.user) {
      console.error('Error creating auth user:', createUserError);
      return NextResponse.json<ApiResponse>(
        { success: false, error: createUserError?.message || 'Error al crear usuario' },
        { status: 500 }
      );
    }

    // Crear perfil con rol delegate
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name,
        document,
        role: 'delegate',
      })
      .select()
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Si falla la creación del perfil, eliminar el usuario de Auth
      await adminClient.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al crear perfil de delegado' },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Profile & { credentials: { email: string; password: string } }>>({
      success: true,
      data: {
        ...newProfile,
        credentials: {
          email,
          password, // Devolver la contraseña solo en la creación
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('POST /api/delegates error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
