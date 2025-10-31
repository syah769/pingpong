-- Create spirit marks assessment table
CREATE TABLE IF NOT EXISTS spirit_marks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rumah_id INT NOT NULL,
    tournament_date DATE NOT NULL,
    assessor_name VARCHAR(255) NOT NULL,
    sportsmanship_score DECIMAL(4,2) DEFAULT 0.00 COMMENT 'Score out of 0.40',
    teamwork_score DECIMAL(4,2) DEFAULT 0.00 COMMENT 'Score out of 0.30',
    seat_arrangement_score DECIMAL(4,2) DEFAULT 0.00 COMMENT 'Score out of 0.30',
    total_score DECIMAL(4,2) DEFAULT 0.00 COMMENT 'Total out of 1.00',
    sportsmanship_notes TEXT DEFAULT NULL COMMENT 'Comments on sportsmanship behavior',
    teamwork_notes TEXT DEFAULT NULL COMMENT 'Comments on team cooperation',
    seat_arrangement_notes TEXT DEFAULT NULL COMMENT 'Comments on seating organization',
    overall_notes TEXT DEFAULT NULL COMMENT 'Overall assessment comments',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rumah_id) REFERENCES rumah_sukan(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rumah_date (rumah_id, tournament_date)
);

-- Add house points calculation table
CREATE TABLE IF NOT EXISTS house_points (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rumah_id INT NOT NULL,
    tournament_date DATE NOT NULL,
    placement_points INT DEFAULT 0 COMMENT 'Points from final placement (1st=3, 2nd=2, 3rd=1)',
    participation_points INT DEFAULT 0 COMMENT '1 point if both categories fielded',
    match_win_points INT DEFAULT 0 COMMENT '1 point per match win',
    spirit_points DECIMAL(4,2) DEFAULT 0.00 COMMENT 'Spirit marks up to 1 point',
    total_points DECIMAL(6,2) DEFAULT 0.00 COMMENT 'Total house points',
    final_placement INT DEFAULT NULL COMMENT '1=1st place, 2=2nd place, 3=3rd place, etc.',
    tie_breaker_notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (rumah_id) REFERENCES rumah_sukan(id) ON DELETE CASCADE,
    UNIQUE KEY unique_rumah_points_date (rumah_id, tournament_date)
);

-- Create spirit marks assessment criteria reference table
CREATE TABLE IF NOT EXISTS spirit_criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('sportsmanship', 'teamwork', 'seat_arrangement') NOT NULL,
    criteria_description TEXT NOT NULL,
    max_score DECIMAL(4,2) NOT NULL,
    weight_percentage DECIMAL(5,2) NOT NULL COMMENT 'Percentage weight in total spirit score',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default assessment criteria
INSERT INTO spirit_criteria (category, criteria_description, max_score, weight_percentage, sort_order) VALUES
('sportsmanship', 'Respects officials, referees, and fellow players', 0.10, 10.00, 1),
('sportsmanship', 'Demonstrates fair play and discipline', 0.10, 10.00, 2),
('sportsmanship', 'Accepts decisions gracefully', 0.10, 10.00, 3),
('sportsmanship', 'No unsportsmanlike conduct', 0.10, 10.00, 4),

('teamwork', 'Supports and encourages team members', 0.10, 10.00, 1),
('teamwork', 'Shows cooperation and coordination', 0.10, 10.00, 2),
('teamwork', 'Demonstrates team unity and spirit', 0.10, 10.00, 3),

('seat_arrangement', 'Organized seating area for rumah members', 0.15, 15.00, 1),
('seat_arrangement', 'Clean and tidy rumah space', 0.15, 15.00, 2);