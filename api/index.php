<?php
// Отключаем вывод ошибок PHP
error_reporting(0);
ini_set('display_errors', 0);

// Настройки сессии
ini_set('session.cookie_lifetime', '3600');
ini_set('session.gc_maxlifetime', '3600');
session_start();

require_once '../config/database.php';
require_once 'AuthController.php';

// Устанавливаем заголовки
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$controller = $_GET['controller'] ?? '';

try {
    switch ($controller) {
        case 'auth':
            $auth = new AuthController($db);
            switch ($action) {
                case 'login':
                    $auth->login();
                    break;
                case 'register':
                    $auth->register();
                    break;
                case 'forgotPassword':
                    $auth->forgotPassword();
                    break;
                case 'verifyResetCode':
                    $auth->verifyResetCode();
                    break;
                case 'resetPassword':
                    $auth->resetPassword();
                    break;
                case 'resendCode':
                    $auth->resendCode();
                    break;
                default:
                    throw new Exception('Неизвестное действие');
            }
            break;
            
        default:
            throw new Exception('Неизвестный контроллер');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?> 