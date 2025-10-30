-- Update existing tables to make them more flexible
UPDATE play_tables
SET assigned_category = 'Both'
WHERE name IN ('Table A', 'Table B');

-- Modify the play_tables table to support flexible assignment
ALTER TABLE play_tables
MODIFY COLUMN assigned_category ENUM('Mixed Doubles', 'Men\'s Doubles', 'Both') DEFAULT 'Both';

-- Add a new column for active assignment (current usage)
ALTER TABLE play_tables
ADD COLUMN current_assignment ENUM('Mixed Doubles', 'Men\'s Doubles', 'Both', 'Available') DEFAULT 'Available' AFTER assigned_category;

-- Add a column for priority assignment
ALTER TABLE play_tables
ADD COLUMN priority_assignment ENUM('Mixed Doubles', 'Men\'s Doubles', 'None') DEFAULT 'None' AFTER sort_order;

-- Add notes column for table assignment notes
ALTER TABLE play_tables
ADD COLUMN notes TEXT DEFAULT NULL AFTER current_assignment;

-- Update tables to be flexible by default
UPDATE play_tables
SET
    assigned_category = 'Both',
    current_assignment = 'Available',
    priority_assignment = 'None',
    notes = 'Flexible table - can be assigned to either category'
WHERE name IN ('Table A', 'Table B');

-- Add more tables if needed (optional)
INSERT INTO play_tables (name, assigned_category, sort_order, current_assignment, priority_assignment, notes) VALUES
('Table C', 'Both', 3, 'Available', 'None', 'Flexible table - can be assigned to either category'),
('Table D', 'Both', 4, 'Available', 'None', 'Flexible table - can be assigned to either category');