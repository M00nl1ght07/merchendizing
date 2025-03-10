// Глобальные переменные для графиков
let activityChart, tasksChart, efficiencyChart;

document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    const user = await checkAuth();
    if (!user) return;

    // Мерчендайзерам тут делать нечего
    if (user.role === 'merchandiser') {
        window.location.href = 'profile.html';
        return;
    }

    // Устанавливаем класс для body
    document.body.setAttribute('data-user-type', user.role);

    // Инициализация меню
    let menuToggle = document.querySelector('.menu-toggle');
    let sidebar = document.querySelector('.sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 992) {
                if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }

    // Загрузка данных
    await Promise.all([
        loadDashboardStats(),
        loadTopMerchandisers()
    ]);

    // Обработчики для переключения периодов графиков
    document.querySelectorAll('[data-period]').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('[data-period]').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateActivityChart(this.dataset.period);
        });
    });
});

function initCharts(data) {
    console.log('Инициализация графиков...');

    // Уничтожаем существующие графики перед созданием новых
    if (activityChart) activityChart.destroy();
    if (tasksChart) tasksChart.destroy();
    if (efficiencyChart) efficiencyChart.destroy();

    const ctx = document.getElementById('activityChart');
    const tasksCtx = document.getElementById('tasksChart');
    const efficiencyCtx = document.getElementById('efficiencyChart');

    if (!ctx || !tasksCtx || !efficiencyCtx) {
        console.error('Не найдены элементы canvas для графиков');
        return;
    }

    // Инициализация графика активности
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.activity.map(item => item.date),
            datasets: [{
                label: 'Активность',
                data: data.activity.map(item => item.visits),
                borderColor: '#7c4dff',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Инициализация графика задач
    tasksChart = new Chart(tasksCtx, {
        type: 'doughnut',
        data: {
            labels: ['Выполнено', 'В процессе', 'Не начато'],
            datasets: [{
                data: [
                    data.tasks.completed || 0,
                    data.tasks.in_progress || 0,
                    data.tasks.not_started || 0
                ],
                backgroundColor: ['#4CAF50', '#FFC107', '#F44336']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Инициализация графика эффективности
    efficiencyChart = new Chart(efficiencyCtx, {
        type: 'bar',
        data: {
            labels: data.efficiency.map(item => item.name),
            datasets: [{
                label: 'Эффективность',
                data: data.efficiency.map(item => item.avg_efficiency),
                backgroundColor: '#7c4dff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    console.log('Графики инициализированы:', { activityChart, tasksChart, efficiencyChart });
}

// Функция обновления данных графика активности
function updateActivityChart(period) {
    const data = {
        week: [12, 19, 15, 17, 14, 8, 5],
        month: [45, 52, 38, 41, 44],
        year: [380, 420, 390, 450, 400, 420, 410, 380, 405, 415, 420, 430]
    };

    const labels = {
        week: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
        month: ['Нед 1', 'Нед 2', 'Нед 3', 'Нед 4', 'Нед 5'],
        year: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
    };

    if (activityChart) {
        activityChart.data.labels = labels[period];
        activityChart.data.datasets[0].data = data[period];
        activityChart.update();
    }
}

async function loadDashboardStats() {
    try {
        const response = await fetch('api/index.php?controller=dashboard&action=getStats');
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Обновляем статистику на странице
        updateStats(data.stats);
        
        // Инициализируем графики с реальными данными
        initCharts(data.charts);

    } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        alert('Ошибка при загрузке данных дашборда');
    }
}

function updateStats(stats) {
    // Обновляем карточки со статистикой
    document.querySelector('[data-stat="active-merchandisers"] h3').textContent = stats.merchandisers.active;
    document.querySelector('[data-stat="visits-today"] h3').textContent = stats.visits.today;
    document.querySelector('[data-stat="tasks-completed"] h3').textContent = stats.tasks.completed + '%';
    document.querySelector('[data-stat="new-reports"] h3').textContent = stats.reports.new;

    // Обновляем тренды
    updateTrend('[data-stat="active-merchandisers"]', stats.merchandisers.trend);
    updateTrend('[data-stat="visits-today"]', stats.visits.trend);
    updateTrend('[data-stat="tasks-completed"]', stats.tasks.trend);
    updateTrend('[data-stat="new-reports"]', stats.reports.trend);
}

function updateTrend(selector, value) {
    const element = document.querySelector(`${selector} .trend`);
    element.className = `trend ${value >= 0 ? 'up' : 'down'}`;
    element.innerHTML = `
        <i class="fa fa-arrow-${value >= 0 ? 'up' : 'down'}"></i>
        ${Math.abs(value)}%
    `;
}

async function loadTopMerchandisers() {
    try {
        const response = await fetch('api/index.php?controller=dashboard&action=getTopMerchandisers');
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        // Обновляем список топ мерчендайзеров
        const list = document.querySelector('.merchandiser-list');
        list.innerHTML = data.merchandisers.map(m => `
            <li class="merchandiser-item">
                <img src="${m.avatar_url || 'images/avatar.png'}" alt="Avatar" class="avatar">
                <div class="merchandiser-info">
                    <h6>${m.name}</h6>
                    <p>${m.visit_count} посещений</p>
                </div>
                <span class="badge bg-${m.completion_rate >= 90 ? 'success' : 
                                      m.completion_rate >= 70 ? 'warning' : 
                                      'danger'}">${m.completion_rate}%</span>
            </li>
        `).join('');

    } catch (error) {
        console.error('Ошибка при загрузке топ мерчендайзеров:', error);
    }
} 