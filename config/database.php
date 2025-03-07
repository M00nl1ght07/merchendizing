<?php
// Отключаем вывод ошибок PHP
error_reporting(0);
ini_set('display_errors', 0);

define('DB_HOST', 'localhost');
define('DB_NAME', 'u3009812_merchandizer');
define('DB_USER', 'u3009812_merchan');
define('DB_PASS', 'u3009812_merchan');

try {
    $db = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8",
        DB_USER,
        DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch(PDOException $e) {
    header('Content-Type: application/json; charset=utf-8');
    die(json_encode(['error' => 'Ошибка подключения к БД']));
}
?> 