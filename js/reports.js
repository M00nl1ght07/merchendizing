// Глобальные переменные
let currentUser;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        console.log('Начало загрузки страницы');
        
        // Проверяем авторизацию
        currentUser = JSON.parse(localStorage.getItem('user'));
        console.log('Текущий пользователь:', currentUser);
        if (!currentUser) throw new Error('Пользователь не авторизован');

        // Скрываем кнопку загрузки отчета для администраторов
        const uploadButton = document.querySelector('button[data-bs-target="#uploadReportModal"]');
        if (uploadButton && currentUser.type === 'admin') {
            uploadButton.style.display = 'none';
        }

        // Инициализируем обработчики
        initializeFilters();
        initializeUploadForm();
        
        // Немедленно загружаем отчеты при старте
        console.log('Начинаем загрузку отчетов');
        await loadReports();

    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
});

// Инициализация фильтров
function initializeFilters() {
    const searchInput = document.querySelector('input[placeholder="Поиск по названию..."]');
    const typeSelect = document.querySelector('select[name="type"]');
    const statusSelect = document.querySelector('select[name="status"]');
    const dateFromInput = document.querySelector('input[name="dateFrom"]');
    const dateToInput = document.querySelector('input[name="dateTo"]');

    // Добавляем обработчики изменений фильтров
    [searchInput, typeSelect, statusSelect, dateFromInput, dateToInput].forEach(element => {
        if (element) {
            element.addEventListener('change', () => loadReports());
        }
    });

    // Добавляем debounce для поиска
    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => loadReports(), 300));
    }
}

// Инициализация формы загрузки
function initializeUploadForm() {
    const uploadForm = document.getElementById('uploadReportForm');
    if (uploadForm) {
        // Загружаем список точек только для мерчендайзера
        if (currentUser.type === 'merchandiser') {
            loadMerchandiserLocations();
        }
        
        uploadForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await uploadReport(this);
        });
    }
}

// Функция загрузки точек продаж для мерчендайзера
async function loadMerchandiserLocations() {
    try {
        const response = await fetch('api/index.php?controller=locations&action=getMerchandiserLocations');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Заполняем select точками продаж
        const locationSelect = document.querySelector('select[name="location_id"]');
        if (locationSelect) {
            locationSelect.innerHTML = `
                <option value="">Выберите точку продаж</option>
                ${data.locations.map(location => `
                    <option value="${location.id}">${location.name}</option>
                `).join('')}
            `;
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}

// Функция загрузки отчетов
async function loadReports() {
    try {
        console.log('Вызвана функция loadReports');
        
        const params = new URLSearchParams({
            search: document.querySelector('input[placeholder="Поиск по названию..."]')?.value || '',
            status: document.querySelector('select[name="status"]')?.value || '',
            dateFrom: document.querySelector('input[name="dateFrom"]')?.value || '',
            dateTo: document.querySelector('input[name="dateTo"]')?.value || ''
        });
        
        console.log('Параметры запроса:', params.toString());

        const response = await fetch(`api/index.php?controller=reports&action=getReports&${params.toString()}`);
        const data = await response.json();
        
        console.log('Получены данные:', data);

        if (!data.success) {
            throw new Error(data.error || 'Ошибка загрузки отчетов');
        }

        // Обновляем таблицу отчетов
        console.log('Обновляем таблицу с отчетами:', data.reports);
        updateReportsTable(data.reports);

    } catch (error) {
        console.error('Ошибка загрузки отчетов:', error);
        showNotification(error.message, 'error');
    }
}

// Загрузка отчета
async function uploadReport(form) {
    try {
        const formData = new FormData(form);
        
        const response = await fetch('api/index.php?controller=reports&action=uploadReport', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Ошибка при загрузке отчета');
        }

        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('uploadReportModal'));
        modal.hide();

        // Очищаем форму
        form.reset();

        // Обновляем список отчетов
        await loadReports();
        showNotification('Отчет успешно загружен');

    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}

// Обновление таблицы отчетов
function updateReportsTable(reports) {
    console.log('Вызвана функция updateReportsTable с данными:', reports);
    
    const tbody = document.querySelector('.table-reports tbody');
    console.log('Найден tbody:', tbody);
    
    if (!tbody) {
        console.error('Таблица не найдена в DOM');
        return;
    }

    if (!reports || reports.length === 0) {
        console.log('Отчеты не найдены, показываем пустую таблицу');
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">Отчеты не найдены</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = reports.map(report => `
        <tr>
            <td>
                <div class="report-name">
                    <i class="fa fa-file-excel-o"></i>
                    <span>${report.name}</span>
                </div>
            </td>
            <td>${report.author}</td>
            <td>${formatDate(report.created_at)}</td>
            <td>
                <span class="badge bg-${getStatusColor(report.status)}">${getStatusText(report.status)}</span>
            </td>
            <td>
                <div class="actions">
                    <button class="btn btn-icon" onclick="viewReport(${report.id})" title="Просмотреть">
                        <i class="fa fa-eye"></i>
                    </button>
                    ${currentUser.type === 'admin' ? `
                        <button class="btn btn-icon" onclick="approveReport(${report.id})" title="Одобрить">
                            <i class="fa fa-check"></i>
                        </button>
                        <button class="btn btn-icon" onclick="rejectReport(${report.id})" title="Отклонить">
                            <i class="fa fa-times"></i>
                        </button>
                        <button class="btn btn-icon" onclick="deleteReport(${report.id})" title="Удалить">
                            <i class="fa fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// Вспомогательные функции
function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'approved': 'success',
        'rejected': 'danger'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const statuses = {
        'pending': 'На проверке',
        'approved': 'Одобрен',
        'rejected': 'Отклонен'
    };
    return statuses[status] || status;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Плавное исчезновение
    setTimeout(() => {
        notification.classList.add('hiding');
        setTimeout(() => notification.remove(), 300);
    }, 2700);
}

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

async function viewReport(reportId) {
    try {
        const response = await fetch(`api/index.php?controller=reports&action=viewReport&report_id=${reportId}`);
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Ошибка при открытии файла');
        }

        // Создаем модальное окно для просмотра
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'viewReportModal';
        modal.innerHTML = `
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Просмотр отчета</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body p-0">
                        <iframe src="${data.viewerUrl}" width="100%" height="600px" frameborder="0"></iframe>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();

        // Удаляем модальное окно после закрытия
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });

    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function approveReport(reportId) {
    if (!confirm('Вы уверены, что хотите одобрить этот отчет?')) {
        return;
    }

    try {
        const response = await fetch(`api/index.php?controller=reports&action=approveReport&report_id=${reportId}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        showNotification('Отчет успешно одобрен');
        loadReports();

    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function rejectReport(reportId) {
    if (!confirm('Вы уверены, что хотите отклонить этот отчет?')) {
        return;
    }

    try {
        const response = await fetch(`api/index.php?controller=reports&action=rejectReport&report_id=${reportId}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        showNotification('Отчет успешно отклонен');
        loadReports();

    } catch (error) {
        showNotification(error.message, 'error');
    }
}

async function deleteReport(reportId) {
    if (!confirm('Вы уверены, что хотите удалить этот отчет?')) {
        return;
    }

    try {
        const formData = new FormData();
        formData.append('report_id', reportId);

        const response = await fetch('api/index.php?controller=reports&action=deleteReport', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        showNotification('Отчет успешно удален');
        loadReports();

    } catch (error) {
        showNotification(error.message, 'error');
    }
} 