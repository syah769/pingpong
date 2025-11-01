<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';

echo "Testing generate_matches logic...\n\n";

try {
    // Get all teams indexed by rumah_sukan_id
    $result = $conn->query("SELECT * FROM teams ORDER BY rumah_sukan_id");
    $teamsByRumah = [];
    while ($row = $result->fetch_assoc()) {
        $teamsByRumah[(int)$row['rumah_sukan_id']] = $row;
    }
    
    echo "Found " . count($teamsByRumah) . " teams (indexed by Rumah ID):\n";
    foreach ($teamsByRumah as $rumahId => $team) {
        echo "  Rumah $rumahId => Team ID: {$team['id']}\n";
    }
    echo "\n";
    
    // Match schedule based on T&C Section 12
    // Rumah IDs: 1=Merah, 2=Biru, 3=Hijau, 4=Kuning
    $matchSchedule = [
        1 => ['time' => '09:00:00', 'pair' => [1, 3]], // Merah vs Hijau
        2 => ['time' => '09:20:00', 'pair' => [2, 4]], // Biru vs Kuning
        3 => ['time' => '09:40:00', 'pair' => [1, 4]], // Merah vs Kuning
        4 => ['time' => '10:00:00', 'pair' => [3, 2]], // Hijau vs Biru
        5 => ['time' => '10:50:00', 'pair' => [1, 2]], // Merah vs Biru (after break)
        6 => ['time' => '11:10:00', 'pair' => [4, 3]], // Kuning vs Hijau
    ];
    
    // Get default table IDs
    $tableA = $conn->query("SELECT id FROM play_tables WHERE name = 'Table A' LIMIT 1")->fetch_assoc();
    $tableB = $conn->query("SELECT id FROM play_tables WHERE name = 'Table B' LIMIT 1")->fetch_assoc();
    $tableAId = $tableA ? (int)$tableA['id'] : 1;
    $tableBId = $tableB ? (int)$tableB['id'] : 2;
    
    echo "Table A ID: $tableAId\n";
    echo "Table B ID: $tableBId\n\n";
    
    // Test each match
    foreach ($matchSchedule as $matchNum => $schedule) {
        $rumah1 = $schedule['pair'][0];
        $rumah2 = $schedule['pair'][1];
        
        echo "Match $matchNum at {$schedule['time']}:\n";
        
        if (!isset($teamsByRumah[$rumah1])) {
            echo "  ERROR: Rumah $rumah1 not found!\n";
            continue;
        }
        if (!isset($teamsByRumah[$rumah2])) {
            echo "  ERROR: Rumah $rumah2 not found!\n";
            continue;
        }
        
        $teamI = $teamsByRumah[$rumah1];
        $teamJ = $teamsByRumah[$rumah2];
        
        // Get rumah names
        $rumahNames = [1 => 'Merah', 2 => 'Biru', 3 => 'Hijau', 4 => 'Kuning'];
        
        echo "  {$rumahNames[$rumah1]} (Team ID={$teamI['id']}) vs {$rumahNames[$rumah2]} (Team ID={$teamJ['id']})\n";
        echo "  Match time: 2025-11-01 {$schedule['time']}\n";
        echo "\n";
    }
    
    echo "✅ Test completed successfully!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

$conn->close();
