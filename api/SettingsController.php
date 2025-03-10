<?php
require_once 'Api.php';

class SettingsController extends Api {
    
    public function getCompanySettings() {
        try {
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $companyId = $_SESSION['user']['company_id'];

            // Получаем данные компании
            $stmt = $this->db->prepare('
                SELECT name, inn, address, phone
                FROM companies 
                WHERE id = ?
            ');
            $stmt->execute([$companyId]);
            $company = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$company) {
                $this->error('Компания не найдена');
            }

            $this->response([
                'success' => true,
                'company' => $company
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateCompany() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $companyId = $_SESSION['user']['company_id'];
            $name = filter_input(INPUT_POST, 'company_name', FILTER_SANITIZE_STRING);
            $inn = filter_input(INPUT_POST, 'inn', FILTER_SANITIZE_STRING);
            $address = filter_input(INPUT_POST, 'address', FILTER_SANITIZE_STRING);
            $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_STRING);

            if (!$name || !$inn || !$address || !$phone) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Обновляем данные компании
            $stmt = $this->db->prepare('
                UPDATE companies 
                SET name = ?, inn = ?, address = ?, phone = ?
                WHERE id = ?
            ');
            $stmt->execute([$name, $inn, $address, $phone, $companyId]);

            // Обновляем телефон у всех пользователей компании
            $stmt = $this->db->prepare('
                UPDATE users 
                SET phone = ?
                WHERE company_id = ?
            ');
            $stmt->execute([$phone, $companyId]);

            // Обновляем данные в сессии
            $_SESSION['user']['company_name'] = $name;
            $_SESSION['user']['phone'] = $phone;

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateSettings() {
        try {
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            // Проверяем, что пользователь является админом
            if ($_SESSION['user']['type'] !== 'admin') {
                $this->error('Недостаточно прав для изменения настроек');
            }

            $companyId = $_SESSION['user']['company_id'];
            $name = filter_input(INPUT_POST, 'company_name', FILTER_SANITIZE_STRING);
            $inn = filter_input(INPUT_POST, 'inn', FILTER_SANITIZE_STRING);
            $address = filter_input(INPUT_POST, 'address', FILTER_SANITIZE_STRING);
            $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_STRING);

            if (!$name || !$inn || !$address || !$phone) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Обновляем данные компании
            $stmt = $this->db->prepare('
                UPDATE companies 
                SET name = ?, inn = ?, address = ?, phone = ?
                WHERE id = ?
            ');
            $stmt->execute([$name, $inn, $address, $phone, $companyId]);

            // Обновляем телефон у всех пользователей компании
            $stmt = $this->db->prepare('
                UPDATE users 
                SET phone = ?
                WHERE company_id = ?
            ');
            $stmt->execute([$phone, $companyId]);

            // Обновляем данные в сессии
            $_SESSION['user']['company_name'] = $name;
            $_SESSION['user']['phone'] = $phone;

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
?> 