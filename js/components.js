document.addEventListener('DOMContentLoaded', async function() {
    const headerComponent = document.getElementById('header-component');
    
    if (headerComponent) {
        // Загрузка компонента верхней панели
        const headerResponse = await fetch('components/header.html');
        const headerHtml = await headerResponse.text();
        headerComponent.innerHTML = headerHtml;

        // Проверяем авторизацию и получаем данные пользователя
        const user = await checkAuth();
        if (user) {
            // Обновляем информацию пользователя в шапке
            document.getElementById('userName').textContent = user.name;
            if (user.avatar_url) {
                document.getElementById('userAvatar').src = user.avatar_url;
            }
        }

        // Инициализация обработчиков уведомлений
        initializeNotifications();

        // Добавляем загрузку уведомлений
        await loadNotifications();
        // Обновляем уведомления каждые 5 минут
        setInterval(loadNotifications, 300000);
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

// Функция загрузки уведомлений
async function loadNotifications() {
    try {
        const response = await fetch('api/index.php?controller=auth&action=getNotifications');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Обновляем список уведомлений
        const notificationsBody = document.querySelector('.notifications-body');
        notificationsBody.innerHTML = data.notifications.map(notification => `
            <div class="notification-item ${notification.is_read ? '' : 'unread'}" data-id="${notification.id}">
                <div class="notification-icon ${notification.type}">
                    <i class="fa fa-${getNotificationIcon(notification.type)}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-text">
                        <strong>${notification.title}</strong> ${notification.message}
                    </div>
                    <div class="notification-time">${formatNotificationTime(notification.created_at)}</div>
                </div>
                ${!notification.is_read ? `
                    <button class="btn btn-link mark-read">
                        <i class="fa fa-check"></i>
                    </button>
                ` : ''}
            </div>
        `).join('');

        // Обновляем счетчик
        const badge = document.querySelector('.notifications .badge');
        badge.textContent = data.unread_count;
        badge.style.display = data.unread_count > 0 ? 'block' : 'none';

        // Переинициализируем обработчики
        initializeNotificationHandlers();

    } catch (error) {
        console.error('Ошибка при загрузке уведомлений:', error);
    }
}

// Функция инициализации обработчиков уведомлений
function initializeNotificationHandlers() {
    const markAllReadBtn = document.querySelector('.mark-all-read');
    const markReadBtns = document.querySelectorAll('.mark-read');

    // Отметить все как прочитанные
    markAllReadBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        try {
            const response = await fetch('api/index.php?controller=auth&action=markNotificationRead', {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                loadNotifications(); // Перезагружаем уведомления
            }
        } catch (error) {
            console.error('Ошибка при отметке уведомлений:', error);
        }
    });

    // Отметить одно уведомление как прочитанное
    markReadBtns.forEach(btn => {
        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            const item = this.closest('.notification-item');
            const notificationId = item.dataset.id;

            try {
                const response = await fetch('api/index.php?controller=auth&action=markNotificationRead', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: `notification_id=${notificationId}`
                });
                const data = await response.json();
                if (data.success) {
                    loadNotifications(); // Перезагружаем уведомления
                }
            } catch (error) {
                console.error('Ошибка при отметке уведомления:', error);
            }
        });
    });
}

// Вспомогательные функции
function getNotificationIcon(type) {
    const icons = {
        'report': 'file-text',
        'task': 'tasks',
        'system': 'info-circle'
    };
    return icons[type] || 'bell';
}

function formatNotificationTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // разница в секундах

    if (diff < 60) return 'только что';
    if (diff < 3600) return `${Math.floor(diff / 60)} мин. назад`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ч. назад`;
    return date.toLocaleDateString();
} 