<?php
require_once 'Api.php';

class ProfileController extends Api {
    
    public function getProfile() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $userId = $_SESSION['user']['id'];

            // Получаем полные данные профиля
            $stmt = $this->db->prepare('
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    u.role,
                    u.avatar_url,
                    u.phone,
                    c.name as company_name,
                    c.id as company_id
                FROM users u
                LEFT JOIN companies c ON u.company_id = c.id
                WHERE u.id = ?
            ');
            $stmt->execute([$userId]);
            $profile = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$profile) {
                $this->error('Профиль не найден');
            }

            // Получаем статистику активности
            $stmt = $this->db->prepare('
                SELECT 
                    COUNT(r.id) as reports_count,
                    (SELECT COUNT(*) FROM merchandisers WHERE company_id = ? AND status = "active") as active_merchandisers,
                    COALESCE(AVG(r.efficiency), 0) as avg_efficiency
                FROM reports r
                JOIN merchandisers m ON r.merchandiser_id = m.id
                WHERE m.company_id = ?
            ');
            $stmt->execute([$profile['company_id'], $profile['company_id']]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            $this->response([
                'success' => true,
                'profile' => $profile,
                'stats' => [
                    'reports' => (int)$stats['reports_count'],
                    'merchandisers' => (int)$stats['active_merchandisers'],
                    'efficiency' => round($stats['avg_efficiency'])
                ]
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateProfile() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $userId = $_SESSION['user']['id'];
            $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING);
            $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
            $phone = filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_STRING);

            if (!$name || !$email || !$phone) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Проверяем, не занят ли email другим пользователем
            $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
            $stmt->execute([$email, $userId]);
            if ($stmt->fetch()) {
                $this->error('Этот email уже используется');
            }

            // Обновляем данные в таблице users
            $stmt = $this->db->prepare('
                UPDATE users 
                SET name = ?, email = ?, phone = ?
                WHERE id = ?
            ');
            $stmt->execute([$name, $email, $phone, $userId]);

            // Обновляем данные в сессии
            $_SESSION['user']['name'] = $name;
            $_SESSION['user']['email'] = $email;
            $_SESSION['user']['phone'] = $phone;

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updatePassword() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $userId = $_SESSION['user']['id'];
            $currentPassword = $_POST['currentPassword'] ?? '';
            $newPassword = $_POST['newPassword'] ?? '';

            if (!$currentPassword || !$newPassword) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Проверяем текущий пароль
            $stmt = $this->db->prepare('SELECT password_hash FROM users WHERE id = ?');
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!password_verify($currentPassword, $user['password_hash'])) {
                $this->error('Неверный текущий пароль');
            }

            // Обновляем пароль
            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $this->db->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
            $stmt->execute([$newHash, $userId]);

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateAvatar() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            if (!isset($_FILES['avatar'])) {
                $this->error('Файл не загружен');
            }

            $file = $_FILES['avatar'];
            $userId = $_SESSION['user']['id'];
            
            // Проверяем тип файла
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!in_array($file['type'], $allowedTypes)) {
                $this->error('Недопустимый тип файла');
            }

            // Генерируем новое имя файла
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $newFileName = 'avatar_' . $userId . '_' . time() . '.' . $ext;
            $uploadPath = '../uploads/avatars/' . $newFileName;

            // Создаем директорию, если её нет
            if (!file_exists('../uploads/avatars')) {
                mkdir('../uploads/avatars', 0777, true);
            }

            // Перемещаем файл
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                $this->error('Ошибка при загрузке файла');
            }

            // Обновляем путь к аватару в БД
            $avatarUrl = 'uploads/avatars/' . $newFileName;
            $stmt = $this->db->prepare('UPDATE users SET avatar_url = ? WHERE id = ?');
            $stmt->execute([$avatarUrl, $userId]);

            // Обновляем данные в сессии
            $_SESSION['user']['avatar_url'] = $avatarUrl;

            $this->response([
                'success' => true,
                'avatar_url' => $avatarUrl
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
?> 