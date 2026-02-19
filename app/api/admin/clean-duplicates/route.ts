import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/database.types';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/clean-duplicates
 * Limpia documentos duplicados en la tabla profiles.
 * Para cada grupo de duplicados, mantiene el registro más reciente y elimina los demás.
 * Solo accesible por admins.
 */
export async function POST() {
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

    // 1. Encontrar documentos duplicados
    const { data: allProfiles, error: fetchError } = await adminClient
      .from('profiles')
      .select('id, document, full_name, role, created_at')
      .order('created_at', { ascending: false });

    if (fetchError) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: `Error al consultar perfiles: ${fetchError.message}` },
        { status: 500 }
      );
    }

    // Agrupar por documento
    const documentGroups = new Map<string, typeof allProfiles>();
    for (const p of allProfiles || []) {
      if (!p.document || p.document === 'N/A') continue;
      const existing = documentGroups.get(p.document) || [];
      existing.push(p);
      documentGroups.set(p.document, existing);
    }

    // Filtrar solo duplicados
    const duplicates = Array.from(documentGroups.entries()).filter(
      ([, profiles]) => profiles.length > 1
    );

    if (duplicates.length === 0) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: { duplicatesFound: 0, deleted: 0, details: [] },
        message: 'No se encontraron documentos duplicados',
      });
    }

    const deletedUsers: string[] = [];
    const details: Array<{ document: string; kept: string; deleted: string[] }> = [];

    for (const [document, profiles] of duplicates) {
      // El primero es el más reciente (ya está ordenado DESC por created_at)
      const [keep, ...toDelete] = profiles;

      const deletedIds: string[] = [];

      for (const dup of toDelete) {
        // No eliminar admins ni delegates
        if (dup.role === 'admin' || dup.role === 'delegate') continue;

        try {
          // Eliminar voters asociados al perfil
          await adminClient
            .from('voters')
            .delete()
            .eq('profile_id', dup.id);

          // Eliminar el usuario de auth (esto cascadeará al profile)
          const { error: deleteError } = await adminClient.auth.admin.deleteUser(dup.id);
          if (deleteError) {
            console.error(`Error eliminando usuario ${dup.id}:`, deleteError);
            // Si falla borrar auth user, intentar borrar solo el profile
            await adminClient.from('profiles').delete().eq('id', dup.id);
          }

          deletedIds.push(dup.id);
          deletedUsers.push(dup.id);
        } catch (err) {
          console.error(`Error procesando duplicado ${dup.id}:`, err);
        }
      }

      details.push({
        document,
        kept: `${keep.full_name} (${keep.id})`,
        deleted: deletedIds,
      });
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        duplicatesFound: duplicates.length,
        deleted: deletedUsers.length,
        details,
      },
      message: `Se encontraron ${duplicates.length} documentos duplicados. Se eliminaron ${deletedUsers.length} registros duplicados.`,
    });
  } catch (error) {
    console.error('POST /api/admin/clean-duplicates error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
