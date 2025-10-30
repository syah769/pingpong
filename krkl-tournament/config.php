<?php
// Database configuration with sensible dev defaults.
$dbHost = getenv('DB_HOST') ?: '127.0.0.1';
$dbUser = getenv('DB_USER') ?: 'root';
$dbPass = getenv('DB_PASS') ?: '';
$dbName = getenv('DB_NAME') ?: 'krkl_tournament';
$dbPort = (int)(getenv('DB_PORT') ?: 3306);
$dbSocket = getenv('DB_SOCKET') ?: null;

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = mysqli_init();

    // Attempt socket connection when provided, fall back to TCP otherwise.
    if ($dbSocket) {
        $conn->real_connect($dbHost, $dbUser, $dbPass, $dbName, $dbPort, $dbSocket);
    } else {
        $conn->real_connect($dbHost, $dbUser, $dbPass, $dbName, $dbPort);
    }

    $conn->set_charset('utf8mb4');
} catch (mysqli_sql_exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed',
        'details' => $e->getMessage(),
    ]);
    exit;
}

// Suppress PHP notices from leaking into JSON responses.
error_reporting(E_ALL & ~E_NOTICE);
ini_set('display_errors', 0);
