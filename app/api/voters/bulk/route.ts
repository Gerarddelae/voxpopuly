import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types/database.types';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

interface CSVVoter {
  full_name: string;
  document: string;
  email: string;
}

interface BulkResult {
  created: number;
  skipped: number;
  errors: Array<{ row: number; document: string; full_name: string; error: string }>;
  createdVoters: Array<{ full_name: string; document: string; email: string; password: string }>;
}

// POST - Carga masiva de votantes desde CSV
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
    const { voters, votingPointId } = body as {
      voters: CSVVoter[];
      votingPointId: string;
    };

    if (!voters || !Array.isArray(voters) || voters.length === 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'No se proporcionaron votantes para cargar' },
        { status: 400 }
      );
    }

    if (!votingPointId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Debe especificar un punto de votación' },
        { status: 400 }
      );
    }

    // Verificar que el punto de votación existe
    const { data: votingPoint, error: vpError } = await supabase
      .from('voting_points')
      .select('id, name, election_id')
      .eq('id', votingPointId)
      .single();

    if (vpError || !votingPoint) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Punto de votación no encontrado' },
        { status: 404 }
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

    const result: BulkResult = {
      created: 0,
      skipped: 0,
      errors: [],
      createdVoters: [],
    };

    // Procesar cada votante
    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];
      const rowNum = i + 1;

      try {
        // Validar campos requeridos
        if (!voter.full_name?.trim()) {
          result.errors.push({
            row: rowNum,
            document: voter.document || '',
            full_name: voter.full_name || '',
            error: 'Nombre completo es requerido',
          });
          continue;
        }

        if (!voter.document?.trim()) {
          result.errors.push({
            row: rowNum,
            document: '',
            full_name: voter.full_name,
            error: 'Número de documento es requerido',
          });
          continue;
        }

        if (!voter.email?.trim()) {
          result.errors.push({
            row: rowNum,
            document: voter.document,
            full_name: voter.full_name,
            error: 'Email es requerido',
          });
          continue;
        }

        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(voter.email.trim())) {
          result.errors.push({
            row: rowNum,
            document: voter.document,
            full_name: voter.full_name,
            error: 'Formato de email inválido',
          });
          continue;
        }

        // Generar PIN numérico aleatorio de 6 dígitos
        const password = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');

        // Verificar si ya existe el documento
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('document', voter.document.trim())
          .maybeSingle();

        if (existingProfile) {
          // Ya existe: solo asignar al punto de votación si no está asignado
          const { error: assignError } = await adminClient
            .from('voters')
            .upsert(
              {
                profile_id: existingProfile.id,
                voting_point_id: votingPointId,
              },
              { onConflict: 'profile_id,voting_point_id', ignoreDuplicates: true }
            );

          if (assignError) {
            result.errors.push({
              row: rowNum,
              document: voter.document,
              full_name: voter.full_name,
              error: `Error al asignar: ${assignError.message}`,
            });
          } else {
            result.skipped++;
          }
          continue;
        }

        // Crear usuario en Auth
        const { data: authData, error: createUserError } = await adminClient.auth.admin.createUser({
          email: voter.email.trim(),
          password,
          email_confirm: true,
          user_metadata: {
            full_name: voter.full_name.trim(),
            document: voter.document.trim(),
          },
        });

        if (createUserError || !authData.user) {
          result.errors.push({
            row: rowNum,
            document: voter.document,
            full_name: voter.full_name,
            error: createUserError?.message || 'Error al crear usuario',
          });
          continue;
        }

        // Verificar si el trigger ya creó el perfil
        const { data: existingAutoProfile } = await adminClient
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle();

        if (existingAutoProfile) {
          // Actualizar perfil existente
          await adminClient
            .from('profiles')
            .update({
              full_name: voter.full_name.trim(),
              document: voter.document.trim(),
              role: 'voter',
            })
            .eq('id', authData.user.id);
        } else {
          // Crear perfil
          const { error: profileError } = await adminClient
            .from('profiles')
            .insert({
              id: authData.user.id,
              full_name: voter.full_name.trim(),
              document: voter.document.trim(),
              role: 'voter',
            });

          if (profileError) {
            await adminClient.auth.admin.deleteUser(authData.user.id);
            result.errors.push({
              row: rowNum,
              document: voter.document,
              full_name: voter.full_name,
              error: `Error al crear perfil: ${profileError.message}`,
            });
            continue;
          }
        }

        // Asignar al punto de votación
        const { error: voterError } = await adminClient
          .from('voters')
          .insert({
            profile_id: authData.user.id,
            voting_point_id: votingPointId,
          });

        if (voterError) {
          result.errors.push({
            row: rowNum,
            document: voter.document,
            full_name: voter.full_name,
            error: `Usuario creado pero error al asignar: ${voterError.message}`,
          });
          continue;
        }

        result.created++;
        result.createdVoters.push({
          full_name: voter.full_name.trim(),
          document: voter.document.trim(),
          email: voter.email.trim(),
          password,
        });
      } catch (err: any) {
        result.errors.push({
          row: rowNum,
          document: voter.document || '',
          full_name: voter.full_name || '',
          error: err.message || 'Error inesperado',
        });
      }
    }

    // Registrar en audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'bulk_voters_upload',
      entity_type: 'voting_point',
      entity_id: votingPointId,
      metadata: {
        total: voters.length,
        created: result.created,
        skipped: result.skipped,
        errors: result.errors.length,
      },
    });

    return NextResponse.json<ApiResponse<BulkResult>>({
      success: true,
      data: result,
      message: `Carga completada: ${result.created} creados, ${result.skipped} ya existentes, ${result.errors.length} errores`,
    });
  } catch (error) {
    console.error('POST /api/voters/bulk error:', error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
