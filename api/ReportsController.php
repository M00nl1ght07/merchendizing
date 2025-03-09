<?php
require_once 'Api.php';

class ReportsController extends Api {
    
    public function getReports() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $companyId = $_SESSION['user']['company_id'];
            
            // Получаем параметры фильтрации
            $search = $_GET['search'] ?? '';
            $type = $_GET['type'] ?? '';
            $status = $_GET['status'] ?? '';
            $startDate = $_GET['startDate'] ?? '';
            $endDate = $_GET['endDate'] ?? '';

            // Базовый SQL запрос с учетом существующей структуры
            $sql = "
                SELECT 
                    r.id,
                    CONCAT('Отчет по ТТ #', l.id) as name,
                    'Ежедневный' as type,
                    r.status,
                    r.excel_url as file_path,
                    r.created_at,
                    m.name as author,
                    r.comment,
                    r.efficiency
                FROM reports r
                JOIN merchandisers m ON r.merchandiser_id = m.id
                JOIN locations l ON r.location_id = l.id
                WHERE m.company_id = ?
            ";
            $params = [$companyId];

            // Добавляем условия фильтрации
            if ($search) {
                $sql .= " AND l.name LIKE ?";
                $params[] = "%$search%";
            }
            if ($status) {
                $sql .= " AND r.status = ?";
                $params[] = $status;
            }
            if ($startDate) {
                $sql .= " AND DATE(r.visit_date) >= ?";
                $params[] = $startDate;
            }
            if ($endDate) {
                $sql .= " AND DATE(r.visit_date) <= ?";
                $params[] = $endDate;
            }

            $sql .= " ORDER BY r.created_at DESC";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->response([
                'success' => true,
                'reports' => $reports
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function uploadReport() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $name = $_POST['name'] ?? '';
            $type = $_POST['type'] ?? '';
            $comment = $_POST['comment'] ?? '';
            $file = $_FILES['file'] ?? null;

            if (!$name || !$type || !$file) {
                $this->error('Не все поля заполнены');
            }

            // Проверяем тип файла
            $allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
            if (!in_array($file['type'], $allowedTypes)) {
                $this->error('Неверный формат файла');
            }

            // Создаем директорию для отчетов если её нет
            $uploadDir = '../uploads/reports/' . $_SESSION['user']['company_id'] . '/';
            if (!file_exists($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }

            // Генерируем уникальное имя файла
            $fileName = uniqid() . '_' . $file['name'];
            $filePath = $uploadDir . $fileName;

            // Загружаем файл
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                $this->error('Ошибка при загрузке файла');
            }

            // Сохраняем информацию в БД
            $stmt = $this->db->prepare("
                INSERT INTO reports (
                    company_id, user_id, name, type, 
                    file_path, comment, status
                ) VALUES (?, ?, ?, ?, ?, ?, 'new')
            ");
            
            $stmt->execute([
                $_SESSION['user']['company_id'],
                $_SESSION['user']['id'],
                $name,
                $type,
                'uploads/reports/' . $_SESSION['user']['company_id'] . '/' . $fileName,
                $comment
            ]);

            $this->response([
                'success' => true,
                'message' => 'Отчет успешно загружен'
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function deleteReport() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $reportId = $_POST['report_id'] ?? null;
            if (!$reportId) {
                $this->error('ID отчета не указан');
            }

            // Получаем информацию о файле
            $stmt = $this->db->prepare("
                SELECT file_path 
                FROM reports 
                WHERE id = ? AND company_id = ?
            ");
            $stmt->execute([$reportId, $_SESSION['user']['company_id']]);
            $report = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$report) {
                $this->error('Отчет не найден');
            }

            // Удаляем файл
            $filePath = '../' . $report['file_path'];
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            // Удаляем запись из БД
            $stmt = $this->db->prepare("
                DELETE FROM reports 
                WHERE id = ? AND company_id = ?
            ");
            $stmt->execute([$reportId, $_SESSION['user']['company_id']]);

            $this->response([
                'success' => true,
                'message' => 'Отчет успешно удален'
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
?> 