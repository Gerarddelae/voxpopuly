-- =========================================================
-- FIX: Agregar políticas RLS faltantes para tabla voters
-- =========================================================
-- Permite a los admins gestionar completamente los votantes asignados
-- a puntos de votación
-- =========================================================

-- Admin puede insertar votantes en puntos de votación
CREATE POLICY "Admin can insert voters"
ON voters
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede actualizar registros de votantes
CREATE POLICY "Admin can update voters"
ON voters
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede eliminar registros de votantes
CREATE POLICY "Admin can delete voters"
ON voters
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede ver todos los votantes
CREATE POLICY "Admin can view all voters"
ON voters
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- =========================================================
-- VERIFICACIÓN
-- =========================================================

-- Ver todas las políticas de voters
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
WHERE tablename = 'voters'
ORDER BY cmd;

-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'voters';
