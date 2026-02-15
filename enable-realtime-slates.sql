-- Enable realtime for slates and allow delegates to read their point's slates
-- Run in Supabase SQL Editor

-- 1) Ensure publication exists and add slates table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'slates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE slates;
  END IF;
END$$;

-- 2) Policy: delegates can view slates of their assigned voting point (needed for realtime RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slates' AND policyname = 'Delegates can view slates of their point'
  ) THEN
    CREATE POLICY "Delegates can view slates of their point"
    ON slates FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM voting_points vp
        WHERE vp.id = slates.voting_point_id
        AND vp.delegate_id = auth.uid()
      )
    );
  END IF;
END$$;

-- 3) Optional: allow delegates to view their voting point (for complementary UI data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'voting_points' AND policyname = 'Delegates can view own voting point'
  ) THEN
    CREATE POLICY "Delegates can view own voting point"
    ON voting_points FOR SELECT TO authenticated
    USING (delegate_id = auth.uid());
  END IF;
END$$;

-- Verification
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE tablename IN ('slates','voting_points')
ORDER BY tablename, policyname;
