// Конфигурация пунктов меню
const menuItems = {
    admin: [
        { href: 'dashboard.html', icon: 'dashboard', text: 'Дашборд' },
        { href: 'reports.html', icon: 'file-text', text: 'Отчеты' },
        { href: 'merchandisers.html', icon: 'users', text: 'Мерчендайзеры' },
        { href: 'locations.html', icon: 'map-marker', text: 'Точки продаж' },
        { href: 'analytics.html', icon: 'line-chart', text: 'Аналитика' },
        { href: 'settings.html', icon: 'cog', text: 'Настройки' }
    ],
    merchandiser: [
        { href: 'dashboard.html', icon: 'dashboard', text: 'Дашборд' },
        { href: 'reports.html', icon: 'file-text', text: 'Отчеты' },
        { href: 'locations.html', icon: 'map-marker', text: 'Точки продаж' }
    ]
};

// Функция генерации меню
function generateMenu() {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const currentPage = window.location.pathname.split('/').pop();
    const items = menuItems[user.type] || menuItems.merchandiser;
    
    const menuHtml = items.map(item => `
        <li class="${currentPage === item.href ? 'active' : ''}">
            <a href="${item.href}">
                <i class="fa fa-${item.icon}"></i>
                <span>${item.text}</span>
            </a>
        </li>
    `).join('');

    const sidebar = document.querySelector('.sidebar-nav ul');
    if (sidebar) {
        sidebar.innerHTML = menuHtml;
    }
}

// Инициализация меню при загрузке страницы
document.addEventListener('DOMContentLoaded', generateMenu); 