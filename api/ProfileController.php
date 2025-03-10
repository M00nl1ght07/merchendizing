<?php
require_once 'Api.php';

class ProfileController extends Api {
    
    public function getProfile() {
        try {
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $user = $_SESSION['user'];
            
            // Проверяем тип пользователя из сессии
            if ($user['type'] === 'admin') {
                $stmt = $this->db->prepare('
                    SELECT u.*, c.name as company_name 
                    FROM users u 
                    JOIN companies c ON u.company_id = c.id 
                    WHERE u.id = ? AND u.role = "admin"
                ');
                $stmt->execute([$user['id']]);
            } else {
                $stmt = $this->db->prepare('
                    SELECT m.*, c.name as company_name 
                    FROM merchandisers m 
                    JOIN companies c ON m.company_id = c.id 
                    WHERE m.id = ? AND m.status = "active"
                ');
                $stmt->execute([$user['id']]);
            }

            $profile = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$profile) {
                $this->error('Профиль не найден');
            }

            $this->response([
                'success' => true,
                'profile' => $profile
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateProfile() {
        try {
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $user = $_SESSION['user'];
            
            // Получаем данные из формы
            $name = $_POST['name'] ?? '';
            $email = $_POST['email'] ?? '';
            $phone = $_POST['phone'] ?? '';

            // Проверяем тип пользователя из сессии
            if ($user['type'] === 'admin') {
                $stmt = $this->db->prepare('
                    UPDATE users 
                    SET name = ?, email = ?, phone = ? 
                    WHERE id = ? AND role = "admin"
                ');
                $stmt->execute([$name, $email, $phone, $user['id']]);
            } else {
                $region = $_POST['region'] ?? '';
                $stmt = $this->db->prepare('
                    UPDATE merchandisers 
                    SET name = ?, email = ?, phone = ?, region = ? 
                    WHERE id = ? AND status = "active"
                ');
                $stmt->execute([$name, $email, $phone, $region, $user['id']]);

                // Обновляем данные в сессии
                $_SESSION['user']['name'] = $name;
                $_SESSION['user']['email'] = $email;
                $_SESSION['user']['phone'] = $phone;
                $_SESSION['user']['region'] = $region;
            }

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updatePassword() {
        try {
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $user = $_SESSION['user'];
            $currentPassword = $_POST['currentPassword'] ?? '';
            $newPassword = $_POST['newPassword'] ?? '';

            if (!$currentPassword || !$newPassword) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Проверяем текущий пароль в зависимости от типа пользователя
            if ($user['type'] === 'admin') {
                $stmt = $this->db->prepare('SELECT password_hash FROM users WHERE id = ? AND role = "admin"');
            } else {
                $stmt = $this->db->prepare('SELECT password_hash FROM merchandisers WHERE id = ? AND status = "active"');
            }
            
            $stmt->execute([$user['id']]);
            $userData = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$userData || !password_verify($currentPassword, $userData['password_hash'])) {
                $this->error('Неверный текущий пароль');
            }

            // Обновляем пароль
            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            
            if ($user['type'] === 'admin') {
                $stmt = $this->db->prepare('UPDATE users SET password_hash = ? WHERE id = ? AND role = "admin"');
            } else {
                $stmt = $this->db->prepare('UPDATE merchandisers SET password_hash = ? WHERE id = ? AND status = "active"');
            }
            
            $stmt->execute([$newHash, $user['id']]);

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateAvatar() {
        try {
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            if (!isset($_FILES['avatar'])) {
                $this->error('Файл не загружен');
            }

            $file = $_FILES['avatar'];
            $user = $_SESSION['user'];
            
            // Проверяем тип файла
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!in_array($file['type'], $allowedTypes)) {
                $this->error('Недопустимый тип файла');
            }

            // Генерируем новое имя файла
            $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
            $newFileName = 'avatar_' . $user['id'] . '_' . time() . '.' . $ext;
            $uploadPath = '../uploads/avatars/' . $newFileName;

            // Создаем директорию, если её нет
            if (!file_exists('../uploads/avatars')) {
                mkdir('../uploads/avatars', 0777, true);
            }

            // Перемещаем файл
            if (!move_uploaded_file($file['tmp_name'], $uploadPath)) {
                $this->error('Ошибка при загрузке файла');
            }

            // Обновляем путь к аватару в БД в зависимости от типа пользователя
            $avatarUrl = 'uploads/avatars/' . $newFileName;
            
            if ($user['type'] === 'admin') {
                $stmt = $this->db->prepare('UPDATE users SET avatar_url = ? WHERE id = ? AND role = "admin"');
            } else {
                $stmt = $this->db->prepare('UPDATE merchandisers SET avatar_url = ? WHERE id = ? AND status = "active"');
            }
            
            $stmt->execute([$avatarUrl, $user['id']]);

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