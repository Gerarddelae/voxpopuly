import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/database.types';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// GET - Listar usuarios huérfanos (en auth.users sin perfil)
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

    // Crear cliente admin con service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Obtener todos los usuarios de auth
    const { data: authUsers, error: authError2 } = await adminClient.auth.admin.listUsers();
    
    if (authError2 || !authUsers?.users) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al obtener usuarios de autenticación' },
        { status: 500 }
      );
    }

    // Obtener todos los perfiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');

    if (profilesError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al obtener perfiles' },
        { status: 500 }
      );
    }

    const profileIds = new Set(profiles?.map(p => p.id) || []);

    // Encontrar usuarios huérfanos (en auth pero no en profiles)
    const orphanedUsers = authUsers.users
      .filter(u => !profileIds.has(u.id))
      .map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: u.user_metadata,
      }));

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        total_auth_users: authUsers.users.length,
        total_profiles: profiles?.length || 0,
        orphaned_users: orphanedUsers,
        orphaned_count: orphanedUsers.length,
      },
    });

  } catch (error) {
    console.error('GET /api/admin/cleanup-orphaned-users error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar usuarios huérfanos
export async function DELETE(request: NextRequest) {
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

    // Crear cliente admin con service role key
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Obtener todos los usuarios de auth
    const { data: authUsers, error: authError2 } = await adminClient.auth.admin.listUsers();
    
    if (authError2 || !authUsers?.users) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al obtener usuarios de autenticación' },
        { status: 500 }
      );
    }

    // Obtener todos los perfiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');

    if (profilesError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Error al obtener perfiles' },
        { status: 500 }
      );
    }

    const profileIds = new Set(profiles?.map(p => p.id) || []);

    // Encontrar usuarios huérfanos (en auth pero no en profiles)
    const orphanedUsers = authUsers.users.filter(u => !profileIds.has(u.id));

    let deletedCount = 0;
    const errors: any[] = [];

    // Eliminar cada usuario huérfano
    for (const orphanedUser of orphanedUsers) {
      try {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(orphanedUser.id);
        
        if (deleteError) {
          errors.push({
            user_id: orphanedUser.id,
            email: orphanedUser.email,
            error: deleteError.message,
          });
        } else {
          deletedCount++;
        }
      } catch (err: any) {
        errors.push({
          user_id: orphanedUser.id,
          email: orphanedUser.email,
          error: err.message,
        });
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        deleted_count: deletedCount,
        total_orphaned: orphanedUsers.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

  } catch (error) {
    console.error('DELETE /api/admin/cleanup-orphaned-users error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
