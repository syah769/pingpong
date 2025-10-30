<?php
header('Content-Type: application/json');

$allowedOrigins = [
    'http://localhost:3000',
    'http://pingpong.test',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header('Access-Control-Allow-Origin: http://localhost:3000');
}

header('Vary: Origin');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/config.php';

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

switch ($method) {
    case 'GET':
        handleGet($conn);
        break;
    case 'POST':
        handlePost($conn, $input);
        break;
    case 'PUT':
        handlePut($conn, $input);
        break;
    case 'DELETE':
        handleDelete($conn, $input);
        break;
    default:
        echo json_encode(['message' => 'Invalid request method']);
        break;
}

$conn->close();

function handleGet($conn) {
    $action = $_GET['action'] ?? '';
    
    switch ($action) {
        case 'rumah_sukan':
            $result = $conn->query("SELECT * FROM rumah_sukan ORDER BY id");
            $rumah = [];
            while ($row = $result->fetch_assoc()) {
                $rumah[] = [
                    'id' => isset($row['id']) ? (int)$row['id'] : null,
                    'name' => $row['name'] ?? '',
                    'color' => $row['color'] ?? 'bg-gray-400',
                    'colorHex' => $row['color_hex'] ?? '#9ca3af',
                    'createdAt' => $row['created_at'] ?? null,
                    'updatedAt' => $row['updated_at'] ?? null,
                ];
            }
            echo json_encode($rumah);
            break;
            
        case 'teams':
            $result = $conn->query("
                SELECT t.*, r.name as rumah_name, r.color, r.color_hex 
                FROM teams t 
                LEFT JOIN rumah_sukan r ON t.rumah_sukan_id = r.id 
                ORDER BY t.created_at DESC
            ");
            $teams = [];
            while ($row = $result->fetch_assoc()) {
                // Get players for this team
                $playerResult = $conn->query("
                    SELECT p.* FROM players p 
                    JOIN team_players tp ON p.id = tp.player_id 
                    WHERE tp.team_id = " . $row['id'] . "
                ");
                $players = [];
                while ($playerRow = $playerResult->fetch_assoc()) {
                    $players[] = $playerRow;
                }
                
                $teams[] = [
                    'id' => (int)$row['id'],
                    'rumahSukanId' => (int)$row['rumah_sukan_id'],
                    'rumahName' => $row['rumah_name'] ?? '',
                    'rumahColorClass' => $row['color'] ?? '',
                    'rumahColorHex' => $row['color_hex'] ?? '',
                    'mixedPair' => [
                        'player1' => $row['mixed_pair_player1'] ?? '',
                        'player2' => $row['mixed_pair_player2'] ?? '',
                    ],
                    'mensPair' => [
                        'player1' => $row['mens_pair_player1'] ?? '',
                        'player2' => $row['mens_pair_player2'] ?? '',
                    ],
                    'players' => array_map(function ($player) {
                        return [
                            'id' => isset($player['id']) ? (int)$player['id'] : null,
                            'name' => $player['name'] ?? '',
                            'gender' => $player['gender'] ?? '',
                            'rumah_sukan_id' => isset($player['rumah_sukan_id']) ? (int)$player['rumah_sukan_id'] : null,
                        ];
                    }, $players),
                    'createdAt' => $row['created_at'] ?? null,
                    'updatedAt' => $row['updated_at'] ?? null,
                ];
            }
            echo json_encode($teams);
            break;
            
        case 'matches':
            $result = $conn->query("
                SELECT m.*, 
                       t1.rumah_sukan_id as team1_rumah_id,
                       t2.rumah_sukan_id as team2_rumah_id,
                       r1.name as team1_rumah_name,
                       r2.name as team2_rumah_name,
                       pt.name as table_name,
                       pt.assigned_category as table_assigned_category
                FROM matches m
                LEFT JOIN teams t1 ON m.team1_id = t1.id
                LEFT JOIN teams t2 ON m.team2_id = t2.id
                LEFT JOIN rumah_sukan r1 ON t1.rumah_sukan_id = r1.id
                LEFT JOIN rumah_sukan r2 ON t2.rumah_sukan_id = r2.id
                LEFT JOIN play_tables pt ON m.table_id = pt.id
                ORDER BY m.match_number
            ");
            $matches = [];
            while ($row = $result->fetch_assoc()) {
                $matches[] = $row;
            }
            echo json_encode($matches);
            break;
        
        case 'tables':
            $result = $conn->query("SELECT id, name, assigned_category FROM play_tables ORDER BY sort_order, id");
            $tables = [];
            while ($row = $result->fetch_assoc()) {
                $tables[] = $row;
            }
            echo json_encode($tables);
            break;
    }
}

function handlePost($conn, $input) {
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'save_team':
            // Start transaction
            $conn->begin_transaction();
            
            try {
                $rumahSukanId = (int)($input['rumahSukanId'] ?? 0);
                $mixedPair = $input['mixedPair'] ?? [];
                $mensPair = $input['mensPair'] ?? [];
                $mixedPairPlayer1 = $mixedPair['player1'] ?? '';
                $mixedPairPlayer2 = $mixedPair['player2'] ?? '';
                $mensPairPlayer1 = $mensPair['player1'] ?? '';
                $mensPairPlayer2 = $mensPair['player2'] ?? '';
                
                // Insert team
                $stmt = $conn->prepare("
                    INSERT INTO teams (rumah_sukan_id, mixed_pair_player1, mixed_pair_player2, mens_pair_player1, mens_pair_player2) 
                    VALUES (?, ?, ?, ?, ?)
                ");
                $stmt->bind_param("issss", 
                    $rumahSukanId, 
                    $mixedPairPlayer1, 
                    $mixedPairPlayer2, 
                    $mensPairPlayer1, 
                    $mensPairPlayer2
                );
                $stmt->execute();
                $teamId = $conn->insert_id;
                
                // Insert players and link to team
                foreach (($input['players'] ?? []) as $player) {
                    $playerName = $player['name'] ?? '';
                    $playerGender = $player['gender'] ?? '';
                    
                    // Check if player already exists
                    $checkStmt = $conn->prepare("SELECT id FROM players WHERE name = ? AND rumah_sukan_id = ?");
                    $checkStmt->bind_param("si", $playerName, $rumahSukanId);
                    $checkStmt->execute();
                    $existingPlayer = $checkStmt->get_result()->fetch_assoc();
                    
                    if ($existingPlayer) {
                        $playerId = $existingPlayer['id'];
                    } else {
                        // Insert new player
                        $playerStmt = $conn->prepare("
                            INSERT INTO players (name, gender, rumah_sukan_id) 
                            VALUES (?, ?, ?)
                        ");
                        $playerStmt->bind_param("ssi", $playerName, $playerGender, $rumahSukanId);
                        $playerStmt->execute();
                        $playerId = $conn->insert_id;
                    }
                    
                    // Link player to team
                    $linkStmt = $conn->prepare("
                        INSERT INTO team_players (team_id, player_id) 
                        VALUES (?, ?)
                    ");
                    $linkStmt->bind_param("ii", $teamId, $playerId);
                    $linkStmt->execute();
                }
                
                $conn->commit();
                echo json_encode(['success' => true, 'teamId' => $teamId]);
                
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            break;
            
        case 'update_team':
            $teamId = (int)($input['teamId'] ?? 0);
            if ($teamId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Invalid team ID']);
                break;
            }
            
            $conn->begin_transaction();
            
            try {
                $teamCheckStmt = $conn->prepare("SELECT id FROM teams WHERE id = ?");
                $teamCheckStmt->bind_param("i", $teamId);
                $teamCheckStmt->execute();
                $existingTeam = $teamCheckStmt->get_result()->fetch_assoc();
                $teamCheckStmt->close();
                
                if (!$existingTeam) {
                    throw new Exception('Team not found');
                }
                
                $rumahSukanId = (int)($input['rumahSukanId'] ?? 0);
                $mixedPair = $input['mixedPair'] ?? [];
                $mensPair = $input['mensPair'] ?? [];
                $mixedPairPlayer1 = $mixedPair['player1'] ?? '';
                $mixedPairPlayer2 = $mixedPair['player2'] ?? '';
                $mensPairPlayer1 = $mensPair['player1'] ?? '';
                $mensPairPlayer2 = $mensPair['player2'] ?? '';
                
                $updateStmt = $conn->prepare("
                    UPDATE teams 
                    SET rumah_sukan_id = ?, mixed_pair_player1 = ?, mixed_pair_player2 = ?, mens_pair_player1 = ?, mens_pair_player2 = ?
                    WHERE id = ?
                ");
                $updateStmt->bind_param(
                    "issssi",
                    $rumahSukanId,
                    $mixedPairPlayer1,
                    $mixedPairPlayer2,
                    $mensPairPlayer1,
                    $mensPairPlayer2,
                    $teamId
                );
                $updateStmt->execute();
                $updateStmt->close();
                
                $deleteLinksStmt = $conn->prepare("DELETE FROM team_players WHERE team_id = ?");
                $deleteLinksStmt->bind_param("i", $teamId);
                $deleteLinksStmt->execute();
                $deleteLinksStmt->close();
                
                foreach (($input['players'] ?? []) as $player) {
                    $playerName = $player['name'] ?? '';
                    $playerGender = $player['gender'] ?? '';
                    
                    if ($playerName === '') {
                        continue;
                    }
                    
                    $checkStmt = $conn->prepare("SELECT id FROM players WHERE name = ? AND rumah_sukan_id = ?");
                    $checkStmt->bind_param("si", $playerName, $rumahSukanId);
                    $checkStmt->execute();
                    $existingPlayer = $checkStmt->get_result()->fetch_assoc();
                    $checkStmt->close();
                    
                    if ($existingPlayer) {
                        $playerId = $existingPlayer['id'];
                    } else {
                        $playerStmt = $conn->prepare("
                            INSERT INTO players (name, gender, rumah_sukan_id) 
                            VALUES (?, ?, ?)
                        ");
                        $playerStmt->bind_param("ssi", $playerName, $playerGender, $rumahSukanId);
                        $playerStmt->execute();
                        $playerId = $conn->insert_id;
                        $playerStmt->close();
                    }
                    
                    $linkStmt = $conn->prepare("
                        INSERT INTO team_players (team_id, player_id) 
                        VALUES (?, ?)
                    ");
                    $linkStmt->bind_param("ii", $teamId, $playerId);
                    $linkStmt->execute();
                    $linkStmt->close();
                }
                
                $updateMixedTeam1 = $conn->prepare("
                    UPDATE matches SET pair1_player1 = ?, pair1_player2 = ?
                    WHERE team1_id = ? AND category = 'Mixed Doubles'
                ");
                $updateMixedTeam1->bind_param("ssi", $mixedPairPlayer1, $mixedPairPlayer2, $teamId);
                $updateMixedTeam1->execute();
                $updateMixedTeam1->close();
                
                $updateMixedTeam2 = $conn->prepare("
                    UPDATE matches SET pair2_player1 = ?, pair2_player2 = ?
                    WHERE team2_id = ? AND category = 'Mixed Doubles'
                ");
                $updateMixedTeam2->bind_param("ssi", $mixedPairPlayer1, $mixedPairPlayer2, $teamId);
                $updateMixedTeam2->execute();
                $updateMixedTeam2->close();
                
                $updateMensTeam1 = $conn->prepare("
                    UPDATE matches SET pair1_player1 = ?, pair1_player2 = ?
                    WHERE team1_id = ? AND category = 'Men\'s Doubles'
                ");
                $updateMensTeam1->bind_param("ssi", $mensPairPlayer1, $mensPairPlayer2, $teamId);
                $updateMensTeam1->execute();
                $updateMensTeam1->close();
                
                $updateMensTeam2 = $conn->prepare("
                    UPDATE matches SET pair2_player1 = ?, pair2_player2 = ?
                    WHERE team2_id = ? AND category = 'Men\'s Doubles'
                ");
                $updateMensTeam2->bind_param("ssi", $mensPairPlayer1, $mensPairPlayer2, $teamId);
                $updateMensTeam2->execute();
                $updateMensTeam2->close();
                
                $conn->commit();
                echo json_encode(['success' => true, 'teamId' => $teamId]);
                
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            }
            break;
            
            
        case 'generate_matches':
            // Get all teams
            $result = $conn->query("SELECT * FROM teams ORDER BY id");
            $teams = [];
            while ($row = $result->fetch_assoc()) {
                $teams[] = $row;
            }
            
            // Clear existing matches
            $conn->query("DELETE FROM matches");
            
            // Generate round-robin matches
            $matchNumber = 1;
            for ($i = 0; $i < count($teams); $i++) {
                for ($j = $i + 1; $j < count($teams); $j++) {
                    // Mixed Doubles
                    $stmt = $conn->prepare("
                        INSERT INTO matches (match_number, category, team1_id, team2_id, pair1_player1, pair1_player2, pair2_player1, pair2_player2) 
                        VALUES (?, 'Mixed Doubles', ?, ?, ?, ?, ?, ?)
                    ");
                    $teamIMixedPlayer1 = $teams[$i]['mixed_pair_player1'] ?? '';
                    $teamIMixedPlayer2 = $teams[$i]['mixed_pair_player2'] ?? '';
                    $teamJMixedPlayer1 = $teams[$j]['mixed_pair_player1'] ?? '';
                    $teamJMixedPlayer2 = $teams[$j]['mixed_pair_player2'] ?? '';
                    $mixedMatchNumber = $matchNumber++;
                    $teamIId = $teams[$i]['id'];
                    $teamJId = $teams[$j]['id'];
                    $stmt->bind_param("iisssss",
                        $mixedMatchNumber,
                        $teamIId,
                        $teamJId,
                        $teamIMixedPlayer1,
                        $teamIMixedPlayer2,
                        $teamJMixedPlayer1,
                        $teamJMixedPlayer2
                    );
                    $stmt->execute();
                    
                    // Men's Doubles
                    $stmt = $conn->prepare("
                        INSERT INTO matches (match_number, category, team1_id, team2_id, pair1_player1, pair1_player2, pair2_player1, pair2_player2) 
                        VALUES (?, 'Men\'s Doubles', ?, ?, ?, ?, ?, ?)
                    ");
                    $teamIMensPlayer1 = $teams[$i]['mens_pair_player1'] ?? '';
                    $teamIMensPlayer2 = $teams[$i]['mens_pair_player2'] ?? '';
                    $teamJMensPlayer1 = $teams[$j]['mens_pair_player1'] ?? '';
                    $teamJMensPlayer2 = $teams[$j]['mens_pair_player2'] ?? '';
                    $mensMatchNumber = $matchNumber++;
                    $stmt->bind_param("iisssss",
                        $mensMatchNumber,
                        $teamIId,
                        $teamJId,
                        $teamIMensPlayer1,
                        $teamIMensPlayer2,
                        $teamJMensPlayer1,
                        $teamJMensPlayer2
                    );
                    $stmt->execute();
                }
            }
            
            echo json_encode(['success' => true, 'message' => 'Matches generated successfully']);
            break;
    }
}

function handlePut($conn, $input) {
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'update_match_score':
            $score1 = (int)($input['score1'] ?? 0);
            $score2 = (int)($input['score2'] ?? 0);
            $matchId = (int)($input['matchId'] ?? 0);
            $stmt = $conn->prepare("
                UPDATE matches 
                SET score1 = ?, score2 = ?, status = 'completed', timestamp = NOW() 
                WHERE id = ?
            ");
            $stmt->bind_param("iii", $score1, $score2, $matchId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            break;
    }
}

function handleDelete($conn, $input) {
    $action = $input['action'] ?? '';
    
    switch ($action) {
        case 'delete_team':
            $teamId = (int)($input['teamId'] ?? 0);
            $stmt = $conn->prepare("DELETE FROM teams WHERE id = ?");
            $stmt->bind_param("i", $teamId);
            $stmt->execute();
            echo json_encode(['success' => true]);
            break;
    }
}
?>
