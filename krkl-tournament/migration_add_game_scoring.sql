-- Migration script to add game-by-game scoring support
-- Run this script to update existing databases

-- Add new columns for individual game scores
ALTER TABLE matches
ADD COLUMN game1_team1 INT DEFAULT 0 AFTER score2,
ADD COLUMN game1_team2 INT DEFAULT 0 AFTER game1_team1,
ADD COLUMN game2_team1 INT DEFAULT 0 AFTER game1_team2,
ADD COLUMN game2_team2 INT DEFAULT 0 AFTER game2_team1,
ADD COLUMN game3_team1 INT DEFAULT 0 AFTER game2_team2,
ADD COLUMN game3_team2 INT DEFAULT 0 AFTER game3_team1,
ADD COLUMN game4_team1 INT DEFAULT 0 AFTER game3_team2,
ADD COLUMN game4_team2 INT DEFAULT 0 AFTER game4_team1,
ADD COLUMN game5_team1 INT DEFAULT 0 AFTER game4_team2,
ADD COLUMN game5_team2 INT DEFAULT 0 AFTER game5_team1,
ADD COLUMN current_game INT DEFAULT 1 AFTER game5_team2;

-- Update status enum to include 'playing'
ALTER TABLE matches
MODIFY COLUMN status ENUM('pending', 'playing', 'completed', 'cancelled') DEFAULT 'pending';

-- Add completed_at column if it doesn't exist
ALTER TABLE matches
ADD COLUMN completed_at TIMESTAMP NULL AFTER timestamp;