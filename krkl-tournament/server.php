<?php
// Simple PHP server to serve the API
$host = 'localhost';
$port = 8000;

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
    exit();
}

// Route the request
$request_uri = $_SERVER['REQUEST_URI'];
$request_method = $_SERVER['REQUEST_METHOD'];

// Simple routing
if (strpos($request_uri, '/api.php') !== false) {
    // Serve the API
    include 'api.php';
} else {
    // Serve static files or fallback
    $file_path = __DIR__ . '/public' . $request_uri;
    
    if (file_exists($file_path) && is_file($file_path)) {
        $mime_type = mime_content_type($file_path);
        header('Content-Type: ' . $mime_type);
        readfile($file_path);
    } else {
        // Fallback to index.html for SPA
        header('Content-Type: text/html');
        readfile(__DIR__ . '/public/index.html');
    }
}
?>
