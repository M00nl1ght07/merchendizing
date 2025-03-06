document.addEventListener('DOMContentLoaded', function() {
    const headerComponent = document.getElementById('header-component');
    
    if (headerComponent) {
        // Загрузка компонента верхней панели
        fetch('components/header.html')
            .then(response => response.text())
            .then(html => {
                headerComponent.innerHTML = html;
                // Инициализация обработчиков уведомлений после загрузки компонента
                initializeNotifications();
            });
    }
});

// Функция инициализации уведомлений
function initializeNotifications() {
    const notificationBtn = document.querySelector('.notification-btn');
    const markAllReadBtn = document.querySelector('.mark-all-read');
    const markReadBtns = document.querySelectorAll('.mark-read');
    const badge = notificationBtn.querySelector('.badge');

    // Отметить все как прочитанные
    markAllReadBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const unreadItems = document.querySelectorAll('.notification-item.unread');
        unreadItems.forEach(item => {
            item.classList.remove('unread');
        });
        updateBadgeCount();
    });

    // Отметить одно уведомление как прочитанное
    markReadBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const item = this.closest('.notification-item');
            item.classList.remove('unread');
            updateBadgeCount();
        });
    });

    // Обновление счетчика непрочитанных уведомлений
    function updateBadgeCount() {
        const unreadCount = document.querySelectorAll('.notification-item.unread').length;
        badge.textContent = unreadCount;
        if (unreadCount === 0) {
            badge.style.display = 'none';
        } else {
            badge.style.display = 'block';
        }
    }
} 