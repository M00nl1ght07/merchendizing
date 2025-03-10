-- Компании
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(12) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    logo_url TEXT, -- добавлено для логотипа компании
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Пользователи (админы компаний)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT, -- добавлено для фото профиля
    role VARCHAR(50) DEFAULT 'admin',
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Мерчандайзеры
CREATE TABLE merchandisers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    avatar_url TEXT,
    region VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Точки продаж
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    region VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    merchandisers_count INTEGER DEFAULT 0, -- добавлено для быстрого доступа
    efficiency_avg INTEGER DEFAULT 0, -- добавлено для быстрого доступа
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Связь мерчандайзеров с точками продаж
CREATE TABLE merchandiser_locations (
    merchandiser_id INTEGER REFERENCES merchandisers(id),
    location_id INTEGER REFERENCES locations(id),
    PRIMARY KEY (merchandiser_id, location_id)
);

-- Отчеты мерчандайзеров
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    merchandiser_id INTEGER REFERENCES merchandisers(id),
    location_id INTEGER REFERENCES locations(id),
    visit_date TIMESTAMP NOT NULL,
    status VARCHAR(50) NOT NULL,
    comment TEXT,
    efficiency INTEGER CHECK (efficiency BETWEEN 0 AND 100),
    excel_url TEXT, -- добавлено для хранения Excel файлов
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -- Фотографии к отчетам
-- CREATE TABLE report_photos (
--     id SERIAL PRIMARY KEY,
--     report_id INTEGER REFERENCES reports(id),
--     photo_url TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Уведомления
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Интеграции
CREATE TABLE integrations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    type VARCHAR(50) NOT NULL, -- '1c', 'excel', etc.
    status VARCHAR(50) NOT NULL,
    last_sync_at TIMESTAMP, -- добавлено для отслеживания синхронизации
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Статистика по мерчандайзерам (для аналитики)
CREATE TABLE merchandiser_stats (
    id SERIAL PRIMARY KEY,
    merchandiser_id INTEGER REFERENCES merchandisers(id),
    date DATE NOT NULL,
    visits_count INTEGER DEFAULT 0,
    reports_count INTEGER DEFAULT 0,
    efficiency_avg INTEGER CHECK (efficiency_avg BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (merchandiser_id, date)
);

-- Аналитика по регионам (для графиков)
CREATE TABLE region_stats (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    region VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    merchandisers_count INTEGER DEFAULT 0,
    locations_count INTEGER DEFAULT 0,
    efficiency_avg INTEGER CHECK (efficiency_avg BETWEEN 0 AND 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (company_id, region, date)
);

-- Триггер для обновления merchandiser_stats при добавлении/обновлении отчета
DELIMITER //
CREATE TRIGGER update_merchandiser_stats AFTER INSERT ON reports
FOR EACH ROW
BEGIN
    -- Обновляем или добавляем статистику мерчандайзера за день
    INSERT INTO merchandiser_stats (merchandiser_id, date, visits_count, reports_count, efficiency_avg)
    SELECT 
        NEW.merchandiser_id,
        DATE(NEW.visit_date),
        COUNT(DISTINCT r.id),
        COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END),
        AVG(r.efficiency)
    FROM reports r
    WHERE r.merchandiser_id = NEW.merchandiser_id 
    AND DATE(r.visit_date) = DATE(NEW.visit_date)
    GROUP BY r.merchandiser_id, DATE(r.visit_date)
    ON DUPLICATE KEY UPDATE
        visits_count = VALUES(visits_count),
        reports_count = VALUES(reports_count),
        efficiency_avg = VALUES(efficiency_avg);
END;//

-- Триггер для обновления region_stats при добавлении/обновлении отчета
CREATE TRIGGER update_region_stats AFTER INSERT ON reports
FOR EACH ROW
BEGIN
    -- Получаем регион из локации
    DECLARE v_region VARCHAR(100);
    DECLARE v_company_id INTEGER;
    
    SELECT l.region, l.company_id INTO v_region, v_company_id
    FROM locations l
    WHERE l.id = NEW.location_id;

    -- Обновляем или добавляем статистику региона за день
    INSERT INTO region_stats (company_id, region, date, merchandisers_count, locations_count, efficiency_avg)
    SELECT 
        v_company_id,
        v_region,
        DATE(NEW.visit_date),
        COUNT(DISTINCT m.id),
        COUNT(DISTINCT l.id),
        AVG(r.efficiency)
    FROM reports r
    JOIN locations l ON r.location_id = l.id
    JOIN merchandisers m ON r.merchandiser_id = m.id
    WHERE l.region = v_region 
    AND DATE(r.visit_date) = DATE(NEW.visit_date)
    GROUP BY l.region, DATE(r.visit_date)
    ON DUPLICATE KEY UPDATE
        merchandisers_count = VALUES(merchandisers_count),
        locations_count = VALUES(locations_count),
        efficiency_avg = VALUES(efficiency_avg);
END;//
DELIMITER ;

-- Процедура для первоначального заполнения статистики
DELIMITER //
CREATE PROCEDURE fill_initial_stats()
BEGIN
    -- Заполняем merchandiser_stats
    INSERT INTO merchandiser_stats (merchandiser_id, date, visits_count, reports_count, efficiency_avg)
    SELECT 
        r.merchandiser_id,
        DATE(r.visit_date),
        COUNT(DISTINCT r.id),
        COUNT(DISTINCT CASE WHEN r.status = 'approved' THEN r.id END),
        AVG(r.efficiency)
    FROM reports r
    GROUP BY r.merchandiser_id, DATE(r.visit_date)
    ON DUPLICATE KEY UPDATE
        visits_count = VALUES(visits_count),
        reports_count = VALUES(reports_count),
        efficiency_avg = VALUES(efficiency_avg);

    -- Заполняем region_stats
    INSERT INTO region_stats (company_id, region, date, merchandisers_count, locations_count, efficiency_avg)
    SELECT 
        l.company_id,
        l.region,
        DATE(r.visit_date),
        COUNT(DISTINCT m.id),
        COUNT(DISTINCT l.id),
        AVG(r.efficiency)
    FROM reports r
    JOIN locations l ON r.location_id = l.id
    JOIN merchandisers m ON r.merchandiser_id = m.id
    GROUP BY l.company_id, l.region, DATE(r.visit_date)
    ON DUPLICATE KEY UPDATE
        merchandisers_count = VALUES(merchandisers_count),
        locations_count = VALUES(locations_count),
        efficiency_avg = VALUES(efficiency_avg);
END;//
DELIMITER ;

-- Вызываем процедуру для первоначального заполнения
CALL fill_initial_stats();