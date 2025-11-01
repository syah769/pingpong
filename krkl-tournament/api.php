<?php
// Production error reporting - suppress warnings
error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING & ~E_DEPRECATED);
ini_set('display_errors', 0);

// Clean any output that might have been generated
if (ob_get_length()) ob_clean();

header('Content-Type: application/json');

$allowedOrigins = [
    'http://localhost:3000',
    'http://pingpong.test',
    'https://ad388fd6bd6b.ngrok-free.app',
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
    $action = $_GET['action'] ?? $_GET['resource'] ?? '';

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

            // Enhance teams with table assignments
            foreach ($teams as &$team) {
                // Get mixed doubles table assignment
                $mixedResult = $conn->prepare("
                    SELECT tta.preferred_table_id, pt.name as table_name
                    FROM team_table_assignments tta
                    LEFT JOIN play_tables pt ON tta.preferred_table_id = pt.id
                    WHERE tta.team_id = ? AND tta.category = 'Mixed Doubles'
                ");
                $mixedResult->bind_param("i", $team['id']);
                $mixedResult->execute();
                $mixedRow = $mixedResult->get_result()->fetch_assoc();

                // Get men's doubles table assignment
                $mensResult = $conn->prepare("
                    SELECT tta.preferred_table_id, pt.name as table_name
                    FROM team_table_assignments tta
                    LEFT JOIN play_tables pt ON tta.preferred_table_id = pt.id
                    WHERE tta.team_id = ? AND tta.category = 'Men\'s Doubles'
                ");
                $mensResult->bind_param("i", $team['id']);
                $mensResult->execute();
                $mensRow = $mensResult->get_result()->fetch_assoc();

                $team['tableAssignments'] = [
                    'mixedDoubles' => [
                        'tableId' => ($mixedRow && $mixedRow['preferred_table_id']) ? (int)$mixedRow['preferred_table_id'] : null,
                        'tableName' => $mixedRow['table_name'] ?? null
                    ],
                    'mensDoubles' => [
                        'tableId' => ($mensRow && $mensRow['preferred_table_id']) ? (int)$mensRow['preferred_table_id'] : null,
                        'tableName' => $mensRow['table_name'] ?? null
                    ]
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
                // Build individual games array for easier frontend consumption
                $games = [];
                $team1Wins = 0;
                $team2Wins = 0;

                for ($i = 1; $i <= 5; $i++) {
                    $team1Score = (int)($row["game{$i}_team1"] ?? 0);
                    $team2Score = (int)($row["game{$i}_team2"] ?? 0);
                    $maxScore = max($team1Score, $team2Score);
                    $scoreDiff = abs($team1Score - $team2Score);
                    $gameCompleted = $maxScore >= 11 && $scoreDiff >= 2;

                    if ($gameCompleted) {
                        if ($team1Score > $team2Score) {
                            $team1Wins++;
                        } elseif ($team2Score > $team1Score) {
                            $team2Wins++;
                        }
                    }

                    $games[] = [
                        'gameNumber' => $i,
                        'team1Score' => $team1Score,
                        'team2Score' => $team2Score,
                        'completed' => $gameCompleted
                    ];
                }

                $row['games'] = $games;
                $row['team1Wins'] = $team1Wins;
                $row['team2Wins'] = $team2Wins;
                $row['score1'] = isset($row['score1']) ? (int)$row['score1'] : $team1Wins;
                $row['score2'] = isset($row['score2']) ? (int)$row['score2'] : $team2Wins;

                $currentGame = (int)($row['current_game'] ?? 1);
                if ($currentGame < 1 || $currentGame > 5) {
                    $currentGame = 1;
                }
                // Ensure current game points to the first incomplete game if match isn't completed
                $matchComplete = $team1Wins >= 3 || $team2Wins >= 3;
                if (!$matchComplete) {
                    for ($i = 0; $i < 5; $i++) {
                        if (!$games[$i]['completed']) {
                            $currentGame = $i + 1;
                            break;
                        }
                    }
                }
                $row['currentGame'] = $currentGame;

                $matches[] = $row;
            }
            echo json_encode($matches);
            break;
        
        case 'tables':
            $result = $conn->query("SELECT id, name, assigned_category, current_assignment, priority_assignment, notes, sort_order FROM play_tables ORDER BY sort_order, id");
            $tables = [];
            while ($row = $result->fetch_assoc()) {
                $tables[] = [
                    'id' => (int)$row['id'],
                    'name' => $row['name'],
                    'assignedCategory' => $row['assigned_category'],
                    'currentAssignment' => $row['current_assignment'],
                    'priorityAssignment' => $row['priority_assignment'],
                    'notes' => $row['notes'],
                    'sortOrder' => (int)$row['sort_order']
                ];
            }
            echo json_encode($tables);
            break;

        case 'team_table_assignments':
            $result = $conn->query("
                SELECT tta.*,
                       t.id as team_id,
                       t.rumah_sukan_id,
                       rs.name as rumah_sukan_name,
                       rs.color as rumah_sukan_color,
                       pt.name as table_name,
                       t.mixed_pair_player1,
                       t.mixed_pair_player2,
                       t.mens_pair_player1,
                       t.mens_pair_player2
                FROM team_table_assignments tta
                LEFT JOIN teams t ON tta.team_id = t.id
                LEFT JOIN rumah_sukan rs ON t.rumah_sukan_id = rs.id
                LEFT JOIN play_tables pt ON tta.preferred_table_id = pt.id
                ORDER BY tta.category, rs.name, t.id
            ");
            $assignments = [];
            while ($row = $result->fetch_assoc()) {
                $assignments[] = [
                    'id' => (int)$row['id'],
                    'teamId' => (int)$row['team_id'],
                    'category' => $row['category'],
                    'preferredTableId' => $row['preferred_table_id'] ? (int)$row['preferred_table_id'] : null,
                    'tableName' => $row['table_name'],
                    'tableNotes' => $row['table_notes'],
                    'rumahSukanName' => $row['rumah_sukan_name'],
                    'rumahSukanColor' => $row['rumah_sukan_color'],
                    'mixedPair' => [
                        'player1' => $row['mixed_pair_player1'] ?? '',
                        'player2' => $row['mixed_pair_player2'] ?? ''
                    ],
                    'mensPair' => [
                        'player1' => $row['mens_pair_player1'] ?? '',
                        'player2' => $row['mens_pair_player2'] ?? ''
                    ],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
            echo json_encode($assignments);
            break;

        case 'spirit_marks':
            $tournamentDate = $_GET['tournament_date'] ?? date('Y-m-d');
            $safeTournamentDate = $conn->real_escape_string($tournamentDate);
            $result = $conn->query("
                SELECT sm.*, rs.name as rumah_name, rs.color as rumah_color
                FROM spirit_marks sm
                LEFT JOIN rumah_sukan rs ON sm.rumah_id = rs.id
                WHERE sm.tournament_date = '$safeTournamentDate'
                ORDER BY rs.name
            ");
            $spiritMarks = [];
            while ($row = $result->fetch_assoc()) {
                $spiritMarks[] = [
                    'id' => (int)$row['id'],
                    'rumahId' => (int)$row['rumah_id'],
                    'rumahName' => $row['rumah_name'],
                    'rumahColor' => $row['rumah_color'],
                    'tournamentDate' => $row['tournament_date'],
                    'assessorName' => $row['assessor_name'],
                    'sportsmanshipScore' => (float)$row['sportsmanship_score'],
                    'teamworkScore' => (float)$row['teamwork_score'],
                    'seatArrangementScore' => (float)$row['seat_arrangement_score'],
                    'totalScore' => (float)$row['total_score'],
                    'sportsmanshipNotes' => $row['sportsmanship_notes'],
                    'teamworkNotes' => $row['teamwork_notes'],
                    'seatArrangementNotes' => $row['seat_arrangement_notes'],
                    'overallNotes' => $row['overall_notes'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
            echo json_encode($spiritMarks);
            break;

  
        case 'house_points':
            $tournamentDate = $_GET['tournament_date'] ?? date('Y-m-d');
            $safeTournamentDate = $conn->real_escape_string($tournamentDate);
            $result = $conn->query("
                SELECT hp.*, rs.name as rumah_name, rs.color as rumah_color
                FROM house_points hp
                LEFT JOIN rumah_sukan rs ON hp.rumah_id = rs.id
                WHERE hp.tournament_date = '$safeTournamentDate'
                ORDER BY hp.total_points DESC, hp.final_placement ASC
            ");
            $housePoints = [];
            while ($row = $result->fetch_assoc()) {
                $housePoints[] = [
                    'id' => (int)$row['id'],
                    'rumahId' => (int)$row['rumah_id'],
                    'rumahName' => $row['rumah_name'],
                    'rumahColor' => $row['rumah_color'],
                    'tournamentDate' => $row['tournament_date'],
                    'placementPoints' => (int)$row['placement_points'],
                    'participationPoints' => (int)$row['participation_points'],
                    'matchWinPoints' => (int)$row['match_win_points'],
                    'spiritPoints' => (float)$row['spirit_points'],
                    'totalPoints' => (float)$row['total_points'],
                    'finalPlacement' => $row['final_placement'] ? (int)$row['final_placement'] : null,
                    'tieBreakerNotes' => $row['tie_breaker_notes'],
                    'createdAt' => $row['created_at'],
                    'updatedAt' => $row['updated_at']
                ];
            }
            echo json_encode($housePoints);
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
                    $playerId = isset($player['id']) ? (int)$player['id'] : null;
                    
                    if ($playerName === '') {
                        continue;
                    }
                    
                    // If player has ID, update existing player
                    if ($playerId && $playerId > 0) {
                        $updatePlayerStmt = $conn->prepare("
                            UPDATE players 
                            SET name = ?, gender = ?
                            WHERE id = ? AND rumah_sukan_id = ?
                        ");
                        $updatePlayerStmt->bind_param("ssii", $playerName, $playerGender, $playerId, $rumahSukanId);
                        $updatePlayerStmt->execute();
                        $updatePlayerStmt->close();
                    } else {
                        // Check if player already exists by name
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
                    $teamIId = (int)$teams[$i]['id'];
                    $teamJId = (int)$teams[$j]['id'];

                    $teamIMixedTableId = !empty($teams[$i]['mixed_doubles_table_id']) ? (int)$teams[$i]['mixed_doubles_table_id'] : null;
                    $teamJMixedTableId = !empty($teams[$j]['mixed_doubles_table_id']) ? (int)$teams[$j]['mixed_doubles_table_id'] : null;
                    $mixedTableId = $teamIMixedTableId ?? $teamJMixedTableId;
                    if ($teamIMixedTableId !== null && $teamJMixedTableId !== null && $teamJMixedTableId === $teamIMixedTableId) {
                        $mixedTableId = $teamIMixedTableId;
                    }

                    $teamIMensTableId = !empty($teams[$i]['mens_doubles_table_id']) ? (int)$teams[$i]['mens_doubles_table_id'] : null;
                    $teamJMensTableId = !empty($teams[$j]['mens_doubles_table_id']) ? (int)$teams[$j]['mens_doubles_table_id'] : null;
                    $mensTableId = $teamIMensTableId ?? $teamJMensTableId;
                    if ($teamIMensTableId !== null && $teamJMensTableId !== null && $teamJMensTableId === $teamIMensTableId) {
                        $mensTableId = $teamIMensTableId;
                    }

                    // Mixed Doubles
                    $stmt = $conn->prepare("
                        INSERT INTO matches (match_number, category, team1_id, team2_id, pair1_player1, pair1_player2, pair2_player1, pair2_player2, table_id) 
                        VALUES (?, 'Mixed Doubles', ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $teamIMixedPlayer1 = $teams[$i]['mixed_pair_player1'] ?? '';
                    $teamIMixedPlayer2 = $teams[$i]['mixed_pair_player2'] ?? '';
                    $teamJMixedPlayer1 = $teams[$j]['mixed_pair_player1'] ?? '';
                    $teamJMixedPlayer2 = $teams[$j]['mixed_pair_player2'] ?? '';
                    $mixedMatchNumber = $matchNumber++;
                    $stmt->bind_param("iiissssi",
                        $mixedMatchNumber,
                        $teamIId,
                        $teamJId,
                        $teamIMixedPlayer1,
                        $teamIMixedPlayer2,
                        $teamJMixedPlayer1,
                        $teamJMixedPlayer2,
                        $mixedTableId
                    );
                    $stmt->execute();
                    
                    // Men's Doubles
                    $stmt = $conn->prepare("
                        INSERT INTO matches (match_number, category, team1_id, team2_id, pair1_player1, pair1_player2, pair2_player1, pair2_player2, table_id) 
                        VALUES (?, 'Men\'s Doubles', ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $teamIMensPlayer1 = $teams[$i]['mens_pair_player1'] ?? '';
                    $teamIMensPlayer2 = $teams[$i]['mens_pair_player2'] ?? '';
                    $teamJMensPlayer1 = $teams[$j]['mens_pair_player1'] ?? '';
                    $teamJMensPlayer2 = $teams[$j]['mens_pair_player2'] ?? '';
                    $mensMatchNumber = $matchNumber++;
                    $stmt->bind_param("iiissssi",
                        $mensMatchNumber,
                        $teamIId,
                        $teamJId,
                        $teamIMensPlayer1,
                        $teamIMensPlayer2,
                        $teamJMensPlayer1,
                        $teamJMensPlayer2,
                        $mensTableId
                    );
                    $stmt->execute();
                }
            }
            
            echo json_encode(['success' => true, 'message' => 'Matches generated successfully']);
            break;

        case 'assign_table':
            $tableId = (int)($input['tableId'] ?? 0);
            $category = $input['category'] ?? '';
            $notes = $input['notes'] ?? '';

            if (!in_array($category, ['Mixed Doubles', 'Men\'s Doubles', 'Both', 'Available'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid category']);
                return;
            }

            $stmt = $conn->prepare("
                UPDATE play_tables
                SET current_assignment = ?, notes = ?
                WHERE id = ?
            ");
            $stmt->bind_param("ssi", $category, $notes, $tableId);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Table assigned successfully']);
            break;

        case 'set_table_priority':
            $tableId = (int)($input['tableId'] ?? 0);
            $priorityCategory = $input['priorityCategory'] ?? 'None';

            if (!in_array($priorityCategory, ['Mixed Doubles', 'Men\'s Doubles', 'None'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid priority category']);
                return;
            }

            $stmt = $conn->prepare("
                UPDATE play_tables
                SET priority_assignment = ?
                WHERE id = ?
            ");
            $stmt->bind_param("si", $priorityCategory, $tableId);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Table priority set successfully']);
            break;

        case 'auto_assign_tables':
            $category = $input['category'] ?? '';

            if (!in_array($category, ['Mixed Doubles', 'Men\'s Doubles'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid category']);
                return;
            }

            // Clear current assignments for tables that can be assigned to this category
            $stmt = $conn->prepare("
                UPDATE play_tables
                SET current_assignment = 'Available'
                WHERE (assigned_category = ? OR assigned_category = 'Both')
                AND current_assignment != ?
            ");
            $stmt->bind_param("ss", $category, $category);
            $stmt->execute();

            // Get tables that can be assigned to this category
            $result = $conn->prepare("
                SELECT id, name FROM play_tables
                WHERE (assigned_category = ? OR assigned_category = 'Both')
                AND current_assignment = 'Available'
                ORDER BY
                    CASE WHEN priority_assignment = ? THEN 1 ELSE 2 END,
                    sort_order, id
            ");
            $result->bind_param("ss", $category, $category);
            $result->execute();
            $availableTables = $result->get_result();

            // Assign available tables to the category
            $updateStmt = $conn->prepare("UPDATE play_tables SET current_assignment = ? WHERE id = ?");
            while ($table = $availableTables->fetch_assoc()) {
                $updateStmt->bind_param("si", $category, $table['id']);
                $updateStmt->execute();
            }

            echo json_encode(['success' => true, 'message' => 'Tables auto-assigned successfully']);
            break;

        case 'save_team_table_assignment':
            $teamId = (int)($input['teamId'] ?? 0);
            $category = $input['category'] ?? '';
            $preferredTableId = $input['preferredTableId'] ?? null;
            $tableNotes = $input['tableNotes'] ?? '';

            if (!in_array($category, ['Mixed Doubles', 'Men\'s Doubles'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid category']);
                return;
            }

            if ($teamId === 0) {
                echo json_encode(['success' => false, 'message' => 'Invalid team ID']);
                return;
            }

            $conn->begin_transaction();
            try {
                // Update team table assignment
                $stmt = $conn->prepare("
                    INSERT INTO team_table_assignments (team_id, category, preferred_table_id, table_notes)
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                    preferred_table_id = VALUES(preferred_table_id),
                    table_notes = VALUES(table_notes),
                    updated_at = CURRENT_TIMESTAMP
                ");
                $stmt->bind_param("isis", $teamId, $category, $preferredTableId, $tableNotes);
                $stmt->execute();

                // Update teams table with direct reference for quick access
                if ($category === 'Mixed Doubles') {
                    $stmt = $conn->prepare("UPDATE teams SET mixed_doubles_table_id = ? WHERE id = ?");
                    $stmt->bind_param("ii", $preferredTableId, $teamId);
                    $stmt->execute();
                } elseif ($category === 'Men\'s Doubles') {
                    $stmt = $conn->prepare("UPDATE teams SET mens_doubles_table_id = ? WHERE id = ?");
                    $stmt->bind_param("ii", $preferredTableId, $teamId);
                    $stmt->execute();
                }

                $conn->commit();
                echo json_encode(['success' => true, 'message' => 'Team table assignment saved successfully']);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['success' => false, 'message' => 'Error saving assignment: ' . $e->getMessage()]);
            }
            break;

        case 'delete_team_table_assignment':
            $assignmentId = (int)($input['assignmentId'] ?? 0);
            $teamId = (int)($input['teamId'] ?? 0);
            $category = $input['category'] ?? '';

            if ($assignmentId === 0 && ($teamId === 0 || empty($category))) {
                echo json_encode(['success' => false, 'message' => 'Invalid assignment details']);
                return;
            }

            $conn->begin_transaction();
            try {
                if ($assignmentId > 0) {
                    // Delete by assignment ID
                    $stmt = $conn->prepare("DELETE FROM team_table_assignments WHERE id = ?");
                    $stmt->bind_param("i", $assignmentId);
                    $stmt->execute();
                } else {
                    // Delete by team and category
                    $stmt = $conn->prepare("DELETE FROM team_table_assignments WHERE team_id = ? AND category = ?");
                    $stmt->bind_param("is", $teamId, $category);
                    $stmt->execute();
                }

                // Update teams table to remove direct reference
                if ($category === 'Mixed Doubles') {
                    $stmt = $conn->prepare("UPDATE teams SET mixed_doubles_table_id = NULL WHERE id = ?");
                    $stmt->bind_param("i", $teamId);
                    $stmt->execute();
                } elseif ($category === 'Men\'s Doubles') {
                    $stmt = $conn->prepare("UPDATE teams SET mens_doubles_table_id = NULL WHERE id = ?");
                    $stmt->bind_param("i", $teamId);
                    $stmt->execute();
                }

                $conn->commit();
                echo json_encode(['success' => true, 'message' => 'Team table assignment deleted successfully']);
            } catch (Exception $e) {
                $conn->rollback();
                echo json_encode(['success' => false, 'message' => 'Error deleting assignment: ' . $e->getMessage()]);
            }
            break;

        case 'save_spirit_marks':
            $rumahId = (int)($input['rumahId'] ?? 0);
            $tournamentDate = $input['tournamentDate'] ?? date('Y-m-d');

            // Validate date format
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tournamentDate)) {
                echo json_encode(['success' => false, 'message' => 'Invalid date format. Use YYYY-MM-DD']);
                return;
            }
            $assessorName = $input['assessorName'] ?? '';
            $sportsmanshipScore = (float)($input['sportsmanshipScore'] ?? 0.0);
            $teamworkScore = (float)($input['teamworkScore'] ?? 0.0);
            $seatArrangementScore = (float)($input['seatArrangementScore'] ?? 0.0);
            $totalScore = $sportsmanshipScore + $teamworkScore + $seatArrangementScore;
            $sportsmanshipNotes = $input['sportsmanshipNotes'] ?? '';
            $teamworkNotes = $input['teamworkNotes'] ?? '';
            $seatArrangementNotes = $input['seatArrangementNotes'] ?? '';
            $overallNotes = $input['overallNotes'] ?? '';

            if ($rumahId === 0 || empty($assessorName)) {
                echo json_encode(['success' => false, 'message' => 'Invalid rumah ID or assessor name']);
                return;
            }

            $stmt = $conn->prepare("
                INSERT INTO spirit_marks
                (rumah_id, tournament_date, assessor_name, sportsmanship_score, teamwork_score, seat_arrangement_score, total_score, sportsmanship_notes, teamwork_notes, seat_arrangement_notes, overall_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                assessor_name = VALUES(assessor_name),
                sportsmanship_score = VALUES(sportsmanship_score),
                teamwork_score = VALUES(teamwork_score),
                seat_arrangement_score = VALUES(seat_arrangement_score),
                total_score = VALUES(total_score),
                sportsmanship_notes = VALUES(sportsmanship_notes),
                teamwork_notes = VALUES(teamwork_notes),
                seat_arrangement_notes = VALUES(seat_arrangement_notes),
                overall_notes = VALUES(overall_notes),
                updated_at = CURRENT_TIMESTAMP
            ");
            $stmt->bind_param("isssdddssss",
                $rumahId, $tournamentDate, $assessorName,
                $sportsmanshipScore, $teamworkScore, $seatArrangementScore, $totalScore,
                $sportsmanshipNotes, $teamworkNotes, $seatArrangementNotes, $overallNotes
            );
            $stmt->execute();

            // Update house points with spirit marks
            updateHousePoints($conn, $rumahId, $tournamentDate);

            echo json_encode(['success' => true, 'message' => 'Spirit marks saved successfully']);
            break;

        case 'calculate_house_points':
            $tournamentDate = $input['tournamentDate'] ?? date('Y-m-d');
            calculateAllHousePoints($conn, $tournamentDate);
            echo json_encode(['success' => true, 'message' => 'House points calculated successfully']);
            break;
    }
}

function handlePut($conn, $input) {
    $action = $input['action'] ?? '';

    switch ($action) {
        case 'update_match_score':
            $matchId = (int)($input['matchId'] ?? 0);
            $gameNumber = (int)($input['gameNumber'] ?? 1);
            $team1Score = (int)($input['team1Score'] ?? 0);
            $team2Score = (int)($input['team2Score'] ?? 0);

            if ($matchId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Invalid match ID: ' . $matchId]);
                break;
            }

            if ($gameNumber < 1 || $gameNumber > 5) {
                echo json_encode(['success' => false, 'message' => 'Invalid game number: ' . $gameNumber]);
                break;
            }

            // Validate scores (table tennis games typically go to 11 points)
            if ($team1Score < 0 || $team2Score < 0 || $team1Score > 30 || $team2Score > 30) {
                echo json_encode(['success' => false, 'message' => 'Invalid scores - must be between 0 and 30']);
                break;
            }

            // Get current match data
            $matchCheck = $conn->prepare("SELECT status FROM matches WHERE id = ?");
            $matchCheck->bind_param("i", $matchId);
            $matchCheck->execute();
            $matchData = $matchCheck->get_result()->fetch_assoc();
            $matchCheck->close();

            if (!$matchData) {
                echo json_encode(['success' => false, 'message' => 'Match not found']);
                break;
            }

            // Prevent editing completed games
            if ($matchData['status'] === 'completed') {
                echo json_encode(['success' => false, 'message' => 'Cannot edit scores of a completed match']);
                break;
            }

            $minWinScore = 11;
            $requiredLead = 2;
            $scoreDiff = abs($team1Score - $team2Score);
            $maxScoreThisGame = max($team1Score, $team2Score);
            $gameComplete = $maxScoreThisGame >= $minWinScore && $scoreDiff >= $requiredLead;
            $needsExtraPoints = $maxScoreThisGame >= $minWinScore && $scoreDiff < $requiredLead;

            // Update the specific game scores
            $updateGame = $conn->prepare("
                UPDATE matches
                SET game{$gameNumber}_team1 = ?, game{$gameNumber}_team2 = ?, timestamp = NOW()
                WHERE id = ?
            ");
            if ($updateGame === false) {
                echo json_encode(['success' => false, 'message' => 'Failed to prepare statement: ' . $conn->error]);
                break;
            }

            $updateGame->bind_param("iii", $team1Score, $team2Score, $matchId);
            if (!$updateGame->execute()) {
                echo json_encode(['success' => false, 'message' => 'Failed to update game scores: ' . $updateGame->error]);
                $updateGame->close();
                break;
            }
            $updateGame->close();

            // Recalculate aggregate scores after update
            $snapshotStmt = $conn->prepare("
                SELECT
                    status,
                    current_game,
                    game1_team1, game1_team2,
                    game2_team1, game2_team2,
                    game3_team1, game3_team2,
                    game4_team1, game4_team2,
                    game5_team1, game5_team2,
                    completed_at
                FROM matches
                WHERE id = ?
            ");
            $snapshotStmt->bind_param("i", $matchId);
            $snapshotStmt->execute();
            $snapshot = $snapshotStmt->get_result()->fetch_assoc();
            $snapshotStmt->close();

            if (!$snapshot) {
                echo json_encode(['success' => false, 'message' => 'Failed to load match snapshot after update']);
                break;
            }

            $team1Wins = 0;
            $team2Wins = 0;
            $firstIncompleteGame = null;

            for ($i = 1; $i <= 5; $i++) {
                $g1 = (int)($snapshot["game{$i}_team1"] ?? 0);
                $g2 = (int)($snapshot["game{$i}_team2"] ?? 0);
                $maxScore = max($g1, $g2);
                $diff = abs($g1 - $g2);
                $completed = $maxScore >= $minWinScore && $diff >= $requiredLead;

                if ($completed) {
                    if ($g1 > $g2) {
                        $team1Wins++;
                    } elseif ($g2 > $g1) {
                        $team2Wins++;
                    }
                } elseif ($firstIncompleteGame === null) {
                    $firstIncompleteGame = $i;
                }
            }

            if ($firstIncompleteGame === null) {
                $firstIncompleteGame = min($team1Wins + $team2Wins + 1, 5);
            }

            $updateScores = $conn->prepare("
                UPDATE matches
                SET score1 = ?, score2 = ?, current_game = ?
                WHERE id = ?
            ");
            $updateScores->bind_param("iiii", $team1Wins, $team2Wins, $firstIncompleteGame, $matchId);
            $updateScores->execute();
            $updateScores->close();

            $isMatchComplete = ($team1Wins >= 3 || $team2Wins >= 3);
            if ($isMatchComplete && $snapshot['status'] !== 'completed') {
                $completeMatch = $conn->prepare("
                    UPDATE matches
                    SET status = 'completed', completed_at = COALESCE(completed_at, NOW())
                    WHERE id = ?
                ");
                $completeMatch->bind_param("i", $matchId);
                $completeMatch->execute();
                $completeMatch->close();
            }

            $message = "Game $gameNumber scores updated successfully";
            if ($gameComplete) {
                $message = "Game $gameNumber selesai dengan skor {$team1Score}-{$team2Score}";
            } elseif ($needsExtraPoints) {
                $message = "Skor dikemaskini. Game belum selesai - perlukan beza 2 mata selepas 10-10.";
            }

            echo json_encode([
                'success' => true,
                'message' => $message,
                'gameComplete' => $gameComplete,
                'matchComplete' => $isMatchComplete,
                'team1Wins' => $team1Wins,
                'team2Wins' => $team2Wins,
                'currentGame' => $firstIncompleteGame
            ]);
            break;
        case 'start_match':
            $matchId = (int)($input['matchId'] ?? 0);

            if ($matchId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Invalid match ID: ' . $matchId]);
                break;
            }

            // Log the start attempt for debugging
            error_log("API: Starting match $matchId");

            $stmt = $conn->prepare("
                UPDATE matches
                SET status = 'playing', timestamp = NOW()
                WHERE id = ?
            ");
            if (!$stmt) {
                $error = $conn->error;
                error_log("API: Prepare statement failed for start_match - " . $error);
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $error]);
                break;
            }

            $stmt->bind_param("i", $matchId);
            if ($stmt->execute()) {
                error_log("API: Successfully started match $matchId");
                echo json_encode(['success' => true, 'message' => 'Match started successfully']);
            } else {
                $error = $stmt->error;
                error_log("API: Execute failed for start_match - " . $error);
                echo json_encode(['success' => false, 'message' => 'Failed to start match: ' . $error]);
            }
            $stmt->close();
            break;

        case 'finalize_match':
            $matchId = (int)($input['matchId'] ?? 0);

            if ($matchId <= 0) {
                echo json_encode(['success' => false, 'message' => 'Invalid match ID']);
                break;
            }

            $stmt = $conn->prepare("
                UPDATE matches
                SET status = 'completed', completed_at = NOW()
                WHERE id = ?
            ");
            if (!$stmt) {
                echo json_encode(['success' => false, 'message' => 'Database error']);
                break;
            }

            $stmt->bind_param("i", $matchId);
            if ($stmt->execute()) {
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to finalize match']);
            }
            $stmt->close();
            break;

        case 'assign_match_table':
            $matchId = (int)($input['matchId'] ?? 0);
            $tableId = (int)($input['tableId'] ?? 0);

            // Check if the table is available for this match category
            $result = $conn->prepare("
                SELECT m.category, pt.current_assignment, pt.assigned_category
                FROM matches m
                LEFT JOIN play_tables pt ON pt.id = ?
                WHERE m.id = ?
            ");
            $result->bind_param("ii", $tableId, $matchId);
            $result->execute();
            $data = $result->get_result()->fetch_assoc();

            $matchCategory = $data['category'];
            $currentAssignment = $data['current_assignment'];
            $assignedCategory = $data['assigned_category'];

            // Validate table assignment
            $canAssign = false;
            if ($currentAssignment === $matchCategory || $currentAssignment === 'Both') {
                $canAssign = true;
            } elseif ($currentAssignment === 'Available' && ($assignedCategory === $matchCategory || $assignedCategory === 'Both')) {
                $canAssign = true;
            }

            if (!$canAssign) {
                echo json_encode(['success' => false, 'message' => 'Table is not available for this match category']);
                return;
            }

            // Assign the table
            $stmt = $conn->prepare("UPDATE matches SET table_id = ? WHERE id = ?");
            $stmt->bind_param("ii", $tableId, $matchId);
            $stmt->execute();

            echo json_encode(['success' => true, 'message' => 'Match assigned to table successfully']);
            break;

        case 'auto_assign_matches':
            $category = $input['category'] ?? '';

            if (!in_array($category, ['Mixed Doubles', 'Men\'s Doubles'])) {
                echo json_encode(['success' => false, 'message' => 'Invalid category']);
                return;
            }

            // Get all pending matches for the category
            $matchesResult = $conn->prepare("
                SELECT id FROM matches
                WHERE category = ? AND status = 'pending' AND table_id IS NULL
                ORDER BY match_number
            ");
            $matchesResult->bind_param("s", $category);
            $matchesResult->execute();
            $pendingMatches = $matchesResult->get_result();

            // Get available tables for the category
            $tablesResult = $conn->prepare("
                SELECT id, name FROM play_tables
                WHERE (current_assignment = ? OR current_assignment = 'Both' OR
                      (current_assignment = 'Available' AND (assigned_category = ? OR assigned_category = 'Both')))
                ORDER BY
                    CASE WHEN priority_assignment = ? THEN 1 ELSE 2 END,
                    sort_order, id
            ");
            $tablesResult->bind_param("sss", $category, $category, $category);
            $tablesResult->execute();
            $availableTables = $tablesResult->get_result();

            // Simple round-robin assignment
            $tables = [];
            while ($table = $availableTables->fetch_assoc()) {
                $tables[] = $table['id'];
            }

            if (empty($tables)) {
                echo json_encode(['success' => false, 'message' => 'No tables available for this category']);
                return;
            }

            $tableIndex = 0;
            $updateStmt = $conn->prepare("UPDATE matches SET table_id = ? WHERE id = ?");

            while ($match = $pendingMatches->fetch_assoc()) {
                $tableId = $tables[$tableIndex % count($tables)];
                $updateStmt->bind_param("ii", $tableId, $match['id']);
                $updateStmt->execute();
                $tableIndex++;
            }

            echo json_encode(['success' => true, 'message' => 'Matches auto-assigned to tables successfully']);
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

function updateHousePoints($conn, $rumahId, $tournamentDate) {
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tournamentDate)) {
        $tournamentDate = date('Y-m-d'); // Fallback to today
    }

    // Get spirit marks for this rumah
    $safeTournamentDate = $conn->real_escape_string($tournamentDate);
    $spiritResult = $conn->query("
        SELECT total_score FROM spirit_marks
        WHERE rumah_id = $rumahId AND tournament_date = '$safeTournamentDate'
    ")->fetch_assoc();
    $spiritPoints = $spiritResult['total_score'] ?? 0.0;

    // Get match wins for this rumah - Fixed query to avoid duplicate counting
    $matchResult = $conn->query("
        SELECT COUNT(*) as wins FROM matches m
        WHERE m.status = 'completed' AND (
            (m.team1_id IN (SELECT id FROM teams WHERE rumah_sukan_id = $rumahId) AND m.score1 > m.score2) OR
            (m.team2_id IN (SELECT id FROM teams WHERE rumah_sukan_id = $rumahId) AND m.score2 > m.score1)
        )
    ")->fetch_assoc();
    $matchWins = $matchResult['wins'] ?? 0;

    // Check participation (both categories fielded)
    $participationResult = $conn->query("
        SELECT COUNT(*) as teams_count FROM teams
        WHERE rumah_sukan_id = $rumahId
        AND (mixed_pair_player1 != '' AND mixed_pair_player2 != '' AND
             mens_pair_player1 != '' AND mens_pair_player2 != '')
    ")->fetch_assoc();
    $hasBothCategories = ($participationResult['teams_count'] > 0) ? 1 : 0;

    // Update or insert house points
    $totalPoints = $matchWins + $hasBothCategories + $spiritPoints;

    // Use direct query instead of prepared statement to debug date issue
    $safeTournamentDate = $conn->real_escape_string($tournamentDate);
    $sql = "
        INSERT INTO house_points
        (rumah_id, tournament_date, participation_points, match_win_points, spirit_points, total_points)
        VALUES ($rumahId, '$safeTournamentDate', $hasBothCategories, $matchWins, $spiritPoints, $totalPoints)
        ON DUPLICATE KEY UPDATE
        participation_points = VALUES(participation_points),
        match_win_points = VALUES(match_win_points),
        spirit_points = VALUES(spirit_points),
        total_points = VALUES(total_points),
        updated_at = CURRENT_TIMESTAMP
    ";

    $conn->query($sql);
}

function calculateAllHousePoints($conn, $tournamentDate) {
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $tournamentDate)) {
        $tournamentDate = date('Y-m-d'); // Fallback to today
    }

    // Get all rumahs
    $rumahs = $conn->query("SELECT id FROM rumah_sukan ORDER BY id");
    while ($rumah = $rumahs->fetch_assoc()) {
        updateHousePoints($conn, $rumah['id'], $tournamentDate);
    }

    // Calculate final placements based on total points
    $safeTournamentDate = $conn->real_escape_string($tournamentDate);
    $pointsResult = $conn->query("
        SELECT rumah_id, total_points,
               @row_num := @row_num + 1 AS placement
        FROM house_points, (SELECT @row_num := 0) r
        WHERE tournament_date = '$safeTournamentDate'
        ORDER BY total_points DESC
    ");

    while ($row = $pointsResult->fetch_assoc()) {
        $rumahId = $row['rumah_id'];
        $placement = $row['placement'];
        $placementPoints = match ($placement) {
            1 => 3, // 1st place
            2 => 2, // 2nd place
            3 => 1, // 3rd place
            default => 0
        };

        // Update with placement points
        $totalWithPlacement = $row['total_points'] + $placementPoints;
        $safeTournamentDate = $conn->real_escape_string($tournamentDate);
        $sql = "
            UPDATE house_points
            SET placement_points = $placementPoints, final_placement = $placement,
                total_points = participation_points + match_win_points + spirit_points + $placementPoints
            WHERE rumah_id = $rumahId AND tournament_date = '$safeTournamentDate'
        ";
        $conn->query($sql);
    }
}
?>
