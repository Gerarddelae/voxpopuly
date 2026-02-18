-- =========================================================
-- MIGRACIÓN: De Planchas (slates) a Candidatos individuales
-- Fecha: 2026-02-18
-- Descripción: Transforma el modelo de votación por plancha
--   a un modelo de tarjetón electoral con candidatos individuales.
--   El votante ahora elige UN candidato en vez de una plancha completa.
-- =========================================================

-- 1. Limpiar datos de prueba
-- =========================================================
DELETE FROM "public"."votes";
DELETE FROM "public"."audit_logs" WHERE action IN ('vote_cast', 'slate_created', 'slate_updated', 'slate_deleted');
DELETE FROM "public"."slate_members";
DELETE FROM "public"."slates";

-- Resetear estado de votantes
UPDATE "public"."voters" SET has_voted = false, voted_at = NULL;

-- 2. Quitar slates de la publicación realtime
-- =========================================================
ALTER PUBLICATION "supabase_realtime" DROP TABLE "public"."slates";

-- 3. Eliminar políticas RLS de votes (tabla antigua)
-- =========================================================
DROP POLICY IF EXISTS "Admin view votes" ON "public"."votes";
DROP POLICY IF EXISTS "No direct insert votes" ON "public"."votes";
DROP POLICY IF EXISTS "Voters can insert their vote" ON "public"."votes";

-- 4. Eliminar políticas RLS de slate_members
-- =========================================================
DROP POLICY IF EXISTS "Admin can delete slate members" ON "public"."slate_members";
DROP POLICY IF EXISTS "Admin can insert slate members" ON "public"."slate_members";
DROP POLICY IF EXISTS "Admin can update slate members" ON "public"."slate_members";
DROP POLICY IF EXISTS "Authenticated users can view slate members" ON "public"."slate_members";

-- 5. Eliminar políticas RLS de slates
-- =========================================================
DROP POLICY IF EXISTS "Admin can delete slates" ON "public"."slates";
DROP POLICY IF EXISTS "Admin can insert slates" ON "public"."slates";
DROP POLICY IF EXISTS "Admin can update slates" ON "public"."slates";
DROP POLICY IF EXISTS "Admin manage slates" ON "public"."slates";
DROP POLICY IF EXISTS "Authenticated view slates" ON "public"."slates";
DROP POLICY IF EXISTS "Authenticated users can view slates" ON "public"."slates";

-- 6. Eliminar índices antiguos
-- =========================================================
DROP INDEX IF EXISTS "idx_votes_slate";
DROP INDEX IF EXISTS "idx_votes_created_at";
DROP INDEX IF EXISTS "idx_slates_voting_point";

-- 7. Eliminar tablas antiguas (orden por dependencias FK)
-- =========================================================
DROP TABLE IF EXISTS "public"."votes";
DROP TABLE IF EXISTS "public"."slate_members";
DROP TABLE IF EXISTS "public"."slates";

-- 8. Eliminar funciones antiguas
-- =========================================================
DROP FUNCTION IF EXISTS "public"."cast_vote"("p_voter_id" "uuid", "p_slate_id" "uuid");
DROP FUNCTION IF EXISTS "public"."increment_slate_votes"("slate_id" "uuid");

-- =========================================================
-- CREAR NUEVO MODELO: candidates + votes
-- =========================================================

-- 9. Crear tabla candidates
-- =========================================================
CREATE TABLE IF NOT EXISTS "public"."candidates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "voting_point_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text",
    "photo_url" "text",
    "vote_count" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE "public"."candidates" OWNER TO "postgres";
ALTER TABLE ONLY "public"."candidates" REPLICA IDENTITY FULL;

ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "unique_candidate_per_point" UNIQUE ("voting_point_id", "full_name");

ALTER TABLE ONLY "public"."candidates"
    ADD CONSTRAINT "candidates_voting_point_id_fkey"
    FOREIGN KEY ("voting_point_id")
    REFERENCES "public"."voting_points"("id") ON DELETE CASCADE;

-- 10. Crear tabla votes (nueva)
-- =========================================================
CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "voter_id" "uuid" NOT NULL,
    "candidate_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE "public"."votes" OWNER TO "postgres";
ALTER TABLE ONLY "public"."votes" REPLICA IDENTITY FULL;

ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "unique_vote_per_voter" UNIQUE ("voter_id");

ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_voter_id_fkey"
    FOREIGN KEY ("voter_id")
    REFERENCES "public"."voters"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_candidate_id_fkey"
    FOREIGN KEY ("candidate_id")
    REFERENCES "public"."candidates"("id") ON DELETE CASCADE;

-- 11. Crear índices
-- =========================================================
CREATE INDEX "idx_candidates_voting_point" ON "public"."candidates" USING "btree" ("voting_point_id");
CREATE INDEX "idx_votes_candidate" ON "public"."votes" USING "btree" ("candidate_id");
CREATE INDEX "idx_votes_created_at" ON "public"."votes" USING "btree" ("created_at");

-- 12. Función: increment_candidate_votes
-- =========================================================
CREATE OR REPLACE FUNCTION "public"."increment_candidate_votes"("candidate_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
  UPDATE candidates
  SET vote_count = vote_count + 1
  WHERE id = candidate_id;
END;
$$;

ALTER FUNCTION "public"."increment_candidate_votes"("candidate_id" "uuid") OWNER TO "postgres";

-- 13. Función: cast_vote (nueva versión para candidatos)
-- =========================================================
CREATE OR REPLACE FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_candidate_id" "uuid")
RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    voter_point UUID;
    candidate_point UUID;
    election_active BOOLEAN;
BEGIN
    -- Validar votante
    SELECT voting_point_id INTO voter_point
    FROM voters
    WHERE id = p_voter_id
    AND profile_id = auth.uid()
    AND has_voted = FALSE;

    IF voter_point IS NULL THEN
        RAISE EXCEPTION 'Invalid voter or already voted';
    END IF;

    -- Validar candidato
    SELECT c.voting_point_id,
           (NOW() BETWEEN e.start_date AND e.end_date AND e.is_active)
    INTO candidate_point, election_active
    FROM candidates c
    JOIN voting_points vp ON vp.id = c.voting_point_id
    JOIN elections e ON e.id = vp.election_id
    WHERE c.id = p_candidate_id;

    IF voter_point <> candidate_point THEN
        RAISE EXCEPTION 'Candidate does not belong to voter point';
    END IF;

    IF NOT election_active THEN
        RAISE EXCEPTION 'Election is not active';
    END IF;

    -- Insertar voto
    INSERT INTO votes (voter_id, candidate_id)
    VALUES (p_voter_id, p_candidate_id);

    -- Actualizar contador
    UPDATE candidates
    SET vote_count = vote_count + 1
    WHERE id = p_candidate_id;

    -- Marcar votante
    UPDATE voters
    SET has_voted = TRUE,
        voted_at = NOW()
    WHERE id = p_voter_id;

    -- Auditoría
    INSERT INTO audit_logs (user_id, action, entity_type, metadata)
    VALUES (
        auth.uid(),
        'vote_cast',
        'vote',
        jsonb_build_object('candidate_id', p_candidate_id)
    );
END;
$$;

ALTER FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_candidate_id" "uuid") OWNER TO "postgres";

-- 14. Habilitar RLS
-- =========================================================
ALTER TABLE "public"."candidates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;

-- 15. Políticas RLS para candidates
-- =========================================================
CREATE POLICY "Authenticated view candidates"
ON "public"."candidates"
FOR SELECT
USING ("auth"."role"() = 'authenticated'::"text");

CREATE POLICY "Admin manage candidates"
ON "public"."candidates"
USING (
    EXISTS (
        SELECT 1 FROM "public"."profiles"
        WHERE "profiles"."id" = "auth"."uid"()
        AND "profiles"."role" = 'admin'::"text"
    )
);

-- 16. Políticas RLS para votes
-- =========================================================
CREATE POLICY "No direct insert votes"
ON "public"."votes"
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Admin view votes"
ON "public"."votes"
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "public"."profiles"
        WHERE "profiles"."id" = "auth"."uid"()
        AND "profiles"."role" = 'admin'::"text"
    )
);

-- 17. Agregar candidates y votes a realtime
-- =========================================================
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."candidates";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."votes";

-- 18. Grants
-- =========================================================
GRANT ALL ON TABLE "public"."candidates" TO "anon";
GRANT ALL ON TABLE "public"."candidates" TO "authenticated";
GRANT ALL ON TABLE "public"."candidates" TO "service_role";

GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";

GRANT ALL ON FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_candidate_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_candidate_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_candidate_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."increment_candidate_votes"("candidate_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_candidate_votes"("candidate_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_candidate_votes"("candidate_id" "uuid") TO "service_role";

-- =========================================================
-- FIN DE LA MIGRACIÓN
-- =========================================================
