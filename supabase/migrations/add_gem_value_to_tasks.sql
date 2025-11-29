-- Add gem_value column to daily_tasks table
-- This allows bonus tasks to reward gems instead of or in addition to stars

ALTER TABLE daily_tasks
ADD COLUMN IF NOT EXISTS gem_value INTEGER DEFAULT 0 CHECK (gem_value >= 0);
