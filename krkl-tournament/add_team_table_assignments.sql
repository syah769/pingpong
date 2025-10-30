-- Create team table assignments table
CREATE TABLE IF NOT EXISTS team_table_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    category ENUM('Mixed Doubles', 'Men\'s Doubles') NOT NULL,
    preferred_table_id INT DEFAULT NULL,
    table_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (preferred_table_id) REFERENCES play_tables(id) ON DELETE SET NULL,
    UNIQUE KEY unique_team_category (team_id, category)
);

-- Add a table preference column to teams table for quick reference
ALTER TABLE teams ADD COLUMN mixed_doubles_table_id INT DEFAULT NULL AFTER mens_pair_player2;
ALTER TABLE teams ADD COLUMN mens_doubles_table_id INT DEFAULT NULL AFTER mixed_doubles_table_id;

-- Add foreign key constraints for the new columns
ALTER TABLE teams ADD CONSTRAINT teams_mixed_table_fk FOREIGN KEY (mixed_doubles_table_id) REFERENCES play_tables(id) ON DELETE SET NULL;
ALTER TABLE teams ADD CONSTRAINT teams_mens_table_fk FOREIGN KEY (mens_doubles_table_id) REFERENCES play_tables(id) ON DELETE SET NULL;