<?php
// Start the PHP development server
echo "Starting KRKL Tournament Server on http://localhost:8000\n";
echo "API available at: http://localhost:8000/krkl-tournament/api.php\n";
echo "Frontend available at: http://localhost:8000/krkl-tournament/public/\n";
echo "Database: krkl_tournament (MySQL)\n";
echo "\nTo setup database:\n";
echo "1. Import database.sql in phpMyAdmin\n";
echo "2. Update config.php with your database credentials\n";
echo "3. Run: php start.php\n";
echo "\nPress Ctrl+C to stop the server\n";

// Start the built-in PHP server
$host = 'localhost';
$port = 8000;
$docroot = __DIR__ . '/public';

echo "Server starting on $host:$port...\n";
shell_exec("php -S $host:$port -t $docroot");
?>