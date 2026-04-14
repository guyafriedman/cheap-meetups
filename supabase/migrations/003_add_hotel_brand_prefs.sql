-- Add hotel brand preferences and downtown toggle to trips table
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS hotel_mode text NOT NULL DEFAULT 'stars',
  ADD COLUMN IF NOT EXISTS hotel_brands text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS downtown_only boolean NOT NULL DEFAULT true;
