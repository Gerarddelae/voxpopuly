-- ==================================================================
-- FIX: Políticas RLS para votantes (SIN recursión)
-- ==================================================================
-- PROBLEMA: Las políticas anteriores creaban recursión infinita:
--   voters RLS → JOIN voting_points → voting_points RLS → 
--   EXISTS(SELECT FROM voters) → voters RLS → LOOP!
--
-- SOLUCIÓN: 
--   1. Dar a votantes acceso a su propio registro con policy simple
--   2. Las APIs usan service_role para JOINs con voting_points/elections
--      (ya se verifica auth+role en código antes de hacer la consulta)
-- ==================================================================

-- ============================================
-- PASO 1: ELIMINAR políticas problemáticas (si existen)
-- ============================================

DROP POLICY IF EXISTS "Voters can view their assigned voting point" ON voting_points;
DROP POLICY IF EXISTS "Voters can view their election" ON elections;

-- ============================================
-- PASO 2: Política simple en VOTERS (sin JOINs a otras tablas)
-- ============================================

-- Votante puede ver SU PROPIO registro (solo chequea profile_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'voters' AND policyname = 'Voters can view own record'
  ) THEN
    CREATE POLICY "Voters can view own record"
    ON voters FOR SELECT
    TO authenticated
    USING (profile_id = auth.uid());
  END IF;
END$$;

-- Votante puede actualizar SU PROPIO registro (para has_voted, voted_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'voters' AND policyname = 'Voters can update own record'
  ) THEN
    CREATE POLICY "Voters can update own record"
    ON voters FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (profile_id = auth.uid());
  END IF;
END$$;

-- ============================================
-- PASO 3: Política en SLATES para votantes
-- ============================================

-- Votantes pueden ver planchas (necesario para la consulta de votación)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'slates' AND policyname = 'Authenticated users can view slates'
  ) THEN
    CREATE POLICY "Authenticated users can view slates"
    ON slates FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END$$;

-- ============================================
-- PASO 4: Política en VOTES para votantes
-- ============================================

-- Votante puede insertar su voto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'votes' AND policyname = 'Voters can insert their vote'
  ) THEN
    CREATE POLICY "Voters can insert their vote"
    ON votes FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM voters
        WHERE voters.id = votes.voter_id
        AND voters.profile_id = auth.uid()
        AND voters.has_voted = false
      )
    );
  END IF;
END$$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies
WHERE tablename IN ('voters', 'voting_points', 'elections', 'slates', 'votes')
ORDER BY tablename, policyname;
