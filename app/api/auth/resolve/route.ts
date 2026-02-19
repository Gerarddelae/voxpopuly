import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/resolve
 * Resuelve un identificador (email o número de documento) al email de autenticación.
 * - Si el identificador contiene '@', se devuelve tal cual (es un email).
 * - Si no, se busca en la tabla profiles por número de documento y se obtiene el email de auth.users.
 *
 * Este endpoint es público (no requiere sesión) porque se usa en la pantalla de login.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier } = body as { identifier: string };

    if (!identifier || !identifier.trim()) {
      return NextResponse.json(
        { success: false, error: 'Debe proporcionar un correo o número de documento' },
        { status: 400 }
      );
    }

    const trimmed = identifier.trim();

    // Si contiene '@', es un email — devolver directamente
    if (trimmed.includes('@')) {
      return NextResponse.json({ success: true, email: trimmed });
    }

    // Es un número de documento — buscar en profiles
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { success: false, error: 'Configuración del servidor incompleta' },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Buscar perfil por documento
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('document', trimmed)
      .maybeSingle();

    if (profileError) {
      console.error('Error buscando perfil por documento:', profileError);
      return NextResponse.json(
        { success: false, error: 'Error al buscar usuario' },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'No se encontró un usuario con ese número de documento' },
        { status: 404 }
      );
    }

    // Obtener el email del usuario en auth.users
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profile.id);

    if (authError || !authUser?.user?.email) {
      console.error('Error obteniendo email de auth.users:', authError);
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener las credenciales del usuario' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email: authUser.user.email,
    });
  } catch (error) {
    console.error('POST /api/auth/resolve error:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
