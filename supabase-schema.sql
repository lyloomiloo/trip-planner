-- Supabase table for trip cloud sync
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  passphrase_hash TEXT NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Allow public read (for share links), writes go through API routes with service role key
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- Anyone can read (view-only share)
CREATE POLICY "Public read" ON trips FOR SELECT USING (true);

-- Only service role can insert/update (API routes handle passphrase verification)
-- No client-side write policies needed since we use the service role key server-side
