-- Migration: Add missing columns to schedule_blocks table
-- Run this in Supabase SQL Editor

-- Add child_id column
ALTER TABLE schedule_blocks
ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES child_profiles(id) ON DELETE CASCADE;

-- Add family_id column
ALTER TABLE schedule_blocks
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE CASCADE;

-- Change day_of_week to VARCHAR if it's INTEGER (to support 'monday', 'tuesday', etc.)
-- First check if it's INTEGER, then alter
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'schedule_blocks'
        AND column_name = 'day_of_week'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE schedule_blocks ALTER COLUMN day_of_week TYPE VARCHAR(20);
    END IF;
END $$;

-- Add is_recurring column
ALTER TABLE schedule_blocks
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT true;

-- Add is_active column
ALTER TABLE schedule_blocks
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_child_id ON schedule_blocks(child_id);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_active ON schedule_blocks(is_active);
