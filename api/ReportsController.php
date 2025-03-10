<?php
require_once 'Api.php';

class ReportsController extends Api {
    
    public function getReports() {
        try {
            $user = $this->getUser();
            error_log('Текущий пользователь: ' . print_r($user, true));
            
            if (!$user) {
                throw new Exception('Пользователь не авторизован');
            }

            // Получаем параметры фильтрации
            $search = $_GET['search'] ?? '';
            $status = $_GET['status'] ?? '';
            $dateFrom = $_GET['dateFrom'] ?? '';
            $dateTo = $_GET['dateTo'] ?? '';

            // Формируем базовый SQL запрос
            $sql = "SELECT r.*, m.name as author, l.name as location_name 
                   FROM reports r 
                   LEFT JOIN merchandisers m ON r.merchandiser_id = m.id 
                   LEFT JOIN locations l ON r.location_id = l.id 
                   WHERE 1=1";
            $params = [];

            // Добавляем условия фильтрации
            if ($search) {
                $sql .= " AND (l.name LIKE ? OR m.name LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            if ($status) {
                $sql .= " AND r.status = ?";
                $params[] = $status;
            }
            if ($dateFrom) {
                $sql .= " AND DATE(r.visit_date) >= ?";
                $params[] = $dateFrom;
            }
            if ($dateTo) {
                $sql .= " AND DATE(r.visit_date) <= ?";
                $params[] = $dateTo;
            }

            // Для мерчендайзера показываем только его отчеты
            if ($user['type'] === 'merchandiser') {
                $sql .= " AND r.merchandiser_id = ?";
                $params[] = $user['id'];
            }

            $sql .= " ORDER BY r.created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            error_log('SQL запрос: ' . $sql);
            error_log('Параметры: ' . print_r($params, true));
            error_log('Результат запроса: ' . print_r($reports, true));

            // Форматируем данные для фронтенда
            $reports = array_map(function($report) {
                return [
                    'id' => $report['id'],
                    'name' => $report['location_name'] . ' - Отчет от ' . date('d.m.Y', strtotime($report['visit_date'])),
                    'author' => $report['author'],
                    'created_at' => $report['created_at'],
                    'status' => $report['status'],
                    'excel_url' => $report['excel_url']
                ];
            }, $reports);

            $this->response(['success' => true, 'reports' => $reports]);

        } catch (Exception $e) {
            error_log('Ошибка в getReports: ' . $e->getMessage());
            $this->error($e->getMessage());
        }
    }

    public function uploadReport() {
        try {
            $user = $this->getUser();
            if (!$user || $user['type'] !== 'merchandiser') {
                throw new Exception('Доступ запрещен');
            }

            // Проверяем наличие файла
            if (!isset($_FILES['report']) || $_FILES['report']['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('Ошибка загрузки файла');
            }

            // Проверяем тип файла
            $allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            if (!in_array($_FILES['report']['type'], $allowedTypes)) {
                throw new Exception('Неверный формат файла. Разрешены только Excel файлы');
            }

            // Создаем директорию для отчетов если её нет
            $uploadDir = __DIR__ . '/../uploads/reports/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Генерируем уникальное имя файла
            $fileName = uniqid() . '_' . $_FILES['report']['name'];
            $filePath = $uploadDir . $fileName;

            // Перемещаем загруженный файл
            if (!move_uploaded_file($_FILES['report']['tmp_name'], $filePath)) {
                throw new Exception('Ошибка при сохранении файла');
            }

            // Сохраняем информацию в БД (убираем поле type из запроса)
            $stmt = $this->db->prepare("
                INSERT INTO reports (
                    merchandiser_id, 
                    location_id, 
                    visit_date, 
                    status, 
                    comment, 
                    excel_url
                ) VALUES (?, ?, ?, 'pending', ?, ?)
            ");

            $stmt->execute([
                $user['id'],
                $_POST['location_id'],
                $_POST['visit_date'],
                $_POST['comment'] ?? null,
                $fileName
            ]);

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function viewReport() {
        try {
            $user = $this->getUser();
            if (!$user) {
                throw new Exception('Пользователь не авторизован');
            }

            $reportId = $_GET['report_id'] ?? null;
            if (!$reportId) {
                throw new Exception('ID отчета не указан');
            }

            // Получаем информацию об отчете
            $stmt = $this->db->prepare("
                SELECT r.*, m.name as author 
                FROM reports r 
                LEFT JOIN merchandisers m ON r.merchandiser_id = m.id 
                WHERE r.id = ?
            ");
            $stmt->execute([$reportId]);
            $report = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$report) {
                throw new Exception('Отчет не найден');
            }

            // Проверяем права доступа
            if ($user['type'] === 'merchandiser' && $report['merchandiser_id'] !== $user['id']) {
                throw new Exception('Доступ запрещен');
            }

            // Формируем полный URL до файла
            $fileUrl = 'https://www.merchandising-moscow.ru/uploads/reports/' . $report['excel_url'];

            // Проверяем существование файла
            if (!file_exists(__DIR__ . '/../uploads/reports/' . $report['excel_url'])) {
                throw new Exception('Файл не найден');
            }

            // Перенаправляем на Office Online Viewer
            $redirectUrl = "https://view.officeapps.live.com/op/embed.aspx?src=" . urlencode($fileUrl);
            
            // Возвращаем URL для открытия в iframe
            $this->response([
                'success' => true,
                'viewerUrl' => $redirectUrl
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function approveReport() {
        try {
            $user = $this->getUser();
            if (!$user || $user['type'] !== 'admin') {
                throw new Exception('Доступ запрещен');
            }

            $reportId = $_GET['report_id'] ?? null;
            if (!$reportId) {
                throw new Exception('ID отчета не указан');
            }

            $stmt = $this->db->prepare("UPDATE reports SET status = 'approved' WHERE id = ?");
            $stmt->execute([$reportId]);

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function rejectReport() {
        try {
            $user = $this->getUser();
            if (!$user || $user['type'] !== 'admin') {
                throw new Exception('Доступ запрещен');
            }

            $reportId = $_GET['report_id'] ?? null;
            if (!$reportId) {
                throw new Exception('ID отчета не указан');
            }

            $stmt = $this->db->prepare("UPDATE reports SET status = 'rejected' WHERE id = ?");
            $stmt->execute([$reportId]);

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function deleteReport() {
        try {
            $user = $this->getUser();
            if (!$user || $user['type'] !== 'admin') {
                throw new Exception('Доступ запрещен');
            }

            $reportId = $_POST['report_id'] ?? null;
            if (!$reportId) {
                throw new Exception('ID отчета не указан');
            }

            // Получаем информацию о файле перед удалением
            $stmt = $this->db->prepare("SELECT excel_url FROM reports WHERE id = ?");
            $stmt->execute([$reportId]);
            $report = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($report) {
                // Удаляем физический файл
                $filePath = __DIR__ . '/../uploads/reports/' . $report['excel_url'];
                if (file_exists($filePath)) {
                    unlink($filePath);
                }
            }

            // Удаляем запись из БД
            $stmt = $this->db->prepare("DELETE FROM reports WHERE id = ?");
            $stmt->execute([$reportId]);

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
?> 