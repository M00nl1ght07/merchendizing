<?php
require_once 'Api.php';

class AuthController extends Api {
    public function login() {
        $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
        $password = $_POST['password'] ?? '';
        
        if (!$email || !$password) {
            $this->error('Неверный email или пароль');
        }
        
        $stmt = $this->db->prepare('SELECT id, password_hash, name, role FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->error('Неверный email или пароль');
        }
        
        session_start();
        $_SESSION['user'] = [
            'id' => $user['id'],
            'name' => $user['name'],
            'role' => $user['role']
        ];
        
        $this->response([
            'success' => true,
            'user' => $_SESSION['user']
        ]);
    }

    public function register() {
        try {
            // Отключаем вывод ошибок
            error_reporting(0);
            ini_set('display_errors', 0);
            
            // Получаем данные
            $company = html_entity_decode(
                trim(filter_input(INPUT_POST, 'company', FILTER_SANITIZE_STRING)), 
                ENT_QUOTES, 
                'UTF-8'
            );
            $inn = trim(filter_input(INPUT_POST, 'inn', FILTER_SANITIZE_STRING));
            $firstName = trim(filter_input(INPUT_POST, 'firstName', FILTER_SANITIZE_STRING));
            $lastName = trim(filter_input(INPUT_POST, 'lastName', FILTER_SANITIZE_STRING));
            $email = trim(filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL));
            $phone = trim(filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_STRING));
            $password = $_POST['password'] ?? '';
            
            // Проверяем обязательные поля
            if (!$company || !$inn || !$firstName || !$lastName || !$email || !$phone || !$password) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Проверяем формат ИНН
            if (!preg_match('/^\d{10}(\d{2})?$/', $inn)) {
                $this->error('Неверный формат ИНН');
            }

            // Проверяем, не занят ли email
            $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $this->error('Этот email уже зарегистрирован');
            }

            // Проверяем, не занят ли ИНН
            $stmt = $this->db->prepare('SELECT id FROM companies WHERE inn = ?');
            $stmt->execute([$inn]);
            if ($stmt->fetch()) {
                $this->error('Компания с таким ИНН уже зарегистрирована');
            }

            $this->db->beginTransaction();

            // Создаем компанию
            $stmt = $this->db->prepare('
                INSERT INTO companies (name, inn, phone, address) 
                VALUES (?, ?, ?, ?)
            ');
            $stmt->execute([$company, $inn, $phone, 'Адрес не указан']);
            $companyId = $this->db->lastInsertId();

            // Создаем пользователя
            $stmt = $this->db->prepare('
                INSERT INTO users (company_id, email, password_hash, name, role) 
                VALUES (?, ?, ?, ?, ?)
            ');
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $fullName = $firstName . ' ' . $lastName;
            $stmt->execute([$companyId, $email, $passwordHash, $fullName, 'admin']);

            $this->db->commit();

            $this->response([
                'success' => true,
                'message' => 'Регистрация успешно завершена'
            ]);

        } catch (Exception $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            $this->error($e->getMessage());
        }
    }

    public function updateCompany() {
        try {
            // Проверяем авторизацию
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $companyId = filter_input(INPUT_POST, 'company_id', FILTER_VALIDATE_INT);
            $address = trim(filter_input(INPUT_POST, 'address', FILTER_SANITIZE_STRING));
            
            // Если загружается логотип
            $logoUrl = null;
            if (isset($_FILES['logo']) && $_FILES['logo']['error'] === UPLOAD_ERR_OK) {
                $logoUrl = $this->uploadLogo($_FILES['logo']);
            }

            $sql = 'UPDATE companies SET address = ?';
            $params = [$address];

            if ($logoUrl) {
                $sql .= ', logo_url = ?';
                $params[] = $logoUrl;
            }

            $sql .= ' WHERE id = ?';
            $params[] = $companyId;

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);

            $this->response([
                'success' => true,
                'message' => 'Данные компании обновлены'
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    // Метод для загрузки логотипа
    private function uploadLogo($file) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        $maxSize = 5 * 1024 * 1024; // 5MB

        if (!in_array($file['type'], $allowedTypes)) {
            throw new Exception('Неверный формат файла. Разрешены: JPG, PNG, GIF');
        }

        if ($file['size'] > $maxSize) {
            throw new Exception('Размер файла не должен превышать 5MB');
        }

        $uploadDir = '../uploads/logos/';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileName = uniqid() . '_' . basename($file['name']);
        $filePath = $uploadDir . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $filePath)) {
            throw new Exception('Ошибка при загрузке файла');
        }

        return 'uploads/logos/' . $fileName;
    }
}
?> 