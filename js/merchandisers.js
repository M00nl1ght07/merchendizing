document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    const user = await checkAuth();
    if (!user) return;

    const searchInput = document.querySelector('input[placeholder="Поиск по имени..."]');
    const statusFilter = document.querySelector('select.form-select');
    const regionFilter = document.querySelectorAll('select.form-select')[1];
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

        const response = await fetch(`api/index.php?controller=merchandisers&action=getMerchandisers&${params}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        const container = document.querySelector('.merchandisers-grid');
        container.innerHTML = data.merchandisers.map(m => `
            <div class="merchandiser-card">
                <div class="merchandiser-header">
                    <img src="${m.avatar_url || 'images/avatar.png'}" alt="Avatar" class="merchandiser-avatar">
                    <div class="merchandiser-info">
                        <h5>${m.name}</h5>
                        <span class="badge bg-${getStatusColor(m.status)}">${getStatusText(m.status)}</span>
                    </div>
                    <div class="dropdown">
                        <button class="btn btn-icon" type="button" data-bs-toggle="dropdown">
                            <i class="fa fa-ellipsis-v"></i>
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <a class="dropdown-item" href="#" onclick="editMerchandiser(${m.id}); return false;">
                                    <i class="fa fa-pencil"></i> Редактировать
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger" href="#" onclick="deleteMerchandiser(${m.id}, '${m.name}'); return false;">
                                    <i class="fa fa-trash"></i> Удалить
                                </a>
                            </li>
                        </ul>
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
                    <a href="mailto:${m.email}" class="btn btn-outline-primary btn-sm">
                        <i class="fa fa-envelope"></i> Написать
                    </a>
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

function getStatusText(status) {
    const texts = {
        'active': 'Активный',
        'inactive': 'Неактивный',
        'pending': 'В ожидании'
    };
    return texts[status] || status;
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

// Функция для редактирования мерчандайзера
async function editMerchandiser(id) {
    try {
        console.log('Редактирование мерчандайзера:', id); // Отладка
        const response = await fetch(`api/index.php?controller=merchandisers&action=getMerchandiser&id=${id}`);
        const data = await response.json();
        console.log('Получены данные:', data); // Отладка

        if (!data.success) {
            throw new Error(data.error || 'Ошибка при получении данных мерчандайзера');
        }

        // Заполняем форму редактирования
        const form = document.getElementById('editMerchandiserForm');
        form.querySelector('[name="id"]').value = id;
        form.querySelector('[name="name"]').value = data.merchandiser.name;
        form.querySelector('[name="email"]').value = data.merchandiser.email;
        form.querySelector('[name="phone"]').value = data.merchandiser.phone;
        form.querySelector('[name="region"]').value = data.merchandiser.region;
        form.querySelector('[name="status"]').value = data.merchandiser.status;

        // Показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('editMerchandiserModal'));
        modal.show();

    } catch (error) {
        console.error('Ошибка при загрузке данных мерчандайзера:', error);
        showNotification(error.message, 'error');
    }
}

// Обработчик формы редактирования
document.getElementById('editMerchandiserForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(this);
        const response = await fetch('api/index.php?controller=merchandisers&action=updateMerchandiser', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Ошибка при обновлении данных');
        }

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('editMerchandiserModal'));
        modal.hide();
        
        // Обновляем список мерчандайзеров
        loadMerchandisers();
        
        // Показываем уведомление
        showNotification('Данные мерчандайзера обновлены');
    } catch (error) {
        console.error('Ошибка при обновлении данных:', error);
        showNotification(error.message, 'error');
    }
});

// Функция удаления мерчандайзера
async function deleteMerchandiser(id, name) {
    if (confirm(`Вы уверены, что хотите удалить мерчандайзера "${name}"?`)) {
        try {
            console.log('Удаление мерчандайзера:', id); // Отладка
            const response = await fetch(`api/index.php?controller=merchandisers&action=deleteMerchandiser&id=${id}`);
            const data = await response.json();
            console.log('Ответ сервера:', data); // Отладка

            if (!data.success) {
                throw new Error(data.error || 'Ошибка при удалении мерчандайзера');
            }
            
            // Перезагружаем список
            loadMerchandisers();
            showNotification('Мерчандайзер успешно удален');
        } catch (error) {
            console.error('Ошибка при удалении мерчандайзера:', error);
            showNotification(error.message, 'error');
        }
    }
} 