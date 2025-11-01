<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once 'config.php';

// Simulate the generate_matches API call
$_SERVER['REQUEST_METHOD'] = 'POST';
$_POST['action'] = 'generate_matches';

echo "=== TESTING GENERATE MATCHES API ===\n\n";

ob_start();

try {
    // Get all teams indexed by rumah_sukan_id
    $result = $conn->query("SELECT * FROM teams ORDER BY rumah_sukan_id");
    $teamsByRumah = [];
    while ($row = $result->fetch_assoc()) {
        $teamsByRumah[(int)$row['rumah_sukan_id']] = $row;
    }
    
    echo "Teams found: " . count($teamsByRumah) . "\n";
    
    // Clear existing matches
    $conn->query("DELETE FROM matches");
    echo "Cleared existing matches\n";
    
    // Match schedule
    $matchSchedule = [
        1 => ['time' => '09:00:00', 'pair' => [1, 3]], // Merah vs Hijau
        2 => ['time' => '09:20:00', 'pair' => [2, 4]], // Biru vs Kuning
        3 => ['time' => '09:40:00', 'pair' => [1, 4]], // Merah vs Kuning
        4 => ['time' => '10:00:00', 'pair' => [3, 2]], // Hijau vs Biru
        5 => ['time' => '10:50:00', 'pair' => [1, 2]], // Merah vs Biru
        6 => ['time' => '11:10:00', 'pair' => [4, 3]], // Kuning vs Hijau
    ];
    
    // Get table IDs
    $tableA = $conn->query("SELECT id FROM play_tables WHERE name = 'Table A' LIMIT 1")->fetch_assoc();
    $tableB = $conn->query("SELECT id FROM play_tables WHERE name = 'Table B' LIMIT 1")->fetch_assoc();
    $tableAId = $tableA ? (int)$tableA['id'] : 1;
    $tableBId = $tableB ? (int)$tableB['id'] : 2;
    
    echo "Table A ID: $tableAId, Table B ID: $tableBId\n\n";
    
    $insertCount = 0;
    
    foreach ($matchSchedule as $matchNum => $schedule) {
        $rumah1 = $schedule['pair'][0];
        $rumah2 = $schedule['pair'][1];
        
        if (!isset($teamsByRumah[$rumah1]) || !isset($teamsByRumah[$rumah2])) {
            echo "SKIP Match $matchNum: Teams not found\n";
            continue;
        }
        
        $teamI = $teamsByRumah[$rumah1];
        $teamJ = $teamsByRumah[$rumah2];
        $matchTime = '2025-11-01 ' . $schedule['time'];
        
        $teamIId = (int)$teamI['id'];
        $teamJId = (int)$teamJ['id'];
        
        echo "Match $matchNum at {$schedule['time']}: Team $teamIId vs Team $teamJId\n";
        
        // Mixed Doubles
        $teamIMixedTableId = !empty($teamI['mixed_doubles_table_id']) ? (int)$teamI['mixed_doubles_table_id'] : $tableAId;
        $mixedTableId = $teamIMixedTableId;
        
        $stmt = $conn->prepare("
            INSERT INTO matches (match_number, category, team1_id, team2_id, pair1_player1, pair1_player2, pair2_player1, pair2_player2, table_id, match_time) 
            VALUES (?, 'Mixed Doubles', ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        if (!$stmt) {
            echo "ERROR preparing Mixed statement: " . $conn->error . "\n";
            continue;
        }
        
        $teamIMixedPlayer1 = $teamI['mixed_pair_player1'] ?? '';
        $teamIMixedPlayer2 = $teamI['mixed_pair_player2'] ?? '';
        $teamJMixedPlayer1 = $teamJ['mixed_pair_player1'] ?? '';
        $teamJMixedPlayer2 = $teamJ['mixed_pair_player2'] ?? '';
        
        $stmt->bind_param("iiissssis",
            $matchNum,
            $teamIId,
            $teamJId,
            $teamIMixedPlayer1,
            $teamIMixedPlayer2,
            $teamJMixedPlayer1,
            $teamJMixedPlayer2,
            $mixedTableId,
            $matchTime
        );
        
        if ($stmt->execute()) {
            echo "  ✓ Mixed Doubles inserted\n";
            $insertCount++;
        } else {
            echo "  ✗ Mixed Doubles ERROR: " . $stmt->error . "\n";
        }
        
        // Men's Doubles
        $teamIMensTableId = !empty($teamI['mens_doubles_table_id']) ? (int)$teamI['mens_doubles_table_id'] : $tableBId;
        $mensTableId = $teamIMensTableId;
        
        $stmt = $conn->prepare("
            INSERT INTO matches (match_number, category, team1_id, team2_id, pair1_player1, pair1_player2, pair2_player1, pair2_player2, table_id, match_time) 
            VALUES (?, 'Men\'s Doubles', ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        if (!$stmt) {
            echo "ERROR preparing Men's statement: " . $conn->error . "\n";
            continue;
        }
        
        $teamIMensPlayer1 = $teamI['mens_pair_player1'] ?? '';
        $teamIMensPlayer2 = $teamI['mens_pair_player2'] ?? '';
        $teamJMensPlayer1 = $teamJ['mens_pair_player1'] ?? '';
        $teamJMensPlayer2 = $teamJ['mens_pair_player2'] ?? '';
        
        $stmt->bind_param("iiissssis",
            $matchNum,
            $teamIId,
            $teamJId,
            $teamIMensPlayer1,
            $teamIMensPlayer2,
            $teamJMensPlayer1,
            $teamJMensPlayer2,
            $mensTableId,
            $matchTime
        );
        
        if ($stmt->execute()) {
            echo "  ✓ Men's Doubles inserted\n";
            $insertCount++;
        } else {
            echo "  ✗ Men's Doubles ERROR: " . $stmt->error . "\n";
        }
        
        echo "\n";
    }
    
    echo "\n=== RESULT ===\n";
    echo "Total matches inserted: $insertCount\n";
    echo json_encode(['success' => true, 'message' => 'Matches generated successfully with schedule', 'count' => $insertCount]);
    
} catch (Exception $e) {
    echo "\n=== EXCEPTION ===\n";
    echo $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

$output = ob_get_clean();
echo $output;

$conn->close();
