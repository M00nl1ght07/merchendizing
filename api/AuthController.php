<?php
require_once 'Api.php';
require_once __DIR__ . '/../config/mail.php';

class AuthController extends Api {
    public function login() {
        try {
            $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
            $password = $_POST['password'] ?? '';
            $userType = $_POST['userType'] ?? 'admin';

            if (!$email || !$password) {
                $this->error('Email и пароль обязательны');
            }

            if ($userType === 'admin') {
                // Проверяем в таблице users (администраторы)
                $stmt = $this->db->prepare('
                    SELECT u.*, c.name as company_name 
                    FROM users u 
                    JOIN companies c ON u.company_id = c.id 
                    WHERE u.email = ? AND u.role = ?
                ');
                $stmt->execute([$email, 'admin']);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$user || !password_verify($password, $user['password_hash'])) {
                    $this->error('Неверный email или пароль');
                }

                $user['type'] = 'admin';
            } else {
                // Проверяем в таблице merchandisers
                $stmt = $this->db->prepare('
                    SELECT m.*, c.name as company_name 
                    FROM merchandisers m 
                    JOIN companies c ON m.company_id = c.id 
                    WHERE m.email = ? AND m.status = "active"
                ');
                $stmt->execute([$email]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$user || !password_verify($password, $user['password_hash'])) {
                    $this->error('Неверный email или пароль');
                }

                $user['type'] = 'merchandiser';
            }

            // Очищаем пароль из данных сессии
            unset($user['password_hash']);

            // Сохраняем в сессию
            $_SESSION['user'] = $user;

            $this->response([
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'type' => $user['type'],
                    'company_id' => $user['company_id'],
                    'company_name' => $user['company_name'],
                    'avatar_url' => $user['avatar_url'] ?? null
                ]
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
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

            // Создаем пользователя с телефоном
            $stmt = $this->db->prepare('
                INSERT INTO users (company_id, email, password_hash, name, phone, role) 
                VALUES (?, ?, ?, ?, ?, "admin")
            ');
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $fullName = $firstName . ' ' . $lastName;
            $stmt->execute([$companyId, $email, $passwordHash, $fullName, $phone]);

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

    public function forgotPassword() {
        try {
            // Начинаем сессию если еще не начата
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }
            
            $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
            
            if (!$email) {
                $this->error('Введите корректный email');
            }

            // Проверяем существование пользователя
            $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->execute([$email]);
            if (!$stmt->fetch()) {
                $this->error('Пользователь с таким email не найден');
            }

            // Генерируем код
            $code = sprintf('%06d', random_int(0, 999999));
            
            // Сохраняем в сессии
            $_SESSION['reset_code'] = [
                'code' => $code,
                'email' => $email,
                'expires' => time() + 3600
            ];

            // Для отладки
            error_log("Reset code saved in session: " . print_r($_SESSION['reset_code'], true));

            // Отправляем код на email
            $subject = 'Восстановление пароля MerchandiseControl';
            $body = "
                <html>
                <head>
                    <title>Восстановление пароля</title>
                </head>
                <body>
                    <h2>Восстановление пароля</h2>
                    <p>Вы запросили восстановление пароля в системе MerchandiseControl.</p>
                    <p>Ваш код подтверждения: <b style='font-size: 18px;'>{$code}</b></p>
                    <p>Код действителен в течение 1 часа.</p>
                    <p>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
                </body>
                </html>
            ";

            if (!sendMail($email, $subject, $body)) {
                $this->error('Ошибка при отправке кода. Попробуйте позже.');
            }

            $this->response([
                'success' => true,
                'message' => 'Код подтверждения отправлен на email'
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function verifyResetCode() {
        try {
            // Начинаем сессию если еще не начата
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }

            $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
            $code = filter_input(INPUT_POST, 'code', FILTER_SANITIZE_STRING);
            
            // Для отладки
            error_log("Verifying code. Session data: " . print_r($_SESSION['reset_code'] ?? 'no session data', true));
            error_log("Received code: {$code}, email: {$email}");
            
            if (!$email || !$code) {
                $this->error('Неверный код подтверждения');
            }

            if (!isset($_SESSION['reset_code'])) {
                $this->error('Сессия истекла. Запросите код повторно.');
            }

            if ($_SESSION['reset_code']['email'] !== $email) {
                $this->error('Email не совпадает с запрошенным');
            }

            if ($_SESSION['reset_code']['code'] !== $code) {
                $this->error('Неверный код подтверждения');
            }

            if ($_SESSION['reset_code']['expires'] < time()) {
                $this->error('Код подтверждения истек');
            }

            $this->response([
                'success' => true,
                'message' => 'Код подтверждения верный'
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function resetPassword() {
        try {
            session_start();
            
            $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
            $code = filter_input(INPUT_POST, 'code', FILTER_SANITIZE_STRING);
            $password = $_POST['password'] ?? '';
            
            if (!$email || !$code || !$password) {
                $this->error('Все поля обязательны для заполнения');
            }

            // Проверяем код из сессии
            if (!isset($_SESSION['reset_code']) || 
                $_SESSION['reset_code']['code'] !== $code ||
                $_SESSION['reset_code']['email'] !== $email ||
                $_SESSION['reset_code']['expires'] < time()) {
                $this->error('Неверный или устаревший код подтверждения');
            }

            // Обновляем пароль
            $stmt = $this->db->prepare('
                UPDATE users 
                SET password_hash = ?
                WHERE email = ?
            ');
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $stmt->execute([$passwordHash, $email]);

            // Очищаем данные восстановления из сессии
            unset($_SESSION['reset_code']);

            $this->response([
                'success' => true,
                'message' => 'Пароль успешно изменен'
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    // Добавим метод для повторной отправки кода
    public function resendCode() {
        try {
            session_start();
            
            $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
            
            if (!$email) {
                $this->error('Введите корректный email');
            }

            // Проверяем существование пользователя
            $stmt = $this->db->prepare('SELECT id FROM users WHERE email = ?');
            $stmt->execute([$email]);
            if (!$stmt->fetch()) {
                $this->error('Пользователь с таким email не найден');
            }

            // Генерируем новый код
            $code = sprintf('%06d', random_int(0, 999999));
            $_SESSION['reset_code'] = [
                'code' => $code,
                'email' => $email,
                'expires' => time() + 3600
            ];

            // Отправляем новый код
            $subject = 'Восстановление пароля MerchandiseControl';
            $body = "
                <html>
                <head>
                    <title>Восстановление пароля</title>
                </head>
                <body>
                    <h2>Восстановление пароля</h2>
                    <p>Вы запросили повторную отправку кода для восстановления пароля.</p>
                    <p>Ваш новый код подтверждения: <b style='font-size: 18px;'>{$code}</b></p>
                    <p>Код действителен в течение 1 часа.</p>
                    <p>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
                </body>
                </html>
            ";

            if (!sendMail($email, $subject, $body)) {
                $this->error('Ошибка при отправке кода. Попробуйте позже.');
            }

            $this->response([
                'success' => true,
                'message' => 'Новый код подтверждения отправлен на email'
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function checkAuth() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            // Проверяем тип пользователя и делаем соответствующий запрос
            if ($_SESSION['user']['type'] === 'admin') {
                $stmt = $this->db->prepare('
                    SELECT u.*, c.name as company_name 
                    FROM users u 
                    JOIN companies c ON u.company_id = c.id 
                    WHERE u.id = ? AND u.role = ?
                ');
                $stmt->execute([$_SESSION['user']['id'], 'admin']);
            } else {
                $stmt = $this->db->prepare('
                    SELECT m.*, c.name as company_name 
                    FROM merchandisers m
                    JOIN companies c ON m.company_id = c.id 
                    WHERE m.id = ? AND m.status = ?
                ');
                $stmt->execute([$_SESSION['user']['id'], 'active']);
            }

            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                $this->error('Пользователь не найден');
            }

            // Добавляем тип пользователя
            $user['type'] = $_SESSION['user']['type'];
            
            // Удаляем хеш пароля
            unset($user['password_hash']);

            $this->response([
                'success' => true,
                'user' => $user
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function logout() {
        session_start();
        session_destroy();
        $this->response(['success' => true]);
    }

    public function getNotifications() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Не авторизован');
            }

            // Получаем последние уведомления для пользователя
            $stmt = $this->db->prepare('
                SELECT 
                    id,
                    title,
                    message,
                    type,
                    is_read,
                    created_at
                FROM notifications 
                WHERE company_id = ? 
                ORDER BY created_at DESC 
                LIMIT 10
            ');
            $stmt->execute([$_SESSION['user']['company_id']]);
            $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Получаем количество непрочитанных
            $stmt = $this->db->prepare('
                SELECT COUNT(*) as unread_count 
                FROM notifications 
                WHERE company_id = ? AND is_read = false
            ');
            $stmt->execute([$_SESSION['user']['company_id']]);
            $unreadCount = $stmt->fetch(PDO::FETCH_ASSOC)['unread_count'];

            $this->response([
                'success' => true,
                'notifications' => $notifications,
                'unread_count' => $unreadCount
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function markNotificationRead() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Не авторизован');
            }

            $notificationId = filter_input(INPUT_POST, 'notification_id', FILTER_VALIDATE_INT);
            
            if ($notificationId) {
                // Отмечаем одно уведомление
                $stmt = $this->db->prepare('
                    UPDATE notifications 
                    SET is_read = true 
                    WHERE id = ? AND company_id = ?
                ');
                $stmt->execute([$notificationId, $_SESSION['user']['company_id']]);
            } else {
                // Отмечаем все уведомления
                $stmt = $this->db->prepare('
                    UPDATE notifications 
                    SET is_read = true 
                    WHERE company_id = ? AND is_read = false
                ');
                $stmt->execute([$_SESSION['user']['company_id']]);
            }

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
?> 