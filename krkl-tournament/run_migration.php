<?php
require_once 'config.php';

try {
    $sql = file_get_contents('add_match_scheduling.sql');
    
    if ($conn->multi_query($sql)) {
        do {
            if ($result = $conn->store_result()) {
                $result->free();
            }
        } while ($conn->next_result());
        echo "✅ Migration completed successfully!\n";
        echo "✅ Added match_time column to matches table\n";
    } else {
        echo "❌ Error: " . $conn->error . "\n";
    }
    
    $conn->close();
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
