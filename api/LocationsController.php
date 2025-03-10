<?php
require_once 'Api.php';

class LocationsController extends Api {
    
    public function getLocations() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $companyId = $_SESSION['user']['company_id'];
            
            // Получаем параметры фильтрации
            $search = $_GET['search'] ?? '';
            $region = $_GET['region'] ?? '';

            // Базовый SQL запрос
            $sql = "
                SELECT 
                    l.*,
                    COUNT(DISTINCT m.id) as merchandisers_count,
                    COUNT(DISTINCT r.id) as reports_count,
                    COALESCE(AVG(r.efficiency), 0) as efficiency
                FROM locations l
                LEFT JOIN merchandiser_locations ml ON l.id = ml.location_id
                LEFT JOIN merchandisers m ON ml.merchandiser_id = m.id
                LEFT JOIN reports r ON l.id = r.location_id
                WHERE l.company_id = ?
            ";
            $params = [$companyId];

            if ($search) {
                $sql .= " AND (l.name LIKE ? OR l.address LIKE ?)";
                $params[] = "%$search%";
                $params[] = "%$search%";
            }
            if ($region) {
                $sql .= " AND l.region = ?";
                $params[] = $region;
            }

            $sql .= " GROUP BY l.id";

            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->response([
                'success' => true,
                'locations' => $locations
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function addLocation() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING);
            $address = filter_input(INPUT_POST, 'address', FILTER_SANITIZE_STRING);
            $latitude = filter_input(INPUT_POST, 'latitude', FILTER_VALIDATE_FLOAT);
            $longitude = filter_input(INPUT_POST, 'longitude', FILTER_VALIDATE_FLOAT);
            $region = filter_input(INPUT_POST, 'region', FILTER_SANITIZE_STRING);

            if (!$name || !$address || !$latitude || !$longitude || !$region) {
                $this->error('Все поля обязательны для заполнения');
            }

            $stmt = $this->db->prepare('
                INSERT INTO locations (name, address, latitude, longitude, region, company_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ');
            
            $stmt->execute([
                $name,
                $address,
                $latitude,
                $longitude,
                $region,
                $_SESSION['user']['company_id']
            ]);

            $this->response([
                'success' => true,
                'location_id' => $this->db->lastInsertId()
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateLocation() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
            $name = filter_input(INPUT_POST, 'name', FILTER_SANITIZE_STRING);
            $address = filter_input(INPUT_POST, 'address', FILTER_SANITIZE_STRING);
            $latitude = filter_input(INPUT_POST, 'latitude', FILTER_VALIDATE_FLOAT);
            $longitude = filter_input(INPUT_POST, 'longitude', FILTER_VALIDATE_FLOAT);
            $region = filter_input(INPUT_POST, 'region', FILTER_SANITIZE_STRING);

            if (!$id || !$name || !$address || !$latitude || !$longitude || !$region) {
                $this->error('Все поля обязательны для заполнения');
            }

            $stmt = $this->db->prepare('
                UPDATE locations 
                SET name = ?, address = ?, latitude = ?, longitude = ?, region = ?
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$name, $address, $latitude, $longitude, $region, $id, $_SESSION['user']['company_id']]);

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function deleteLocation() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
            if (!$id) {
                $this->error('Некорректный ID точки');
            }

            // Удаляем связи с мерчендайзерами
            $stmt = $this->db->prepare('
                DELETE FROM merchandiser_locations 
                WHERE location_id = ?
            ');
            $stmt->execute([$id]);

            // Удаляем точку
            $stmt = $this->db->prepare('
                DELETE FROM locations 
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$id, $_SESSION['user']['company_id']]);

            $this->response(['success' => true]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function getLocation() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
            if (!$id) {
                $this->error('Некорректный ID точки');
            }

            $stmt = $this->db->prepare('
                SELECT * FROM locations 
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$id, $_SESSION['user']['company_id']]);
            $location = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$location) {
                $this->error('Точка не найдена');
            }

            $this->response([
                'success' => true,
                'location' => $location
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function getLocationMerchandisers() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $locationId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
            if (!$locationId) {
                $this->error('Некорректный ID точки');
            }

            // Получаем информацию о точке
            $stmt = $this->db->prepare('
                SELECT * FROM locations 
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$locationId, $_SESSION['user']['company_id']]);
            $location = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$location) {
                $this->error('Точка не найдена');
            }

            // Получаем список мерчендайзеров компании из того же региона с отметкой о назначении
            $stmt = $this->db->prepare('
                SELECT 
                    m.*,
                    CASE WHEN ml.merchandiser_id IS NOT NULL THEN 1 ELSE 0 END as assigned
                FROM merchandisers m
                LEFT JOIN merchandiser_locations ml ON m.id = ml.merchandiser_id AND ml.location_id = ?
                WHERE m.company_id = ? 
                AND m.region = ?
                ORDER BY m.name
            ');
            $stmt->execute([
                $locationId, 
                $_SESSION['user']['company_id'],
                $location['region']
            ]);
            $merchandisers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $this->response([
                'success' => true,
                'location' => $location,
                'merchandisers' => $merchandisers
            ]);

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }

    public function updateLocationMerchandisers() {
        try {
            session_start();
            if (!isset($_SESSION['user'])) {
                $this->error('Необходима авторизация');
            }

            $data = json_decode(file_get_contents('php://input'), true);
            $locationId = $data['location_id'] ?? null;
            $merchandiserIds = $data['merchandiser_ids'] ?? [];

            if (!$locationId) {
                $this->error('Некорректный ID точки');
            }

            // Проверяем принадлежность точки компании
            $stmt = $this->db->prepare('
                SELECT id FROM locations 
                WHERE id = ? AND company_id = ?
            ');
            $stmt->execute([$locationId, $_SESSION['user']['company_id']]);
            if (!$stmt->fetch()) {
                $this->error('Точка не найдена');
            }

            // Начинаем транзакцию
            $this->db->beginTransaction();

            try {
                // Удаляем все текущие связи для этой точки
                $stmt = $this->db->prepare('
                    DELETE FROM merchandiser_locations 
                    WHERE location_id = ?
                ');
                $stmt->execute([$locationId]);

                // Добавляем новые связи
                if (!empty($merchandiserIds)) {
                    $stmt = $this->db->prepare('
                        INSERT INTO merchandiser_locations (merchandiser_id, location_id)
                        VALUES (?, ?)
                    ');
                    foreach ($merchandiserIds as $merchandiserId) {
                        $stmt->execute([$merchandiserId, $locationId]);
                    }
                }

                $this->db->commit();
                $this->response(['success' => true]);

            } catch (Exception $e) {
                $this->db->rollBack();
                throw $e;
            }

        } catch (Exception $e) {
            $this->error($e->getMessage());
        }
    }
}
?> 