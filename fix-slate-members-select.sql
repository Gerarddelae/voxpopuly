-- FIX: Agregar política SELECT faltante para slate_members
-- =========================================================
-- Esta política permite que todos los usuarios autenticados puedan
-- leer los miembros de las planchas (necesario para mostrarlos en la UI)
-- =========================================================

-- Permitir a usuarios autenticados leer miembros de planchas
CREATE POLICY "Authenticated users can view slate members"
ON slate_members
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- =========================================================
-- VERIFICACIÓN
-- =========================================================

-- Ver todas las políticas de slate_members
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'slate_members'
ORDER BY cmd;

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'slate_members';
