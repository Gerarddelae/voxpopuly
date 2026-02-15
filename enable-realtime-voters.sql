-- Enable realtime for voters table to allow delegates to see real-time voting updates
-- Run in Supabase SQL Editor

-- 1) Ensure publication exists and add voters table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'voters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE voters;
  END IF;
END$$;

-- 2) Policy: delegates can view voters of their assigned voting point (needed for realtime RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voters' AND policyname = 'Delegates can view voters of their point'
  ) THEN
    CREATE POLICY "Delegates can view voters of their point"
    ON voters FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM voting_points vp
        WHERE vp.id = voters.voting_point_id
        AND vp.delegate_id = auth.uid()
      )
    );
  END IF;
END$$;

-- 3) Verification queries
-- Check if voters table is in realtime publication
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND schemaname = 'public' 
AND tablename = 'voters';

-- Check policies on voters table
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'voters'
ORDER BY policyname;
