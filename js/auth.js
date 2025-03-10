// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch('api/index.php?controller=auth&action=checkAuth');
        const data = await response.json();

        // Если нет авторизации и мы не на странице логина - редиректим на логин
        if (!data.success) {
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('register.html')) {
                window.location.href = 'login.html';
            }
            return null;
        }

        const user = data.user;
        localStorage.setItem('user', JSON.stringify(user));

        // Если мерчендайзер пытается зайти на недоступные страницы - редиректим на дашборд
        if (user.type === 'merchandiser') {
            const allowedPages = ['dashboard.html', 'reports.html', 'locations.html', 'profile.html', 'settings.html'];
            const currentPage = window.location.pathname.split('/').pop();
            
            if (!allowedPages.includes(currentPage)) {
                window.location.href = 'dashboard.html';
                return null;
            }
        }

        return user;
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        return null;
    }
}

// Выход из системы
async function logout() {
    try {
        localStorage.removeItem('user');
        await fetch('api/index.php?controller=auth&action=logout');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }
}

// Проверка прав доступа к странице
function checkPermission(page) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return false;
    
    // Админ имеет доступ ко всему
    if (user.type === 'admin') return true;
    
    // Страницы, доступные для мерчендайзера
    if (user.type === 'merchandiser') {
        const allowedPages = ['dashboard.html', 'reports.html', 'locations.html', 'profile.html', 'settings.html'];
        return allowedPages.includes(page.toLowerCase());
    }
    
    return false;
}

// Функция проверки доступа к странице
async function checkPageAccess() {
    const user = await checkAuth();
    if (!user) return false;

    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    
    // Пропускаем проверку для страниц логина и регистрации
    if (['login.html', 'register.html'].includes(currentPage)) {
        return true;
    }

    // Проверяем доступ к текущей странице
    if (!checkPermission(currentPage)) {
        showNotification('У вас нет доступа к этой странице', 'error');
        window.location.href = 'dashboard.html';
        return false;
    }

    // Страницы, доступные только админам
    const adminOnlyPages = ['merchandisers.html', 'analytics.html'];

    // Если страница только для админов и пользователь не админ
    if (adminOnlyPages.includes(currentPage) && user.type !== 'admin') {
        window.location.href = 'dashboard.html';
        return;
    }

    return true;
}

// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Обработчик кликов по меню
function handleMenuClick(event) {
    const link = event.target.closest('a');
    if (!link) return;

    const page = link.getAttribute('href');
    if (!page) return;

    if (!checkPermission(page)) {
        event.preventDefault();
        showNotification('У вас нет доступа к этой странице', 'error');
        return false;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Если мы на странице логина или регистрации - не проверяем авторизацию
    if (window.location.pathname.includes('login.html') || 
        window.location.pathname.includes('register.html')) {
        return;
    }

    const user = await checkAuth();
    
    if (!user) return;

    // Настраиваем интерфейс для мерчендайзера
    if (user.type === 'merchandiser') {
        // Скрываем недоступные пункты меню
        document.querySelectorAll('.sidebar-nav li').forEach(el => {
            const link = el.querySelector('a');
            if (link) {
                const href = link.getAttribute('href');
                const allowedPages = ['dashboard.html', 'reports.html', 'locations.html', 'profile.html', 'settings.html'];
                if (!allowedPages.includes(href)) {
                    el.style.display = 'none';
                }
            }
        });

        // Скрываем все элементы с классом admin-only
        document.querySelectorAll('.admin-only').forEach(el => {
            el.style.display = 'none';
        });

        // Блокируем все поля в настройках
        if (window.location.pathname.includes('settings.html')) {
            document.querySelectorAll('input, select, textarea').forEach(input => {
                input.disabled = true;
            });
            document.querySelectorAll('button[type="submit"]').forEach(button => {
                button.style.display = 'none';
            });
        }
    }

    // Добавляем обработчик для меню
    const sidebar = document.querySelector('.sidebar-nav');
    if (sidebar) {
        sidebar.addEventListener('click', handleMenuClick);
    }
}); 