document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadReportForm');
    const searchInput = document.querySelector('input[placeholder="Поиск по названию..."]');
    const typeFilter = document.querySelector('select[class="form-select"]');
    const statusFilter = document.querySelectorAll('select[class="form-select"]')[1];
    const dateInputs = document.querySelectorAll('input[type="date"]');

    // Обработка загрузки отчета
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        
        // Здесь будет отправка на сервер
        console.log('Загрузка отчета:', Object.fromEntries(formData));
        
        // Временно: просто закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('uploadReportModal'));
        modal.hide();
        
        // Очищаем форму
        this.reset();
        
        // Показываем уведомление
        showNotification('Отчет успешно загружен');
    });

    // Поиск по названию
    searchInput.addEventListener('input', debounce(function() {
        filterReports();
    }, 300));

    // Фильтрация по типу и статусу
    typeFilter.addEventListener('change', filterReports);
    statusFilter.addEventListener('change', filterReports);

    // Фильтрация по дате
    dateInputs.forEach(input => {
        input.addEventListener('change', filterReports);
    });

    // Обработка действий с отчетами
    document.querySelectorAll('.actions .btn-icon').forEach(btn => {
        btn.addEventListener('click', function() {
            const action = this.getAttribute('title');
            const reportRow = this.closest('tr');
            const reportName = reportRow.querySelector('.report-name span').textContent;

            switch(action) {
                case 'Просмотреть':
                    viewReport(reportName);
                    break;
                case 'Скачать':
                    downloadReport(reportName);
                    break;
                case 'Удалить':
                    deleteReport(reportName, reportRow);
                    break;
            }
        });
    });
});

// Функция фильтрации отчетов
function filterReports() {
    const searchText = document.querySelector('input[placeholder="Поиск по названию..."]').value.toLowerCase();
    const selectedType = document.querySelector('select[class="form-select"]').value;
    const selectedStatus = document.querySelectorAll('select[class="form-select"]')[1].value;
    const startDate = document.querySelectorAll('input[type="date"]')[0].value;
    const endDate = document.querySelectorAll('input[type="date"]')[1].value;

    const rows = document.querySelectorAll('.table-reports tbody tr');

    rows.forEach(row => {
        const name = row.querySelector('.report-name span').textContent.toLowerCase();
        const type = row.querySelector('td:nth-child(2)').textContent;
        const status = row.querySelector('.badge').textContent;
        const date = row.querySelector('td:nth-child(4)').textContent;

        let visible = true;

        if (searchText && !name.includes(searchText)) visible = false;
        if (selectedType && type !== selectedType) visible = false;
        if (selectedStatus && status !== selectedStatus) visible = false;
        if (startDate && new Date(date) < new Date(startDate)) visible = false;
        if (endDate && new Date(date) > new Date(endDate)) visible = false;

        row.style.display = visible ? '' : 'none';
    });
}

// Функции для работы с отчетами
function viewReport(reportName) {
    // Здесь будет логика просмотра отчета
    console.log('Просмотр отчета:', reportName);
}

function downloadReport(reportName) {
    // Здесь будет логика скачивания отчета
    console.log('Скачивание отчета:', reportName);
}

function deleteReport(reportName, row) {
    if (confirm(`Вы уверены, что хотите удалить отчет "${reportName}"?`)) {
        // Здесь будет запрос на удаление
        console.log('Удаление отчета:', reportName);
        row.remove();
        showNotification('Отчет успешно удален');
    }
}

// Вспомогательные функции
function showNotification(message) {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'notification';
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