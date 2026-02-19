import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Profile } from '@/lib/types/database.types';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET - Obtener lista de votantes disponibles
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

    // Obtener todos los votantes
    const { data: voters, error } = await supabase
      .from('profiles')
      .select('id, full_name, document, role, created_at, updated_at')
      .eq('role', 'voter')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching voters:', error);
      return NextResponse.json<ApiResponse>(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json<ApiResponse<Profile[]>>({
      success: true,
      data: voters || [],
    });
  } catch (error) {
    console.error('GET /api/voters error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo votante
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

    // Validar longitud de contraseña (PIN de 6 dígitos mínimo)
    if (password.length < 6) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'La contraseña/PIN debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar que el documento no exista
    const { data: existingProfile, error: checkDocError } = await supabase
      .from('profiles')
      .select('id')
      .eq('document', document)
      .maybeSingle();

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

    // Verificar si ya existe un perfil (por si hay un trigger automático)
    const { data: existingAutoProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    let newProfile;

    if (existingAutoProfile) {
      // Si el perfil ya fue creado por un trigger, actualizarlo
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name,
          document,
          role: 'voter',
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating auto-created profile:', updateError);
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Error al actualizar perfil de votante' },
          { status: 500 }
        );
      }
      newProfile = updatedProfile;
    } else {
      // Si no existe, crearlo manualmente
      const { data: createdProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          full_name,
          document,
          role: 'voter',
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Error al crear perfil de votante' },
          { status: 500 }
        );
      }
      newProfile = createdProfile;
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
    console.error('POST /api/voters error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
