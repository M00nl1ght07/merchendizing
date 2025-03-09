document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    const user = await checkAuth();
    if (!user) return;

    const searchInput = document.querySelector('input[placeholder="Поиск по имени..."]');
    const statusFilter = document.querySelector('select[class="form-select"]');
    const regionFilter = document.querySelectorAll('select[class="form-select"]')[1];
    const addForm = document.getElementById('addMerchandiserForm');

    // Загружаем мерчандайзеров при загрузке страницы
    loadMerchandisers();

    // Добавляем маску для телефона
    const phoneInput = document.querySelector('input[name="phone"]');
    if (phoneInput) {
        IMask(phoneInput, {
            mask: '+{7}(000)000-00-00'
        });
    }

    // Валидация пароля
    const passwordInput = document.querySelector('input[name="password"]');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (this.value.length < 6) {
                this.setCustomValidity('Пароль должен содержать минимум 6 символов');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Обработка добавления мерчандайзера
    if (addForm) {
        addForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const password = this.querySelector('[name="password"]').value;
            const phone = this.querySelector('[name="phone"]').value;

            if (password.length < 6) {
                showNotification('Пароль должен содержать минимум 6 символов', 'error');
                return;
            }

            if (!phone.match(/^\+7\(\d{3}\)\d{3}-\d{2}-\d{2}$/)) {
                showNotification('Неверный формат телефона', 'error');
                return;
            }

            try {
                const formData = new FormData(this);
                
                const response = await fetch('api/index.php?controller=merchandisers&action=addMerchandiser', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                
                if (data.error) {
                    throw new Error(data.error);
                }

                // Закрываем модальное окно
                const modal = bootstrap.Modal.getInstance(document.getElementById('addMerchandiserModal'));
                modal.hide();
                
                // Очищаем форму
                this.reset();
                
                // Показываем уведомление
                showNotification('Мерчандайзер успешно добавлен');
                
                // Перезагружаем список
                loadMerchandisers();

            } catch (error) {
                console.error('Ошибка при добавлении мерчандайзера:', error);
                showNotification(error.message, 'error');
            }
        });
    }

    // Поиск и фильтрация
    searchInput.addEventListener('input', debounce(loadMerchandisers, 300));
    statusFilter.addEventListener('change', loadMerchandisers);
    regionFilter.addEventListener('change', loadMerchandisers);

    // Обработчик кнопки показа пароля
    const togglePasswordBtn = document.querySelector('.toggle-password');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', function() {
            const passwordInput = this.previousElementSibling;
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            this.querySelector('i').classList.toggle('fa-eye');
            this.querySelector('i').classList.toggle('fa-eye-slash');
        });
    }
});

async function loadMerchandisers() {
    try {
        const searchText = document.querySelector('input[placeholder="Поиск по имени..."]').value;
        const status = document.querySelector('select[class="form-select"]').value;
        const region = document.querySelectorAll('select[class="form-select"]')[1].value;

        const params = new URLSearchParams({
            search: searchText,
            status: status,
            region: region
        });

        console.log('Загружаем мерчандайзеров с параметрами:', Object.fromEntries(params));

        const response = await fetch(`api/index.php?controller=merchandisers&action=getMerchandisers&${params}`);
        const data = await response.json();

        console.log('Получены данные:', data);

        if (data.error) {
            throw new Error(data.error);
        }

        const container = document.querySelector('.merchandisers-grid');
        if (!container) {
            throw new Error('Не найден контейнер для мерчандайзеров');
        }

        container.innerHTML = data.merchandisers.map(m => `
            <div class="col-md-6 col-xl-4 mb-4">
                <div class="merchandiser-card">
                    <div class="merchandiser-header">
                        <div class="d-flex align-items-center">
                            <img src="${m.avatar_url || 'images/avatar.png'}" alt="Avatar" class="merchandiser-avatar">
                            <div class="ms-3">
                                <h5 class="mb-0">${m.name}</h5>
                                <span class="badge bg-${getStatusColor(m.status)}">${m.status}</span>
                            </div>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-icon" data-bs-toggle="dropdown">
                                <i class="fa fa-ellipsis-v"></i>
                            </button>
                            <div class="dropdown-menu dropdown-menu-end">
                                <button class="dropdown-item" onclick="editMerchandiser(${m.id})">
                                    <i class="fa fa-pencil"></i> Редактировать
                                </button>
                                <div class="dropdown-divider"></div>
                                <button class="dropdown-item text-danger" onclick="deleteMerchandiser(${m.id}, '${m.name}')">
                                    <i class="fa fa-trash"></i> Удалить
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="merchandiser-stats">
                        <div class="stat-item">
                            <span class="stat-label">Посещений</span>
                            <span class="stat-value">${m.visits_count || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Эффективность</span>
                            <span class="stat-value">${Math.round(m.efficiency || 0)}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Отчетов</span>
                            <span class="stat-value">${m.reports_count || 0}</span>
                        </div>
                    </div>
                    <div class="merchandiser-footer">
                        <div class="region">
                            <i class="fa fa-map-marker"></i>
                            <span>${m.region}</span>
                        </div>
                        <button class="btn btn-outline-primary btn-sm" onclick="window.location.href='mailto:${m.email}'">
                            <i class="fa fa-envelope"></i>
                            Написать
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Ошибка при загрузке мерчандайзеров:', error);
        showNotification(error.message, 'error');
    }
}

function getStatusColor(status) {
    const colors = {
        'active': 'success',
        'inactive': 'danger',
        'pending': 'warning'
    };
    return colors[status] || 'secondary';
}

// Остальные вспомогательные функции...

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

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Функции для работы с мерчандайзерами
function editMerchandiser(name) {
    // Открываем модальное окно редактирования
    const modal = new bootstrap.Modal(document.getElementById('editMerchandiserModal'));
    
    // Находим данные мерчандайзера
    const merchandiserCard = document.querySelector(`.merchandiser-card:has(h5:contains("${name}"))`);
    const region = merchandiserCard.querySelector('.region span').textContent;
    
    // Заполняем форму текущими данными
    const form = document.getElementById('editMerchandiserForm');
    form.querySelector('[name="name"]').value = name;
    form.querySelector('[name="region"]').value = region;
    
    // Показываем модальное окно
    modal.show();
}

// Обработчик формы редактирования
document.getElementById('editMerchandiserForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // Здесь будет отправка данных на сервер
    const formData = new FormData(this);
    console.log('Редактирование мерчандайзера:', Object.fromEntries(formData));
    
    // Закрываем модальное окно
    const modal = bootstrap.Modal.getInstance(document.getElementById('editMerchandiserModal'));
    modal.hide();
    
    // Показываем уведомление
    showNotification('Данные мерчандайзера обновлены');
});

function deleteMerchandiser(id, name) {
    if (confirm(`Вы уверены, что хотите удалить мерчандайзера "${name}"?`)) {
        // Здесь будет запрос на удаление
        console.log('Удаление:', id);
        const card = document.querySelector(`.merchandiser-card:has(h5:contains("${name}"))`);
        card.closest('.col-md-6').remove();
        showNotification('Мерчандайзер успешно удален');
    }
} 