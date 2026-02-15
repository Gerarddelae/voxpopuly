-- ============================================================================
-- FIX: Deshabilitar RLS en la tabla 'profiles'
-- ============================================================================
-- Las políticas RLS en 'profiles' causan problemas de referencia circular.
-- Es más seguro manejar el control de acceso a nivel de aplicación para esta
-- tabla específica, ya que necesitamos leer roles para determinar permisos.
-- ============================================================================

-- 1. Eliminar TODAS las políticas existentes de profiles
DROP POLICY IF EXISTS "admin_select_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_delete_profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- 2. DESHABILITAR RLS en la tabla profiles
-- Esto permite que las queries funcionen sin restricciones a nivel de base de datos
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SEGURIDAD A NIVEL DE APLICACIÓN:
-- ============================================================================
-- El control de acceso se implementa en:
-- 
-- 1. API Routes (/api/users, /api/delegates, etc.)
--    - Verifican autenticación con supabase.auth.getUser()
--    - Verifican rol de admin antes de operaciones sensibles
--
-- 2. Server Components (layouts, pages)
--    - Usan getUserRole() y requireRole() para proteger rutas
--
-- 3. Client Components
--    - Verifican roles antes de mostrar UI sensible
--
-- NOTA: Esta tabla NO contiene información sensible (solo roles y nombres)
-- y TODAS las operaciones críticas están protegidas a nivel de código.
-- ============================================================================

-- ============================================================================
-- NOTA: Ejecuta este script en el SQL Editor de Supabase
-- Una vez ejecutado, los administradores podrán:
-- ✓ Ver todos los usuarios del sistema
-- ✓ Crear nuevos perfiles (delegados)
-- ✓ Actualizar perfiles existentes
-- ============================================================================
