import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse, Profile } from '@/lib/types/database.types';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// GET - Obtener lista de delegados disponibles
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const url = new URL(request.url);
    const electionId = url.searchParams.get('electionId');
    const allowDelegateId = url.searchParams.get('allowDelegateId');

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

    // Excluir delegados ya asignados a CUALQUIER punto de votación (global)
    let assignedIds: string[] = [];
    {
      console.log('[Delegates API] Fetching ALL assigned delegates globally');
      const { data: assigned, error: assignedError } = await supabase
        .from('voting_points')
        .select('delegate_id')
        .not('delegate_id', 'is', null);

      if (assignedError) {
        console.error('Error fetching assigned delegates:', assignedError);
        return NextResponse.json<ApiResponse>(
          { success: false, error: assignedError.message },
          { status: 500 }
        );
      }

      assignedIds = (assigned || []).map((a: any) => a.delegate_id).filter(Boolean);
      console.log('[Delegates API] All globally assigned delegates:', assignedIds);

      // Permitir el delegado del punto que se está editando (para no bloquearse a sí mismo)
      if (allowDelegateId) {
        console.log('[Delegates API] Allowing delegate (current):', allowDelegateId);
        assignedIds = assignedIds.filter((id) => id !== allowDelegateId);
      }
      console.log('[Delegates API] Final exclusion list:', assignedIds);
    }

    // Obtener todos los delegados primero
    const { data: allDelegates, error } = await supabase
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

    // Filtrar los delegados asignados usando JavaScript
    const delegates = assignedIds.length > 0
      ? (allDelegates || []).filter(d => !assignedIds.includes(d.id))
      : (allDelegates || []);

    console.log('[Delegates API] All delegates count:', allDelegates?.length || 0);
    console.log('[Delegates API] Filtered delegates count:', delegates.length);
    console.log('[Delegates API] Returning delegates:', delegates.map(d => ({ id: d.id, name: d.full_name })));

    return NextResponse.json<ApiResponse<Profile[]>>({
      success: true,
      data: delegates,
    }, {
      // Evitar que el navegador reutilice una lista obsoleta de delegados
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
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
          role: 'delegate',
        })
        .eq('id', authData.user.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating auto-created profile:', updateError);
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Error al actualizar perfil de delegado' },
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
          role: 'delegate',
        })
        .select()
        .single();

      if (profileError) {
        console.error('Error creating profile:', profileError);
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Error al crear perfil de delegado' },
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
    console.error('POST /api/delegates error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
