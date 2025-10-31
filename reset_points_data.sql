-- Reset all points and match data while preserving registered teams
-- This script will clear all tournament data except team registrations

USE krkl_tournament;

-- Delete all spirit marks assessments
DELETE FROM spirit_marks;

-- Delete all house points calculations
DELETE FROM house_points;

-- Delete all match data (scores, games, results)
DELETE FROM matches;

-- Delete team table assignments
DELETE FROM team_table_assignments;

-- Clear table preference columns from teams
UPDATE teams SET mixed_doubles_table_id = NULL, mens_doubles_table_id = NULL;

-- Keep teams table intact (preserves registered teams)
-- Keep rumah_sukan table intact
-- Keep players table intact
-- Keep play_tables table intact

-- Reset AUTO_INCREMENT values for clean start
ALTER TABLE matches AUTO_INCREMENT = 1;
ALTER TABLE spirit_marks AUTO_INCREMENT = 1;
ALTER TABLE house_points AUTO_INCREMENT = 1;
ALTER TABLE team_table_assignments AUTO_INCREMENT = 1;

SELECT 'Database reset complete. All points and match data cleared while preserving team registrations.' as status;