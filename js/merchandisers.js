document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('input[placeholder="Поиск по имени..."]');
    const statusFilter = document.querySelector('select[class="form-select"]');
    const regionFilter = document.querySelectorAll('select[class="form-select"]')[1];
    const addForm = document.getElementById('addMerchandiserForm');

    // Фильтрация мерчандайзеров
    function filterMerchandisers() {
        const searchText = searchInput.value.toLowerCase();
        const selectedStatus = statusFilter.value.toLowerCase();
        const selectedRegion = regionFilter.value.toLowerCase();

        const cards = document.querySelectorAll('.merchandiser-card');

        cards.forEach(card => {
            const name = card.querySelector('h5').textContent.toLowerCase();
            const status = card.querySelector('.badge').textContent.toLowerCase();
            const region = card.querySelector('.region span').textContent.toLowerCase();

            let visible = true;

            if (searchText && !name.includes(searchText)) visible = false;
            if (selectedStatus && status !== selectedStatus) visible = false;
            if (selectedRegion && region !== selectedRegion) visible = false;

            card.closest('.col-md-6').style.display = visible ? '' : 'none';
        });
    }

    // Обработчики событий для фильтров
    searchInput.addEventListener('input', debounce(filterMerchandisers, 300));
    statusFilter.addEventListener('change', filterMerchandisers);
    regionFilter.addEventListener('change', filterMerchandisers);

    // Обработка формы добавления мерчандайзера
    addForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        
        // Здесь будет отправка на сервер
        console.log('Добавление мерчандайзера:', Object.fromEntries(formData));
        
        // Закрываем модальное окно
        const modal = bootstrap.Modal.getInstance(document.getElementById('addMerchandiserModal'));
        modal.hide();
        
        // Очищаем форму
        this.reset();
        
        // Показываем уведомление
        showNotification('Мерчандайзер успешно добавлен');
    });

    // Обработка действий с мерчандайзерами
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const action = this.textContent.trim();
            const card = this.closest('.merchandiser-card');
            const name = card.querySelector('h5').textContent;

            switch(action) {
                case 'Редактировать':
                    editMerchandiser(name);
                    break;
                case 'Удалить':
                    deleteMerchandiser(name, card);
                    break;
            }
        });
    });
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

function deleteMerchandiser(name, card) {
    if (confirm(`Вы уверены, что хотите удалить мерчандайзера "${name}"?`)) {
        // Здесь будет запрос на удаление
        console.log('Удаление:', name);
        card.closest('.col-md-6').remove();
        showNotification('Мерчандайзер успешно удален');
    }
} 