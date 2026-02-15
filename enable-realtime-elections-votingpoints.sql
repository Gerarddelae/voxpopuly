-- Enable realtime for elections and voting_points tables
-- This allows admin reports to update in real-time when elections or voting points change
-- Run in Supabase SQL Editor

-- 1) Ensure publication exists and add tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- Add elections table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'elections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE elections;
  END IF;

  -- Add voting_points table
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'voting_points'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE voting_points;
  END IF;
END$$;

-- 2) Set REPLICA IDENTITY FULL for filtering support
ALTER TABLE elections REPLICA IDENTITY FULL;
ALTER TABLE voting_points REPLICA IDENTITY FULL;

-- 3) Policies: admins can view all elections and voting points (needed for realtime RLS)
-- These policies should already exist for admin access, but we verify them

-- Elections policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'elections' AND policyname = 'Admins can view all elections'
  ) THEN
    CREATE POLICY "Admins can view all elections"
    ON elections FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );
  END IF;
END$$;

-- Voting points policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voting_points' AND policyname = 'Admins can view all voting points'
  ) THEN
    CREATE POLICY "Admins can view all voting points"
    ON voting_points FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
      )
    );
  END IF;
END$$;

-- 4) Verification queries
-- Check if tables are in realtime publication
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename IN ('elections', 'voting_points')
ORDER BY tablename;

-- Check REPLICA IDENTITY
SELECT c.relname as table_name, 
       CASE c.relreplident 
         WHEN 'd' THEN 'DEFAULT'
         WHEN 'n' THEN 'NOTHING'
         WHEN 'f' THEN 'FULL'
         WHEN 'i' THEN 'INDEX'
       END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND c.relname IN ('elections', 'voting_points')
ORDER BY c.relname;

-- Check policies
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename IN ('elections', 'voting_points')
ORDER BY tablename, policyname;
