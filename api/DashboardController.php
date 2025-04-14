<?php
require_once 'Api.php';

class DashboardController extends Api {
    
    public function getStats() {
        try {
            $user = $this->getUser();
            if (!$user) {
                throw new Exception('Пользователь не авторизован');
            }

            $companyId = $user['company_id'];
            $period = $_GET['period'] ?? 'week';
            $region = $_GET['region'] ?? '';

            // Получаем текущую дату и время
            $currentDate = new DateTime();
            
            // Определяем начальную дату в зависимости от периода
            $startDate = new DateTime();
            switch ($period) {
                case 'week':
                    $startDate->modify('-6 days');
                    break;
                case 'month':
                    $startDate->modify('-29 days');
                    break;
                case 'year':
                    $startDate->modify('-11 months');
                    $startDate->modify('first day of this month');
                    break;
                default:
                    $startDate->modify('-6 days');
            }
            
            // Формируем массив дат для отображения
            $dates = [];
            $dateFormat = ($period === 'year') ? 'M Y' : 'd M';
            $interval = ($period === 'year') ? 'P1M' : 'P1D';
            
            $dateRange = new DatePeriod(
                $startDate, 
                new DateInterval($interval), 
                $currentDate->modify('+1 day') // Включаем текущий день
            );
            
            foreach ($dateRange as $date) {
                $dates[] = $date->format($dateFormat);
            }
            
            // Получаем данные активности
            $activityData = $this->getActivityData($companyId, $period, $region, $startDate, $currentDate);
            
            // Получаем данные о задачах
            $tasksData = $this->getTasksData($companyId, $region);
            
            // Получаем данные по эффективности
            $efficiencyData = $this->getEfficiencyData($companyId, $region);
            
            // Расчет трендов для метрик
            $trendsData = [
                'active_merchandisers' => $this->calculateTrend('merchandisers', $companyId, $region),
                'visits_today' => $this->calculateTrend('visits', $companyId, $region),
                'tasks_completed' => $this->calculateTrend('tasks', $companyId, $region),
                'new_reports' => $this->calculateTrend('reports', $companyId, $region)
            ];
            
            // Формируем метрики для отображения на дашборде
            $metrics = [
                'active_merchandisers' => $this->getActiveMerchandisersCount($companyId, $region),
                'visits_today' => $this->getVisitsTodayCount($companyId, $region),
                'tasks_completed' => $tasksData['completion_rate'],
                'new_reports' => $this->getNewReportsCount($companyId, $region)
            ];
            
            $this->response([
                'success' => true,
                'dates' => $dates,
                'activity' => $activityData,
                'tasks' => $tasksData,
                'efficiency' => $efficiencyData,
                'trends' => $trendsData,
                'metrics' => $metrics
            ]);
            
        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    // Получение данных по активности
    private function getActivityData($companyId, $period, $region, $startDate, $endDate) {
        // Базовый фильтр по компании
        $params = [$companyId];
        $regionFilter = '';
        if ($region) {
            $regionFilter = "AND m.region = ?";
            $params[] = $region;
        }
        
        // Получаем отчеты за указанный период
        $startDateStr = $startDate->format('Y-m-d');
        $endDateStr = $endDate->format('Y-m-d');
        $params[] = $startDateStr;
        $params[] = $endDateStr;
        
        // Запрос для получения посещений, отчетов и эффективности по дням
        $sql = "
            SELECT 
                DATE(r.visit_date) as date,
                COUNT(DISTINCT r.id) as visits_count,
                COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END) as reports_count,
                IFNULL(AVG(CASE WHEN r.efficiency IS NOT NULL THEN r.efficiency ELSE 0 END), 0) as efficiency
            FROM reports r
            JOIN merchandisers m ON r.merchandiser_id = m.id
            WHERE m.company_id = ? {$regionFilter}
            AND DATE(r.visit_date) BETWEEN ? AND ?
            GROUP BY DATE(r.visit_date)
            ORDER BY date ASC
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Форматируем данные для графика
        $visitsData = [];
        $reportsData = [];
        $efficiencyData = [];
        
        // Создаем массив с нулевыми значениями для всех дат
        $dateRange = new DatePeriod(
            $startDate,
            new DateInterval('P1D'),
            $endDate->modify('+1 day')
        );
        
        foreach ($dateRange as $date) {
            $dateStr = $date->format('Y-m-d');
            $visitsData[$dateStr] = 0;
            $reportsData[$dateStr] = 0;
            $efficiencyData[$dateStr] = 0;
        }
        
        // Заполняем данными из БД
        foreach ($results as $row) {
            $visitsData[$row['date']] = (int)$row['visits_count'];
            $reportsData[$row['date']] = (int)$row['reports_count'];
            $efficiencyData[$row['date']] = (int)$row['efficiency'];
        }
        
        // Форматируем для вывода
        $response = [
            'visits' => array_values($visitsData),
            'reports' => array_values($reportsData),
            'efficiency' => array_values($efficiencyData)
        ];
        
        return $response;
    }

    // Получение данных о задачах
    private function getTasksData($companyId, $region = '') {
        // Заглушка, так как таблицы задач нет, но можно добавить в будущем
        return [
            'completion_rate' => rand(70, 90),
            'overdue' => rand(5, 15),
            'today' => rand(10, 30)
        ];
    }

    // Получение данных об эффективности
    private function getEfficiencyData($companyId, $region = '') {
        // Получаем регионы и их эффективность
        $params = [$companyId];
        $regionFilter = '';
        
        if ($region) {
            $regionFilter = "AND m.region = ?";
            $params[] = $region;
        }
        
        $sql = "
            SELECT 
                m.region,
                IFNULL(AVG(CASE WHEN r.efficiency IS NOT NULL THEN r.efficiency ELSE 0 END), 0) as efficiency_avg
            FROM merchandisers m
            LEFT JOIN reports r ON m.id = r.merchandiser_id
            WHERE m.company_id = ? {$regionFilter}
            GROUP BY m.region
            ORDER BY efficiency_avg DESC
            LIMIT 5
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $regions = [];
        $efficiency = [];
        
        foreach ($results as $row) {
            $regions[] = $row['region'];
            $efficiency[] = (int)$row['efficiency_avg'];
        }
        
        // Если нет данных, добавляем заглушку
        if (empty($regions)) {
            $regions = ['Москва', 'Санкт-Петербург', 'Казань'];
            $efficiency = [75, 68, 81];
        }
        
        return [
            'regions' => $regions,
            'efficiency' => $efficiency
        ];
    }

    // Расчет тренда для метрики
    private function calculateTrend($metric, $companyId, $region = '') {
        // Базовый фильтр по компании
        $params = [$companyId];
        $regionFilter = '';
        
        if ($region) {
            $regionFilter = "AND m.region = ?";
            $params[] = $region;
        }
        
        // Текущая дата и дата неделю назад
        $today = date('Y-m-d');
        $weekAgo = date('Y-m-d', strtotime('-7 days'));
        $twoWeeksAgo = date('Y-m-d', strtotime('-14 days'));
        
        // Разные запросы в зависимости от метрики
        switch ($metric) {
            case 'merchandisers':
                // Количество активных мерчендайзеров на сегодня
                $currentSql = "
                    SELECT COUNT(*) FROM merchandisers m
                    WHERE m.company_id = ? {$regionFilter} AND m.status = 'active'
                ";
                // Количество активных мерчендайзеров неделю назад
                $prevSql = "
                    SELECT COUNT(*) FROM merchandisers m
                    WHERE m.company_id = ? {$regionFilter} AND m.status = 'active'
                    AND m.created_at <= ?
                ";
                $params2 = $params;
                $params2[] = $weekAgo;
                break;
                
            case 'visits':
                // Посещения сегодня
                $currentSql = "
                    SELECT COUNT(DISTINCT r.id) FROM reports r
                    JOIN merchandisers m ON r.merchandiser_id = m.id
                    WHERE m.company_id = ? {$regionFilter}
                    AND DATE(r.visit_date) = ?
                ";
                $params[] = $today;
                
                // Посещения неделю назад за тот же день
                $prevSql = "
                    SELECT COUNT(DISTINCT r.id) FROM reports r
                    JOIN merchandisers m ON r.merchandiser_id = m.id
                    WHERE m.company_id = ? {$regionFilter}
                    AND DATE(r.visit_date) = ?
                ";
                $params2 = $params;
                array_pop($params2);
                $params2[] = $weekAgo;
                break;
                
            case 'tasks':
                // Заглушка для задач, так как этой функциональности нет
                return rand(-5, 5);
                
            case 'reports':
                // Новые отчеты за последнюю неделю
                $currentSql = "
                    SELECT COUNT(DISTINCT r.id) FROM reports r
                    JOIN merchandisers m ON r.merchandiser_id = m.id
                    WHERE m.company_id = ? {$regionFilter}
                    AND DATE(r.created_at) BETWEEN ? AND ?
                ";
                $params[] = $weekAgo;
                $params[] = $today;
                
                // Новые отчеты за неделю до этого
                $prevSql = "
                    SELECT COUNT(DISTINCT r.id) FROM reports r
                    JOIN merchandisers m ON r.merchandiser_id = m.id
                    WHERE m.company_id = ? {$regionFilter}
                    AND DATE(r.created_at) BETWEEN ? AND ?
                ";
                $params2 = $params;
                array_pop($params2);
                array_pop($params2);
                $params2[] = $twoWeeksAgo;
                $params2[] = $weekAgo;
                break;
                
            default:
                return 0;
        }
        
        // Получаем текущее значение
        $stmt = $this->db->prepare($currentSql);
        $stmt->execute($params);
        $current = (float)$stmt->fetchColumn();
        
        // Получаем предыдущее значение
        $stmt = $this->db->prepare($prevSql);
        $stmt->execute($params2);
        $previous = (float)$stmt->fetchColumn();
        
        // Если предыдущее значение было 0, устанавливаем рост 100% если текущее не 0
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }
        
        // Вычисляем процент изменения
        $percentChange = (($current - $previous) / $previous) * 100;
        return round($percentChange, 1);
    }

    // Получение количества активных мерчендайзеров
    private function getActiveMerchandisersCount($companyId, $region = '') {
        $params = [$companyId];
        $regionFilter = '';
        
        if ($region) {
            $regionFilter = "AND region = ?";
            $params[] = $region;
        }
        
        $sql = "SELECT COUNT(*) FROM merchandisers WHERE company_id = ? {$regionFilter} AND status = 'active'";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    // Получение количества посещений сегодня
    private function getVisitsTodayCount($companyId, $region = '') {
        $today = date('Y-m-d');
        $params = [$companyId, $today];
        $regionFilter = '';
        
        if ($region) {
            $regionFilter = "AND m.region = ?";
            $params = [$companyId, $region, $today];
        }
        
        $sql = "
            SELECT COUNT(DISTINCT r.id) 
            FROM reports r
            JOIN merchandisers m ON r.merchandiser_id = m.id
            WHERE m.company_id = ? {$regionFilter}
            AND DATE(r.visit_date) = ?
        ";
        
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
    }

    // Получение количества новых отчетов
    private function getNewReportsCount($companyId, $region = '') {
        $today = date('Y-m-d');
        $params = [$companyId];
        $regionFilter = '';
        
        if ($region) {
            $regionFilter = "AND m.region = ?";
            $params[] = $region;
        }
        
        $sql = "
            SELECT COUNT(DISTINCT r.id) 
            FROM reports r
            JOIN merchandisers m ON r.merchandiser_id = m.id
            WHERE m.company_id = ? {$regionFilter}
            AND DATE(r.created_at) = ?
        ";
        
        $params[] = $today;
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetchColumn();
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