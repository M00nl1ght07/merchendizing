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

// Глобальные переменные
let map;
let markers = [];
let currentLocationId;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) throw new Error('Пользователь не авторизован');

        // Скрываем кнопки для мерчендайзера
        if (user.type === 'merchandiser') {
            const addButton = document.querySelector('.btn-add-location');
            if (addButton) {
                addButton.style.display = 'none';
            }
            document.querySelectorAll('.location-actions').forEach(el => {
                el.style.display = 'none';
            });
        }

        // Инициализируем карту
        map = L.map('map').setView([55.7558, 37.6173], 10);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Добавляем обработчик поиска по названию
        const searchInput = document.querySelector('input[placeholder="Поиск по названию..."]');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(async function() {
                await updateMap(regionSelect.value, this.value);
            }, 300));
        }

        // Обновляем обработчик изменения региона
        const regionSelect = document.querySelector('select.form-select');
        if (regionSelect) {
            regionSelect.addEventListener('change', async function() {
                const selectedRegion = this.value.toLowerCase();
                if (cityCoordinates[selectedRegion]) {
                    // Если выбран город из списка - центрируем карту на нем
                    const coords = cityCoordinates[selectedRegion];
                    map.setView(coords.center, coords.zoom);
                }
                await updateMap(selectedRegion, searchInput.value);
            });
        }

        // Добавляем обработчик формы добавления точки
        const addLocationForm = document.getElementById('addLocationForm');
        if (addLocationForm) {
            addLocationForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                await addLocation(this);
            });
        }

        // Загружаем точки при старте
        await updateMap();

    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
});

// Функция обновления карты и списка точек
async function updateMap(region = '', search = '') {
    try {
        // Очищаем существующие маркеры
        markers.forEach(marker => map.removeLayer(marker));
        markers = [];

        // Формируем URL с учетом фильтров
        let url = 'api/index.php?controller=locations&action=getLocations';
        if (region && region !== 'Все регионы') {
            url += `&region=${encodeURIComponent(region)}`;
        }
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Ошибка загрузки точек продаж');
        }

        // Обновляем список и маркеры
        const locationsList = document.querySelector('.locations-list');
        if (!locationsList) {
            throw new Error('Элемент списка точек не найден');
        }

        locationsList.innerHTML = data.locations.map(location => {
            // Добавляем маркер на карту
            const marker = L.marker([location.latitude, location.longitude])
                .addTo(map)
                .bindPopup(`
                    <strong>${location.name}</strong><br>
                    ${location.address}
                `);
            markers.push(marker);

            // Возвращаем HTML для списка
            return `
                <div class="location-item" data-id="${location.id}">
                    <div class="location-info">
                        <h6>${location.name}</h6>
                        <p class="address"><i class="fa fa-map-marker"></i> ${location.address}</p>
                        <div class="location-stats">
                            <span><i class="fa fa-user"></i> ${location.merchandisers_count}</span>
                            <span><i class="fa fa-file-text"></i> ${location.reports_count}</span>
                            <span><i class="fa fa-line-chart"></i> ${Math.round(location.efficiency)}%</span>
                        </div>
                    </div>
                    <div class="location-actions">
                        <button class="btn btn-sm btn-success" onclick="manageMerchandisers(${location.id})">
                            <i class="fa fa-users"></i>
                        </button>
                        <button class="btn btn-sm btn-primary" onclick="editLocation(${location.id})">
                            <i class="fa fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteLocation(${location.id}, '${location.name}')">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Центрируем карту по маркерам
        if (markers.length > 0) {
            const group = L.featureGroup(markers);
            map.fitBounds(group.getBounds());
        }

    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}

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

            await updateMap();
            showNotification('Точка продаж успешно удалена');

        } catch (error) {
            console.error('Ошибка при удалении точки:', error);
            showNotification(error.message, 'error');
        }
    }
}

// Функция сохранения назначенных мерчендайзеров
async function saveMerchandisers() {
    try {
        const modal = document.getElementById('manageMerchandisersModal');
        const checkedMerchandisers = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        const response = await fetch('api/index.php?controller=locations&action=updateLocationMerchandisers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                location_id: currentLocationId,
                merchandiser_ids: checkedMerchandisers
            })
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Закрываем модальное окно
        const modalInstance = bootstrap.Modal.getInstance(modal);
        modalInstance.hide();

        // Обновляем список точек
        await updateMap();
        showNotification('Мерчендайзеры успешно обновлены');

    } catch (error) {
        console.error('Ошибка при сохранении мерчендайзеров:', error);
        showNotification(error.message, 'error');
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

// Функция открытия модального окна управления мерчендайзерами
async function manageMerchandisers(locationId) {
    try {
        currentLocationId = locationId;
        
        // Получаем данные точки и список мерчендайзеров
        const response = await fetch(`api/index.php?controller=locations&action=getLocationMerchandisers&id=${locationId}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Заполняем информацию о точке
        const modal = document.getElementById('manageMerchandisersModal');
        modal.querySelector('.location-name').textContent = data.location.name;
        modal.querySelector('.location-address').textContent = data.location.address;

        // Формируем список мерчендайзеров
        const merchandisersList = modal.querySelector('.merchandisers-list');
        merchandisersList.innerHTML = data.merchandisers.map(m => `
            <div class="merchandiser-item">
                <div class="merchandiser-checkbox">
                    <input type="checkbox" value="${m.id}" ${m.assigned ? 'checked' : ''}>
                </div>
                <div class="merchandiser-info">
                    <h6>${m.name}</h6>
                    <p>${m.phone}</p>
                </div>
            </div>
        `).join('');

        // Открываем модальное окно
        const modalInstance = new bootstrap.Modal(modal);
        modalInstance.show();

    } catch (error) {
        console.error('Ошибка при загрузке мерчендайзеров:', error);
        showNotification(error.message, 'error');
    }
}

// Добавляем функцию создания новой точки
async function addLocation(form) {
    try {
        const formData = new FormData(form);
        
        const response = await fetch('api/index.php?controller=locations&action=addLocation', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Ошибка при добавлении точки');
        }

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('addLocationModal'));
        modal.hide();

        // Очищаем форму
        form.reset();

        // Обновляем карту
        await updateMap();
        showNotification('Точка продаж успешно добавлена');

    } catch (error) {
        console.error('Ошибка при добавлении точки:', error);
        showNotification(error.message, 'error');
    }
} 