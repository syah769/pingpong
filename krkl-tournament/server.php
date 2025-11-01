<?php
// Simple PHP server to serve the API
$host = 'localhost';
$port = 8000;

$allowedOrigins = [
    'http://localhost:3000',
    'http://pingpong.test',
    'https://pingpong-lfsa.ngrok.dev',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
} else {
    header('Access-Control-Allow-Origin: https://ad388fd6bd6b.ngrok-free.app');
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
} elseif (strpos($request_uri, '/admin') === 0) {
    // Serve admin React app
    if ($request_uri === '/admin' || $request_uri === '/admin/') {
        // Serve admin index.html
        header('Content-Type: text/html');
        readfile(__DIR__ . '/admin/index.html');
    } elseif (preg_match('/\/admin\/static\/(.+)/', $request_uri, $matches)) {
        // Serve static files
        $static_file = __DIR__ . '/admin/static/' . $matches[1];
        if (file_exists($static_file) && is_file($static_file)) {
            $extension = strtolower(pathinfo($static_file, PATHINFO_EXTENSION));
            $mime_types = [
                'js' => 'application/javascript',
                'css' => 'text/css',
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'ico' => 'image/x-icon',
                'json' => 'application/json'
            ];
            $mime_type = $mime_types[$extension] ?? 'text/plain';
            header('Content-Type: ' . $mime_type);
            readfile($static_file);
        } else {
            http_response_code(404);
            echo 'File not found';
        }
    } elseif (preg_match('/\/admin\/(.+)/', $request_uri, $matches)) {
        // Serve other root files like favicon.ico, manifest.json
        $file = __DIR__ . '/admin/' . $matches[1];
        if (file_exists($file) && is_file($file)) {
            $mime_type = mime_content_type($file);
            header('Content-Type: ' . $mime_type);
            readfile($file);
        } else {
            // Fallback to admin index.html for SPA routing
            header('Content-Type: text/html');
            readfile(__DIR__ . '/admin/index.html');
        }
    } else {
        // Fallback to admin index.html for SPA
        header('Content-Type: text/html');
        readfile(__DIR__ . '/admin/index.html');
    }
} elseif (strpos($request_uri, '/public') === 0) {
    // Serve public display React app from public-display build
    if ($request_uri === '/public' || $request_uri === '/public/') {
        // Serve public-display index.html
        header('Content-Type: text/html');
        readfile(__DIR__ . '/public-display/index.html');
    } elseif (preg_match('/\/public\/static\/(.+)/', $request_uri, $matches)) {
        // Serve static files from public-display build
        $static_file = __DIR__ . '/public-display/static/' . $matches[1];
        if (file_exists($static_file) && is_file($static_file)) {
            $extension = strtolower(pathinfo($static_file, PATHINFO_EXTENSION));
            $mime_types = [
                'js' => 'application/javascript',
                'css' => 'text/css',
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'ico' => 'image/x-icon',
                'json' => 'application/json'
            ];
            $mime_type = $mime_types[$extension] ?? 'text/plain';
            header('Content-Type: ' . $mime_type);
            readfile($static_file);
        } else {
            http_response_code(404);
            echo 'File not found';
        }
    } elseif (preg_match('/\/public\/(.+)/', $request_uri, $matches)) {
        // Serve other root files from public-display build
        $file = __DIR__ . '/public-display/' . $matches[1];
        if (file_exists($file) && is_file($file)) {
            $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
            $mime_types = [
                'js' => 'application/javascript',
                'css' => 'text/css',
                'png' => 'image/png',
                'jpg' => 'image/jpeg',
                'jpeg' => 'image/jpeg',
                'gif' => 'image/gif',
                'svg' => 'image/svg+xml',
                'ico' => 'image/x-icon',
                'json' => 'application/json'
            ];
            $mime_type = $mime_types[$extension] ?? mime_content_type($file);
            header('Content-Type: ' . $mime_type);
            readfile($file);
        } else {
            // Fallback to public-display index.html for SPA routing
            header('Content-Type: text/html');
            readfile(__DIR__ . '/public-display/index.html');
        }
    } else {
        // Fallback to public-display index.html for SPA
        header('Content-Type: text/html');
        readfile(__DIR__ . '/public-display/index.html');
    }
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
