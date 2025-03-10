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
}
?> 