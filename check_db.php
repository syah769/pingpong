<?php
require_once 'krkl-tournament/config.php';

echo "=== DATABASE AUDIT: krkl_tournament ===\n\n";

$tables = [
    'house_points',
    'matches', 
    'players',
    'play_tables',
    'rumah_sukan',
    'spirit_marks',
    'teams',
    'team_players',
    'team_table_assignments'
];

foreach ($tables as $table) {
    $result = $conn->query("SELECT COUNT(*) as count FROM $table");
    if ($result) {
        $row = $result->fetch_assoc();
        $count = $row['count'];
        echo str_pad($table, 25) . " : " . str_pad($count, 4, ' ', STR_PAD_LEFT) . " records";
        
        if ($count > 0) {
            // Show sample data
            $sampleResult = $conn->query("SELECT * FROM $table LIMIT 3");
            echo "\n";
            while ($sampleRow = $sampleResult->fetch_assoc()) {
                echo "  → ";
                $first = true;
                foreach ($sampleRow as $key => $value) {
                    if ($key !== 'created_at' && $key !== 'updated_at') {
                        if (!$first) echo ", ";
                        echo $key . "=" . (is_null($value) ? 'NULL' : substr($value, 0, 30));
                        $first = false;
                    }
                }
                echo "\n";
            }
        } else {
            echo " (EMPTY)\n";
        }
        echo "\n";
    }
}
