// В начало файла добавим функцию debounce
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

// Объявляем loadLocations в глобальной области видимости
let loadLocations;

document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    const user = await checkAuth();
    if (!user) return;

    // Инициализация карты
    const map = L.map('map', {
        zoomControl: false // Отключаем стандартные контролы зума
    }).setView([55.7558, 37.6173], 10);

    // Добавляем темную тему для карты
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Определяем функцию loadLocations
    loadLocations = async function() {
        try {
            const searchValue = document.querySelector('input[placeholder="Поиск по названию..."]').value;
            const regionValue = document.querySelector('select.form-select').value;
            
            const params = new URLSearchParams({
                search: searchValue,
                region: regionValue
            });

            const response = await fetch(`api/index.php?controller=locations&action=getLocations&${params}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            // Очищаем существующие маркеры
            map.eachLayer((layer) => {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });

            // Добавляем маркеры на карту
            data.locations.forEach(location => {
                const marker = L.marker([location.latitude, location.longitude])
                    .addTo(map)
                    .bindPopup(`
                        <strong>${location.name}</strong><br>
                        ${location.address}<br>
                        Мерчендайзеров: ${location.merchandisers_count}<br>
                        Эффективность: ${location.efficiency}%
                    `);
            });

            // Обновляем список точек
            const locationsList = document.querySelector('.locations-list');
            if (locationsList) {
                locationsList.innerHTML = data.locations.map(location => `
                    <div class="location-item">
                        <div class="location-info">
                            <h5>${location.name}</h5>
                            <p>${location.address}</p>
                            <div class="location-stats">
                                <span><i class="fa fa-user"></i> ${location.merchandisers_count} мерчендайзеров</span>
                                <span><i class="fa fa-file-text"></i> ${location.reports_count} отчетов</span>
                                <span><i class="fa fa-check-circle"></i> ${Math.round(location.efficiency)}% эффективность</span>
                            </div>
                        </div>
                        <div class="location-actions">
                            <button class="btn btn-icon" onclick="editLocation(${location.id})" title="Редактировать">
                                <i class="fa fa-pencil"></i>
                            </button>
                            <button class="btn btn-icon" onclick="deleteLocation(${location.id}, '${location.name}')" title="Удалить">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            }

        } catch (error) {
            console.error('Ошибка при загрузке точек:', error);
            showNotification(error.message, 'error');
        }
    };

    // Загружаем точки при загрузке страницы
    loadLocations();

    // Обработчики поиска и фильтрации
    const searchInput = document.querySelector('input[placeholder="Поиск по названию..."]');
    const regionSelect = document.querySelector('select.form-select');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => loadLocations(), 500));
    }
    if (regionSelect) {
        regionSelect.addEventListener('change', () => {
            const selectedRegion = regionSelect.value.toLowerCase();
            if (cityCoordinates[selectedRegion]) {
                map.setView(
                    cityCoordinates[selectedRegion].center,
                    cityCoordinates[selectedRegion].zoom
                );
            }
            loadLocations();
        });
    }

    // Обработчик формы добавления точки
    const addForm = document.getElementById('addLocationForm');
    if (addForm) {
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            try {
                const response = await fetch('api/index.php?controller=locations&action=addLocation', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error);
                }

                // Закрываем модальное окно
                const modal = bootstrap.Modal.getInstance(document.getElementById('addLocationModal'));
                modal.hide();
                
                // Очищаем форму
                this.reset();
                document.getElementById('coordinatesInput').value = ''; // Очищаем поле координат
                
                // Перезагружаем точки
                await loadLocations();
                showNotification('Точка продаж успешно добавлена');

            } catch (error) {
                console.error('Ошибка при добавлении точки:', error);
                showNotification(error.message, 'error');
            }
        });
    }

    // Обработчик формы редактирования
    const editForm = document.getElementById('editLocationForm');
    if (editForm) {
        editForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            
            try {
                const response = await fetch('api/index.php?controller=locations&action=updateLocation', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error);
                }

                // Закрываем модальное окно
                const modal = bootstrap.Modal.getInstance(document.getElementById('editLocationModal'));
                modal.hide();
                
                // Перезагружаем точки
                await loadLocations();
                showNotification('Точка продаж успешно обновлена');

            } catch (error) {
                console.error('Ошибка при обновлении точки:', error);
                showNotification(error.message, 'error');
            }
        });
    }
});

// Функция редактирования точки
async function editLocation(id) {
    try {
        const response = await fetch(`api/index.php?controller=locations&action=getLocation&id=${id}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Заполняем форму редактирования
        const form = document.getElementById('editLocationForm');
        form.querySelector('input[name="id"]').value = data.location.id;
        form.querySelector('input[name="name"]').value = data.location.name;
        form.querySelector('input[name="address"]').value = data.location.address;
        form.querySelector('input[name="latitude"]').value = data.location.latitude;
        form.querySelector('input[name="longitude"]').value = data.location.longitude;
        form.querySelector('select[name="region"]').value = data.location.region;

        // Открываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('editLocationModal'));
        modal.show();

        // После заполнения формы добавим:
        const coordinates = `${data.location.latitude}, ${data.location.longitude}`;
        form.querySelector('#coordinatesInput').value = coordinates;

    } catch (error) {
        console.error('Ошибка при загрузке данных точки:', error);
        showNotification(error.message, 'error');
    }
}

// Функция удаления точки
async function deleteLocation(id, name) {
    if (confirm(`Вы уверены, что хотите удалить точку "${name}"?`)) {
        try {
            const response = await fetch(`api/index.php?controller=locations&action=deleteLocation&id=${id}`);
            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            await loadLocations();
            showNotification('Точка продаж успешно удалена');

        } catch (error) {
            console.error('Ошибка при удалении точки:', error);
            showNotification(error.message, 'error');
        }
    }
}

// Вспомогательные функции
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Добавим функцию обработки вставки координат
function handleCoordinatesPaste(event) {
    // Предотвращаем стандартную вставку
    event.preventDefault();
    
    // Получаем вставляемый текст
    const pastedText = (event.clipboardData || window.clipboardData).getData('text');
    
    // Пытаемся извлечь координаты
    const coordinates = pastedText.match(/(\d+\.?\d*),\s*(\d+\.?\d*)/);
    
    if (coordinates) {
        const [, latitude, longitude] = coordinates;
        
        // Находим ближайшую форму
        const form = event.target.closest('form');
        
        // Заполняем поля координат
        form.querySelector('input[name="latitude"]').value = latitude;
        form.querySelector('input[name="longitude"]').value = longitude;
        
        // Показываем координаты в поле для вставки
        event.target.value = pastedText;
    } else {
        showNotification('Неверный формат координат. Используйте формат: 55.790182, 49.112606', 'error');
    }
} 