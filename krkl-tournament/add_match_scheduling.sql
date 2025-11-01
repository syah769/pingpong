-- Migration: Add match scheduling support
-- Add match_time column to matches table

ALTER TABLE matches
ADD COLUMN match_time DATETIME DEFAULT NULL AFTER table_id;

-- Update existing matches with default schedule times based on T&C
-- This is optional - matches can be scheduled when generated
