// Координаты центров городов
const cityCoordinates = {
    'москва': {
        center: [55.7558, 37.6173],
        zoom: 10
    },
    'санкт-петербург': {
        center: [59.9343, 30.3351],
        zoom: 10
    },
    'казань': {
        center: [55.7887, 49.1221],
        zoom: 10
    }
};

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация карты
    const map = L.map('map').setView([55.7558, 37.6173], 10); // Москва по умолчанию

    // Добавляем темную тему для карты
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Тестовые данные точек
    const locations = [
        {
            id: 1,
            name: 'ТЦ "Центральный"',
            address: 'Москва, ул. Ленина, 45',
            coords: [55.7558, 37.6173],
            region: 'Москва',
            merchandisers: 3,
            efficiency: 98
        },
        {
            id: 2,
            name: 'ТЦ "Мега"',
            address: 'Санкт-Петербург, пр. Невский, 78',
            coords: [59.9343, 30.3351],
            region: 'Санкт-Петербург',
            merchandisers: 5,
            efficiency: 95
        }
        // Добавить другие точки...
    ];

    // Маркеры на карте
    const markers = {};

    // Добавляем маркеры на карту
    function addMarkers() {
        locations.forEach(location => {
            const marker = L.marker(location.coords)
                .bindPopup(`
                    <strong>${location.name}</strong><br>
                    ${location.address}<br>
                    <small>${location.merchandisers} мерчандайзера(ов)<br>
                    Эффективность: ${location.efficiency}%</small>
                `);
            
            markers[location.id] = marker;
            marker.addTo(map);
        });
    }

    // Фильтрация точек
    const searchInput = document.querySelector('input[placeholder="Поиск по названию..."]');
    const regionFilter = document.querySelector('.locations-filters select');

    function filterLocations() {
        const searchText = searchInput.value.toLowerCase();
        const selectedRegion = regionFilter.value.toLowerCase();

        const locationItems = document.querySelectorAll('.location-item');
        let visibleLocations = [];

        // Если выбран регион, центрируем карту на нём
        if (selectedRegion && cityCoordinates[selectedRegion]) {
            const city = cityCoordinates[selectedRegion];
            map.setView(city.center, city.zoom);
        }

        locationItems.forEach((item, index) => {
            const location = locations[index];
            const name = location.name.toLowerCase();
            const region = location.region.toLowerCase();

            let visible = true;

            if (searchText && !name.includes(searchText)) visible = false;
            if (selectedRegion && region !== selectedRegion) visible = false;

            item.style.display = visible ? '' : 'none';
            
            // Показываем/скрываем маркеры на карте
            const marker = markers[location.id];
            if (visible) {
                marker.addTo(map);
                visibleLocations.push(location.coords);
            } else {
                marker.remove();
            }
        });

        // Центрируем карту по видимым точкам только если нет выбранного региона
        if (!selectedRegion && visibleLocations.length > 0) {
            const bounds = L.latLngBounds(visibleLocations);
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    }

    // Обработчики событий
    searchInput.addEventListener('input', debounce(filterLocations, 300));
    regionFilter.addEventListener('change', filterLocations);

    // Обработка формы добавления точки
    const addForm = document.getElementById('addLocationForm');
    addForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        
        // Здесь будет отправка на сервер
        console.log('Добавление точки:', Object.fromEntries(formData));
        
        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('addLocationModal'));
        modal.hide();
        
        // Очищаем форму
        this.reset();
        
        showNotification('Точка продаж успешно добавлена');
    });

    // Обработка действий с точками
    document.querySelectorAll('.location-actions .btn-icon').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('title');
            const locationItem = this.closest('.location-item');
            const name = locationItem.querySelector('h5').textContent;

            switch(action) {
                case 'Редактировать':
                    editLocation(name);
                    break;
                case 'Удалить':
                    deleteLocation(name, locationItem);
                    break;
            }
        });
    });

    // Инициализация
    addMarkers();
});

// Вспомогательные функции
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Функции для работы с точками
function editLocation(name) {
    // Здесь будет логика редактирования
    console.log('Редактирование точки:', name);
}

function deleteLocation(name, item) {
    if (confirm(`Вы уверены, что хотите удалить точку "${name}"?`)) {
        // Здесь будет запрос на удаление
        console.log('Удаление точки:', name);
        item.remove();
        showNotification('Точка продаж успешно удалена');
    }
} 