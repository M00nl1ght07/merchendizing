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
require_once 'DashboardController.php';
require_once 'ProfileController.php';
require_once 'SettingsController.php';
require_once 'ReportsController.php';
require_once 'MerchandisersController.php';
require_once 'LocationsController.php';
require_once 'StatsController.php';

// Устанавливаем заголовки
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE');
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
                case 'checkAuth':
                    $auth->checkAuth();
                    break;
                case 'logout':
                    $auth->logout();
                    break;
                case 'getNotifications':
                    $auth->getNotifications();
                    break;
                case 'markNotificationRead':
                    $auth->markNotificationRead();
                    break;
                default:
                    throw new Exception('Неизвестное действие');
            }
            break;
        case 'dashboard':
            $dashboard = new DashboardController($db);
            switch ($action) {
                case 'getStats':
                    $dashboard->getStats();
                    break;
                case 'getTopMerchandisers':
                    $dashboard->getTopMerchandisers();
                    break;
                default:
                    throw new Exception('Неизвестное действие');
            }
            break;
        case 'profile':
            $profile = new ProfileController($db);
            switch ($action) {
                case 'getProfile':
                    $profile->getProfile();
                    break;
                case 'updateProfile':
                    $profile->updateProfile();
                    break;
                case 'updatePassword':
                    $profile->updatePassword();
                    break;
                case 'updateAvatar':
                    $profile->updateAvatar();
                    break;
                default:
                    throw new Exception('Неизвестное действие');
            }
            break;
        case 'settings':
            $settings = new SettingsController($db);
            switch ($action) {
                case 'getCompanySettings':
                    $settings->getCompanySettings();
                    break;
                case 'updateCompany':
                    $settings->updateCompany();
                    break;
                default:
                    throw new Exception('Неизвестное действие');
            }
            break;
        case 'reports':
            $reports = new ReportsController($db);
            switch ($action) {
                case 'getReports':
                    $reports->getReports();
                    break;
                case 'uploadReport':
                    $reports->uploadReport();
                    break;
                case 'viewReport':
                    $reports->viewReport();
                    break;
                case 'approveReport':
                    $reports->approveReport();
                    break;
                case 'rejectReport':
                    $reports->rejectReport();
                    break;
                case 'deleteReport':
                    $reports->deleteReport();
                    break;
                default:
                    throw new Exception('Неизвестное действие');
            }
            break;
        case 'merchandisers':
            $merchandisers = new MerchandisersController($db);
            switch ($action) {
                case 'getMerchandisers':
                    $merchandisers->getMerchandisers();
                    break;
                case 'addMerchandiser':
                    $merchandisers->addMerchandiser();
                    break;
                case 'getMerchandiser':
                    $merchandisers->getMerchandiser();
                    break;
                case 'updateMerchandiser':
                    $merchandisers->updateMerchandiser();
                    break;
                case 'deleteMerchandiser':
                    $merchandisers->deleteMerchandiser();
                    break;
                default:
                    throw new Exception('Неизвестное действие');
            }
            break;
        case 'locations':
            $locations = new LocationsController($db);
            switch ($action) {
                case 'getLocations':
                    $locations->getLocations();
                    break;
                case 'addLocation':
                    $locations->addLocation();
                    break;
                case 'updateLocation':
                    $locations->updateLocation();
                    break;
                case 'deleteLocation':
                    $locations->deleteLocation();
                    break;
                case 'getLocation':
                    $locations->getLocation();
                    break;
                case 'getLocationMerchandisers':
                    $locations->getLocationMerchandisers();
                    break;
                case 'updateLocationMerchandisers':
                    $locations->updateLocationMerchandisers();
                    break;
                case 'getMerchandiserLocations':
                    $locations->getMerchandiserLocations();
                    break;
                default:
                    throw new Exception('Неизвестное действие');
            }
            break;
        case 'stats':
            $stats = new StatsController($db);
            switch ($action) {
                case 'updateStats':
                    $stats->updateStats();
                    break;
                case 'getDashboardStats':
                    $stats->getDashboardStats();
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
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 