<?php
require_once 'Api.php';

class DashboardController extends Api {
    
    public function getStats() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }
            
            $companyId = $_SESSION['user']['company_id'];
            $today = date('Y-m-d');

            // Получаем количество активных мерчендайзеров
            $stmt = $this->db->prepare('
                SELECT COUNT(*) as total_merchandisers
                FROM merchandisers 
                WHERE company_id = ? AND status = "active"
            ');
            $stmt->execute([$companyId]);
            $merchandisers = $stmt->fetch(PDO::FETCH_ASSOC);

            // Получаем статистику посещений за сегодня
            $stmt = $this->db->prepare('
                SELECT COUNT(*) as visits_today
                FROM reports r
                JOIN merchandisers m ON r.merchandiser_id = m.id
                WHERE m.company_id = ? AND DATE(r.visit_date) = ?
            ');
            $stmt->execute([$companyId, $today]);
            $visits = $stmt->fetch(PDO::FETCH_ASSOC);

            // Получаем среднюю эффективность
            $stmt = $this->db->prepare('
                SELECT AVG(efficiency) as avg_efficiency
                FROM reports r
                JOIN merchandisers m ON r.merchandiser_id = m.id
                WHERE m.company_id = ? AND DATE(r.visit_date) = ?
            ');
            $stmt->execute([$companyId, $today]);
            $efficiency = $stmt->fetch(PDO::FETCH_ASSOC);

            // Получаем количество новых отчетов
            $stmt = $this->db->prepare('
                SELECT COUNT(*) as new_reports
                FROM reports r
                JOIN merchandisers m ON r.merchandiser_id = m.id
                WHERE m.company_id = ? AND DATE(r.created_at) = ?
            ');
            $stmt->execute([$companyId, $today]);
            $reports = $stmt->fetch(PDO::FETCH_ASSOC);

            // Получаем данные для графика активности
            $period = $_GET['period'] ?? 'week';
            $activityData = $this->getActivityData($companyId, $period);

            // Получаем данные для графика задач
            $tasksData = $this->getTasksData($companyId);

            // Получаем данные для графика эффективности
            $efficiencyData = $this->getEfficiencyData($companyId);

            $this->response([
                'success' => true,
                'stats' => [
                    'merchandisers' => [
                        'active' => (int)$merchandisers['total_merchandisers'],
                        'total' => (int)$merchandisers['total_merchandisers'],
                        'trend' => $this->calculateTrend('merchandisers', $companyId)
                    ],
                    'visits' => [
                        'today' => (int)$visits['visits_today'],
                        'trend' => $this->calculateTrend('visits', $companyId)
                    ],
                    'tasks' => [
                        'completed' => round($efficiency['avg_efficiency'] ?? 0),
                        'trend' => $this->calculateTrend('tasks', $companyId)
                    ],
                    'reports' => [
                        'new' => (int)$reports['new_reports'],
                        'trend' => $this->calculateTrend('reports', $companyId)
                    ]
                ],
                'charts' => [
                    'activity' => $activityData,
                    'tasks' => $tasksData,
                    'efficiency' => $efficiencyData
                ]
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    private function getActivityData($companyId, $period) {
        $sql = '';
        switch ($period) {
            case 'week':
                $sql = "
                    SELECT DATE(ms.date) as date, 
                           SUM(visits_count) as visits
                    FROM merchandiser_stats ms
                    JOIN merchandisers m ON ms.merchandiser_id = m.id
                    WHERE m.company_id = ? 
                    AND ms.date >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
                    GROUP BY DATE(ms.date)
                    ORDER BY ms.date
                ";
                break;
            case 'month':
                $sql = "
                    SELECT DATE_FORMAT(ms.date, '%Y-%m-%d') as date,
                           SUM(visits_count) as visits
                    FROM merchandiser_stats ms
                    JOIN merchandisers m ON ms.merchandiser_id = m.id
                    WHERE m.company_id = ?
                    AND ms.date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)
                    GROUP BY DATE_FORMAT(ms.date, '%Y-%m-%d')
                    ORDER BY ms.date
                ";
                break;
            case 'year':
                $sql = "
                    SELECT DATE_FORMAT(ms.date, '%Y-%m') as date,
                           SUM(visits_count) as visits
                    FROM merchandiser_stats ms
                    JOIN merchandisers m ON ms.merchandiser_id = m.id
                    WHERE m.company_id = ?
                    AND ms.date >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
                    GROUP BY DATE_FORMAT(ms.date, '%Y-%m')
                    ORDER BY ms.date
                ";
                break;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getTasksData($companyId) {
        $stmt = $this->db->prepare("
            SELECT 
                SUM(CASE WHEN efficiency >= 90 THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN efficiency >= 50 AND efficiency < 90 THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN efficiency < 50 THEN 1 ELSE 0 END) as not_started
            FROM reports r
            JOIN merchandisers m ON r.merchandiser_id = m.id
            WHERE m.company_id = ? AND DATE(r.visit_date) = CURRENT_DATE
        ");
        $stmt->execute([$companyId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    private function getEfficiencyData($companyId) {
        $stmt = $this->db->prepare("
            SELECT 
                m.name,
                AVG(r.efficiency) as avg_efficiency
            FROM reports r
            JOIN merchandisers m ON r.merchandiser_id = m.id
            WHERE m.company_id = ?
            GROUP BY m.id
            ORDER BY avg_efficiency DESC
            LIMIT 5
        ");
        $stmt->execute([$companyId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function calculateTrend($metric, $companyId) {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        switch ($metric) {
            case 'merchandisers':
                // Сравниваем с вчерашним днем
                $sql = "
                    SELECT 
                        (COUNT(CASE WHEN status = 'active' AND created_at <= ? THEN 1 END) -
                         COUNT(CASE WHEN status = 'active' AND created_at <= ? THEN 1 END)) * 100.0 /
                        NULLIF(COUNT(CASE WHEN status = 'active' AND created_at <= ? THEN 1 END), 0) as trend
                    FROM merchandisers
                    WHERE company_id = ?
                ";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$today, $yesterday, $yesterday, $companyId]);
                break;

            case 'visits':
                // Сравниваем количество визитов
                $sql = "
                    SELECT 
                        (SUM(CASE WHEN DATE(visit_date) = ? THEN 1 ELSE 0 END) -
                         SUM(CASE WHEN DATE(visit_date) = ? THEN 1 ELSE 0 END)) * 100.0 /
                        NULLIF(SUM(CASE WHEN DATE(visit_date) = ? THEN 1 ELSE 0 END), 0) as trend
                    FROM reports r
                    JOIN merchandisers m ON r.merchandiser_id = m.id
                    WHERE m.company_id = ?
                ";
                $stmt = $this->db->prepare($sql);
                $stmt->execute([$today, $yesterday, $yesterday, $companyId]);
                break;

            // Аналогично для других метрик
            default:
                return 0;
        }

        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return round($result['trend'] ?? 0, 1);
    }

    public function getTopMerchandisers() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $companyId = $_SESSION['user']['company_id'] ?? null;
            if (!$companyId) {
                $stmt = $this->db->prepare('SELECT company_id FROM users WHERE id = ?');
                $stmt->execute([$_SESSION['user']['id']]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $companyId = $result['company_id'];
                $_SESSION['user']['company_id'] = $companyId;
            }

            // Получаем список мерчендайзеров компании
            $stmt = $this->db->prepare('
                SELECT 
                    id,
                    name,
                    avatar_url
                FROM users 
                WHERE company_id = ? 
                AND role = "merchandiser"
                ORDER BY id DESC
                LIMIT 5
            ');
            $stmt->execute([$companyId]);
            $merchandisers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Добавляем тестовые данные
            foreach ($merchandisers as &$m) {
                $m['visit_count'] = rand(20, 50);
                $m['completion_rate'] = rand(70, 100);
            }
            
            $this->response([
                'success' => true,
                'merchandisers' => $merchandisers
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
?> 