<?php
// Database reset script
require_once 'config.php';

try {
    // Start transaction
    $conn->begin_transaction();

    // Delete all spirit marks assessments
    $conn->query("DELETE FROM spirit_marks");

    // Delete all house points calculations
    $conn->query("DELETE FROM house_points");

    // Delete all match data
    $conn->query("DELETE FROM matches");

    // Delete team table assignments
    $conn->query("DELETE FROM team_table_assignments");

    // Clear table preference columns from teams
    $conn->query("UPDATE teams SET mixed_doubles_table_id = NULL, mens_doubles_table_id = NULL");

    // Reset AUTO_INCREMENT values
    $conn->query("ALTER TABLE matches AUTO_INCREMENT = 1");
    $conn->query("ALTER TABLE spirit_marks AUTO_INCREMENT = 1");
    $conn->query("ALTER TABLE house_points AUTO_INCREMENT = 1");
    $conn->query("ALTER TABLE team_table_assignments AUTO_INCREMENT = 1");

    // Commit transaction
    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Database reset complete. All points and match data cleared while preserving team registrations.'
    ]);

} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();

    echo json_encode([
        'success' => false,
        'error' => 'Reset failed: ' . $e->getMessage()
    ]);
}

$conn->close();
?>