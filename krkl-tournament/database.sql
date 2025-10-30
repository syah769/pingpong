CREATE DATABASE IF NOT EXISTS krkl_tournament;
USE krkl_tournament;

-- Rumah Sukan table
CREATE TABLE IF NOT EXISTS rumah_sukan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE IF NOT EXISTS players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    gender ENUM('M', 'F') NOT NULL,
    rumah_sukan_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rumah_sukan_id) REFERENCES rumah_sukan(id) ON DELETE CASCADE
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rumah_sukan_id INT NOT NULL,
    mixed_pair_player1 VARCHAR(100),
    mixed_pair_player2 VARCHAR(100),
    mens_pair_player1 VARCHAR(100),
    mens_pair_player2 VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rumah_sukan_id) REFERENCES rumah_sukan(id) ON DELETE CASCADE
);

-- Team Players junction table
CREATE TABLE IF NOT EXISTS team_players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    player_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Play tables configuration
CREATE TABLE IF NOT EXISTS play_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    assigned_category ENUM('Mixed Doubles', 'Men\'s Doubles') DEFAULT 'Mixed Doubles',
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS matches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_number INT NOT NULL,
    category ENUM('Mixed Doubles', 'Men\'s Doubles') NOT NULL,
    round INT DEFAULT 1,
    team1_id INT NOT NULL,
    team2_id INT NOT NULL,
    pair1_player1 VARCHAR(100),
    pair1_player2 VARCHAR(100),
    pair2_player1 VARCHAR(100),
    pair2_player2 VARCHAR(100),
    score1 INT DEFAULT 0,
    score2 INT DEFAULT 0,
    table_id INT DEFAULT NULL,
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    timestamp TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team1_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (team2_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES play_tables(id) ON DELETE SET NULL
);

-- Insert default Rumah Sukan
INSERT INTO rumah_sukan (id, name, color, color_hex) VALUES
(1, 'Rumah Merah', 'bg-red-500', '#ef4444'),
(2, 'Rumah Biru', 'bg-blue-500', '#3b82f6'),
(3, 'Rumah Hijau', 'bg-green-500', '#22c55e'),
(4, 'Rumah Kuning', 'bg-yellow-500', '#eab308');

INSERT INTO play_tables (name, assigned_category, sort_order) VALUES
('Table A', 'Mixed Doubles', 1),
('Table B', 'Men\'s Doubles', 2);
