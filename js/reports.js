document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    const user = await checkAuth();
    if (!user) return;

    const uploadForm = document.getElementById('uploadReportForm');
    const searchInput = document.querySelector('input[placeholder="Поиск по названию..."]');
    const statusFilter = document.querySelectorAll('select[class="form-select"]')[1];
    const dateInputs = document.querySelectorAll('input[type="date"]');

    // Загружаем отчеты при загрузке страницы
    loadReports();

    // Обработка загрузки отчета
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        
        try {
            const response = await fetch('api/index.php?controller=reports&action=uploadReport', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }

            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('uploadReportModal'));
            modal.hide();
            
            // Очищаем форму
            this.reset();
            
            // Показываем уведомление
            showNotification('Отчет успешно загружен');
            
            // Перезагружаем список отчетов
            loadReports();

        } catch (error) {
            showNotification(error.message, 'error');
        }
    });

    // Поиск и фильтрация
    searchInput.addEventListener('input', debounce(loadReports, 300));
    statusFilter.addEventListener('change', loadReports);
    dateInputs.forEach(input => {
        input.addEventListener('change', loadReports);
    });
});

async function loadReports() {
    try {
        const searchText = document.querySelector('input[placeholder="Поиск по названию..."]').value;
        const status = document.querySelectorAll('select[class="form-select"]')[1].value;
        const startDate = document.querySelectorAll('input[type="date"]')[0].value;
        const endDate = document.querySelectorAll('input[type="date"]')[1].value;

        const params = new URLSearchParams({
            search: searchText,
            status: status,
            startDate: startDate,
            endDate: endDate
        });

        const response = await fetch(`api/index.php?controller=reports&action=getReports&${params}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Обновляем таблицу
        const tbody = document.querySelector('.table-reports tbody');
        tbody.innerHTML = data.reports.map(report => `
            <tr data-id="${report.id}">
                <td>
                    <div class="report-name">
                        <i class="fa fa-file-excel-o"></i>
                        <span>${report.name}</span>
                    </div>
                </td>
                <td>${report.type}</td>
                <td>${report.author}</td>
                <td>${new Date(report.created_at).toLocaleDateString()}</td>
                <td><span class="badge bg-${getStatusColor(report.status)}">${report.status}</span></td>
                <td>
                    <div class="actions">
                        <button class="btn btn-icon" onclick="viewReport('${report.file_path}')" title="Просмотреть">
                            <i class="fa fa-eye"></i>
                        </button>
                        <button class="btn btn-icon" onclick="downloadReport('${report.file_path}')" title="Скачать">
                            <i class="fa fa-download"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function getStatusColor(status) {
    const colors = {
        'new': 'primary',
        'in_progress': 'warning',
        'completed': 'success',
        'rejected': 'danger'
    };
    return colors[status] || 'secondary';
}

async function viewReport(filePath) {
    // Открываем файл в новом окне
    window.open(filePath, '_blank');
}

function downloadReport(filePath) {
    const link = document.createElement('a');
    link.href = filePath;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

// Вспомогательные функции
function showNotification(message, type = 'success') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Добавляем на страницу
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
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