


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_slate_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    voter_point UUID;
    slate_point UUID;
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

    -- Validar plancha
    SELECT s.voting_point_id, 
           (NOW() BETWEEN e.start_date AND e.end_date AND e.is_active)
    INTO slate_point, election_active
    FROM slates s
    JOIN voting_points vp ON vp.id = s.voting_point_id
    JOIN elections e ON e.id = vp.election_id
    WHERE s.id = p_slate_id;

    IF voter_point <> slate_point THEN
        RAISE EXCEPTION 'Slate does not belong to voter point';
    END IF;

    IF NOT election_active THEN
        RAISE EXCEPTION 'Election is not active';
    END IF;

    -- Insertar voto
    INSERT INTO votes (voter_id, slate_id)
    VALUES (p_voter_id, p_slate_id);

    -- Actualizar contador
    UPDATE slates
    SET vote_count = vote_count + 1
    WHERE id = p_slate_id;

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
        jsonb_build_object('slate_id', p_slate_id)
    );
END;
$$;


ALTER FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_slate_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_delegate_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.delegate_id IS NOT NULL AND
       NOT EXISTS (
           SELECT 1 FROM profiles
           WHERE id = NEW.delegate_id
           AND role = 'delegate'
       )
    THEN
        RAISE EXCEPTION 'User is not a delegate';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_delegate_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    document,
    full_name,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'document', 'N/A'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'voter'
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_slate_votes"("slate_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE slates
  SET vote_count = vote_count + 1
  WHERE id = slate_id;
END;
$$;


ALTER FUNCTION "public"."increment_slate_votes"("slate_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "metadata" "jsonb",
    "ip_address" "inet",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."elections" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "start_date" timestamp without time zone NOT NULL,
    "end_date" timestamp without time zone NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "valid_election_dates" CHECK (("start_date" < "end_date"))
);

ALTER TABLE ONLY "public"."elections" REPLICA IDENTITY FULL;


ALTER TABLE "public"."elections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "document" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'voter'::"text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "valid_role" CHECK (("role" = ANY (ARRAY['voter'::"text", 'admin'::"text", 'delegate'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slate_members" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "slate_id" "uuid",
    "full_name" "text" NOT NULL,
    "role" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "photo_url" "text"
);


ALTER TABLE "public"."slate_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."slates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "voting_point_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "vote_count" integer DEFAULT 0,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."slates" REPLICA IDENTITY FULL;


ALTER TABLE "public"."slates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voters" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "voting_point_id" "uuid" NOT NULL,
    "has_voted" boolean DEFAULT false,
    "voted_at" timestamp without time zone,
    "created_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."voters" REPLICA IDENTITY FULL;


ALTER TABLE "public"."voters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."votes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "voter_id" "uuid" NOT NULL,
    "slate_id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."votes" REPLICA IDENTITY FULL;


ALTER TABLE "public"."votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."voting_points" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "election_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "delegate_id" "uuid",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);

ALTER TABLE ONLY "public"."voting_points" REPLICA IDENTITY FULL;


ALTER TABLE "public"."voting_points" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."elections"
    ADD CONSTRAINT "elections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_document_key" UNIQUE ("document");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slate_members"
    ADD CONSTRAINT "slate_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."slates"
    ADD CONSTRAINT "slates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voting_points"
    ADD CONSTRAINT "unique_delegate_per_election" UNIQUE ("election_id", "delegate_id");



ALTER TABLE ONLY "public"."slates"
    ADD CONSTRAINT "unique_slate_per_point" UNIQUE ("voting_point_id", "name");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "unique_vote_per_voter" UNIQUE ("voter_id");



ALTER TABLE ONLY "public"."voters"
    ADD CONSTRAINT "unique_voter_per_point" UNIQUE ("profile_id", "voting_point_id");



ALTER TABLE ONLY "public"."voters"
    ADD CONSTRAINT "voters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voting_points"
    ADD CONSTRAINT "voting_points_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_user" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_elections_active" ON "public"."elections" USING "btree" ("is_active");



CREATE INDEX "idx_elections_dates" ON "public"."elections" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_slates_voting_point" ON "public"."slates" USING "btree" ("voting_point_id");



CREATE INDEX "idx_voters_has_voted" ON "public"."voters" USING "btree" ("has_voted");



CREATE INDEX "idx_voters_point" ON "public"."voters" USING "btree" ("voting_point_id");



CREATE INDEX "idx_voters_profile" ON "public"."voters" USING "btree" ("profile_id");



CREATE INDEX "idx_votes_created_at" ON "public"."votes" USING "btree" ("created_at");



CREATE INDEX "idx_votes_slate" ON "public"."votes" USING "btree" ("slate_id");



CREATE INDEX "idx_voting_points_delegate" ON "public"."voting_points" USING "btree" ("delegate_id");



CREATE INDEX "idx_voting_points_election" ON "public"."voting_points" USING "btree" ("election_id");



CREATE OR REPLACE TRIGGER "check_delegate_role_trigger" BEFORE INSERT OR UPDATE ON "public"."voting_points" FOR EACH ROW EXECUTE FUNCTION "public"."check_delegate_role"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."elections"
    ADD CONSTRAINT "elections_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slate_members"
    ADD CONSTRAINT "slate_members_slate_id_fkey" FOREIGN KEY ("slate_id") REFERENCES "public"."slates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."slates"
    ADD CONSTRAINT "slates_voting_point_id_fkey" FOREIGN KEY ("voting_point_id") REFERENCES "public"."voting_points"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voters"
    ADD CONSTRAINT "voters_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voters"
    ADD CONSTRAINT "voters_voting_point_id_fkey" FOREIGN KEY ("voting_point_id") REFERENCES "public"."voting_points"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_slate_id_fkey" FOREIGN KEY ("slate_id") REFERENCES "public"."slates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."votes"
    ADD CONSTRAINT "votes_voter_id_fkey" FOREIGN KEY ("voter_id") REFERENCES "public"."voters"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voting_points"
    ADD CONSTRAINT "voting_points_delegate_id_fkey" FOREIGN KEY ("delegate_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."voting_points"
    ADD CONSTRAINT "voting_points_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "public"."elections"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can delete slate members" ON "public"."slate_members" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can delete slates" ON "public"."slates" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can delete voters" ON "public"."voters" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can delete voting points" ON "public"."voting_points" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can insert slate members" ON "public"."slate_members" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can insert slates" ON "public"."slates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can insert voters" ON "public"."voters" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can insert voting points" ON "public"."voting_points" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can update slate members" ON "public"."slate_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can update slates" ON "public"."slates" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can update voters" ON "public"."voters" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can update voting points" ON "public"."voting_points" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin can view all voters" ON "public"."voters" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin manage elections" ON "public"."elections" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin manage slates" ON "public"."slates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin view all points" ON "public"."voting_points" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admin view votes" ON "public"."votes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Authenticated can view elections" ON "public"."elections" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view slate members" ON "public"."slate_members" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view slates" ON "public"."slates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated view slates" ON "public"."slates" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Delegate view own point" ON "public"."voting_points" FOR SELECT USING (("delegate_id" = "auth"."uid"()));



CREATE POLICY "Delegate view voters" ON "public"."voters" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."voting_points" "vp"
  WHERE (("vp"."id" = "voters"."voting_point_id") AND ("vp"."delegate_id" = "auth"."uid"())))));



CREATE POLICY "Delegates can view voters of their point" ON "public"."voters" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."voting_points" "vp"
  WHERE (("vp"."id" = "voters"."voting_point_id") AND ("vp"."delegate_id" = "auth"."uid"())))));



CREATE POLICY "No direct insert votes" ON "public"."votes" FOR INSERT WITH CHECK (false);



CREATE POLICY "Voter can view own record" ON "public"."voters" FOR SELECT USING (("profile_id" = "auth"."uid"()));



CREATE POLICY "Voters can insert their vote" ON "public"."votes" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."voters"
  WHERE (("voters"."id" = "votes"."voter_id") AND ("voters"."profile_id" = "auth"."uid"()) AND ("voters"."has_voted" = false)))));



CREATE POLICY "Voters can update own record" ON "public"."voters" FOR UPDATE TO "authenticated" USING (("profile_id" = "auth"."uid"())) WITH CHECK (("profile_id" = "auth"."uid"()));



CREATE POLICY "Voters can view own record" ON "public"."voters" FOR SELECT TO "authenticated" USING (("profile_id" = "auth"."uid"()));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."elections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."slate_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."slates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_view_own_profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."voters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voting_points" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."elections";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."slates";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."voters";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."voting_points";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_slate_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_slate_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cast_vote"("p_voter_id" "uuid", "p_slate_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_delegate_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_delegate_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_delegate_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_slate_votes"("slate_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_slate_votes"("slate_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_slate_votes"("slate_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."elections" TO "anon";
GRANT ALL ON TABLE "public"."elections" TO "authenticated";
GRANT ALL ON TABLE "public"."elections" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."slate_members" TO "anon";
GRANT ALL ON TABLE "public"."slate_members" TO "authenticated";
GRANT ALL ON TABLE "public"."slate_members" TO "service_role";



GRANT ALL ON TABLE "public"."slates" TO "anon";
GRANT ALL ON TABLE "public"."slates" TO "authenticated";
GRANT ALL ON TABLE "public"."slates" TO "service_role";



GRANT ALL ON TABLE "public"."voters" TO "anon";
GRANT ALL ON TABLE "public"."voters" TO "authenticated";
GRANT ALL ON TABLE "public"."voters" TO "service_role";



GRANT ALL ON TABLE "public"."votes" TO "anon";
GRANT ALL ON TABLE "public"."votes" TO "authenticated";
GRANT ALL ON TABLE "public"."votes" TO "service_role";



GRANT ALL ON TABLE "public"."voting_points" TO "anon";
GRANT ALL ON TABLE "public"."voting_points" TO "authenticated";
GRANT ALL ON TABLE "public"."voting_points" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































