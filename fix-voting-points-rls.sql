-- =========================================================
-- FIX: Políticas de RLS para voting_points, slates y slate_members
-- Ejecuta este script en Supabase SQL Editor
-- =========================================================

-- =========================================================
-- VOTING_POINTS: Agregar políticas de gestión para admin
-- =========================================================

-- Admin puede insertar puntos de votación
CREATE POLICY "Admin can insert voting points"
ON voting_points
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede actualizar puntos de votación
CREATE POLICY "Admin can update voting points"
ON voting_points
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede eliminar puntos de votación
CREATE POLICY "Admin can delete voting points"
ON voting_points
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- =========================================================
-- SLATES: Agregar políticas de gestión para admin
-- =========================================================

-- Admin puede insertar planchas
CREATE POLICY "Admin can insert slates"
ON slates
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede actualizar planchas
CREATE POLICY "Admin can update slates"
ON slates
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede eliminar planchas
CREATE POLICY "Admin can delete slates"
ON slates
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- =========================================================
-- SLATE_MEMBERS: Agregar políticas de gestión para admin
-- =========================================================

-- Admin puede insertar miembros de planchas
CREATE POLICY "Admin can insert slate members"
ON slate_members
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede actualizar miembros de planchas
CREATE POLICY "Admin can update slate members"
ON slate_members
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- Admin puede eliminar miembros de planchas
CREATE POLICY "Admin can delete slate members"
ON slate_members
FOR DELETE
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

-- Ver todas las políticas de voting_points
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
WHERE tablename IN ('voting_points', 'slates', 'slate_members')
ORDER BY tablename, cmd;

-- =========================================================
-- NOTAS
-- =========================================================
-- Después de ejecutar este script, los administradores podrán:
-- 1. Crear puntos de votación
-- 2. Actualizar puntos de votación
-- 3. Eliminar puntos de votación
-- 4. Crear planchas
-- 5. Agregar candidatos a planchas
-- 6. Modificar y eliminar planchas y candidatos
--
-- Los delegados seguirán teniendo acceso de solo lectura a sus puntos asignados.
-- =========================================================
