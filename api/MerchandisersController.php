<?php
require_once 'Api.php';

class MerchandisersController extends Api {
    
    public function getMerchandisers() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $companyId = $_SESSION['user']['company_id'];
            
            // Отладочная информация
            error_log("Загрузка мерчандайзеров для компании: $companyId");
            
            // Получаем параметры фильтрации
            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? '';
            $region = $_GET['region'] ?? '';

            // Базовый SQL запрос
            $sql = "
                SELECT 
                    m.id,
                    m.name,
                    m.email,
                    m.phone,
                    m.region,
                    m.status,
                    m.avatar_url,
                    COUNT(DISTINCT r.id) as reports_count,
                    COUNT(DISTINCT CASE WHEN r.visit_date IS NOT NULL THEN r.id END) as visits_count,
                    COALESCE(AVG(r.efficiency), 0) as efficiency
                FROM merchandisers m
                LEFT JOIN reports r ON m.id = r.merchandiser_id
                WHERE m.company_id = ?
            ";
            $params = [$companyId];

            if ($search) {
                $sql .= " AND (m.name LIKE ? OR m.email LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            if ($status) {
                $sql .= " AND m.status = ?";
                $params[] = $status;
            }
            if ($region) {
                $sql .= " AND m.region = ?";
                $params[] = $region;
            }

            $sql .= " GROUP BY m.id ORDER BY m.created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $merchandisers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Отладочная информация
            error_log("Найдено мерчандайзеров: " . count($merchandisers));
            error_log("SQL запрос: $sql");
            error_log("Параметры: " . print_r($params, true));

            $this->response([
                'success' => true,
                'merchandisers' => $merchandisers
            ]);

        } catch (Exception $e) {
            error_log("Ошибка при загрузке мерчандайзеров: " . $e->getMessage());
            $this->error($e->getMessage());
        }
    }

    public function addMerchandiser() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING);
            $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
            $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_STRING);
            $region = filter_input(INPUT_POST, 'region', FILTER_SANITIZE_STRING);
            $password = $_POST['password'] ?? '';

            if (!$name || !$email || !$phone || !$region || !$password) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Проверяем уникальность email
            $stmt = $this->db->prepare("SELECT id FROM merchandisers WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $this->error('Мерчандайзер с таким email уже существует');
            }

            // Хешируем пароль
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);

            // Добавляем мерчандайзера
            $stmt = $this->db->prepare("
                INSERT INTO merchandisers (
                    company_id, name, email, phone, 
                    region, password_hash, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'active')
            ");
            
            $stmt->execute([
                $_SESSION['user']['company_id'],
                $name,
                $email,
                $phone,
                $region,
                $passwordHash
            ]);

            $this->response([
                'success' => true,
                'message' => 'Мерчандайзер успешно добавлен'
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function getMerchandiser() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
            if (!$id) {
                $this->error('Некорректный ID мерчандайзера');
            }

            $stmt = $this->db->prepare('
                SELECT id, name, email, phone, region, status 
                FROM merchandisers 
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$id, $_SESSION['user']['company_id']]);
            $merchandiser = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$merchandiser) {
                $this->error('Мерчандайзер не найден');
            }

            $this->response([
                'success' => true,
                'merchandiser' => $merchandiser
            ]);
        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateMerchandiser() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING);
            $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
            $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_STRING);
            $region = filter_input(INPUT_POST, 'region', FILTER_SANITIZE_STRING);
            $status = filter_input(INPUT_POST, 'status', FILTER_SANITIZE_STRING);

            if (!$id || !$name || !$email || !$phone || !$region || !$status) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Проверяем, существует ли мерчандайзер
            $stmt = $this->db->prepare('
                SELECT id FROM merchandisers 
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$id, $_SESSION['user']['company_id']]);
            if (!$stmt->fetch()) {
                $this->error('Мерчандайзер не найден');
            }

            // Обновляем данные
            $stmt = $this->db->prepare('
                UPDATE merchandisers 
                SET name = ?, email = ?, phone = ?, region = ?, status = ?
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$name, $email, $phone, $region, $status, $id, $_SESSION['user']['company_id']]);

            $this->response(['success' => true]);
        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function deleteMerchandiser() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
            if (!$id) {
                $this->error('Некорректный ID мерчандайзера');
            }

            // Проверяем, существует ли мерчандайзер
            $stmt = $this->db->prepare('
                SELECT id FROM merchandisers 
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$id, $_SESSION['user']['company_id']]);
            if (!$stmt->fetch()) {
                $this->error('Мерчандайзер не найден');
            }

            // Удаляем мерчандайзера
            $stmt = $this->db->prepare('
                DELETE FROM merchandisers 
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$id, $_SESSION['user']['company_id']]);

            $this->response(['success' => true]);
        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
?> 