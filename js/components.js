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
            const userNameElement = document.getElementById('user-name');
            const userAvatarElement = document.getElementById('user-avatar');
            
            if (userNameElement) userNameElement.textContent = user.name;
            if (userAvatarElement) {
                userAvatarElement.src = user.avatar_url || 'images/avatar.png';
                userAvatarElement.alt = user.name;
            }
        }

        // Загружаем уведомления
        loadNotifications();
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

        if (data.error) throw new Error(data.error);

        const notificationsList = document.getElementById('notifications-list');
        const notificationsCount = document.getElementById('notifications-count');

        if (notificationsList) {
            notificationsList.innerHTML = data.notifications.length ? 
                data.notifications.map(n => `
                    <div class="notification-item ${n.is_read ? 'read' : ''}" onclick="markNotificationRead(${n.id})">
                        <div class="notification-content">
                            <h6>${n.title}</h6>
                            <p>${n.message}</p>
                        </div>
                        <small>${formatDate(n.created_at)}</small>
                    </div>
                `).join('') : 
                '<div class="no-notifications">Нет новых уведомлений</div>';
        }

        if (notificationsCount) {
            const unreadCount = data.notifications.filter(n => !n.is_read).length;
            notificationsCount.textContent = unreadCount;
            notificationsCount.style.display = unreadCount ? 'block' : 'none';
        }

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

function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
} 