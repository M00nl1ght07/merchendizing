// Глобальные переменные для графиков
let activityChart, tasksChart, efficiencyChart;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена, начинаем инициализацию...');

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

    // Инициализация графиков
    initCharts();
});

// Функция инициализации графиков
function initCharts() {
    console.log('Инициализация графиков...');
    const activityCtx = document.getElementById('activityChart');
    const tasksCtx = document.getElementById('tasksChart');
    const efficiencyCtx = document.getElementById('efficiencyChart');

    console.log('Найдены элементы:', {activityCtx, tasksCtx, efficiencyCtx});
    
    if (!activityCtx || !tasksCtx || !efficiencyCtx) {
        console.error('Не найдены элементы canvas для графиков');
        return;
    }

    // Инициализация графика активности
    activityChart = new Chart(activityCtx, {
        type: 'line',
        data: {
            labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            datasets: [{
                data: [12, 19, 15, 17, 14, 8, 5],
                borderColor: '#7C4DFF',
                backgroundColor: 'rgba(124, 77, 255, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Инициализация графика задач
    tasksChart = new Chart(tasksCtx, {
        type: 'doughnut',
        data: {
            labels: ['Выполнено', 'В процессе', 'Не начато'],
            datasets: [{
                data: [65, 25, 10],
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
            labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
            datasets: [{
                data: [85, 92, 88, 95, 91],
                backgroundColor: '#2196F3'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });

    console.log('Графики инициализированы:', { activityChart, tasksChart, efficiencyChart });

    // Обработчики периодов для графика активности
    const periodButtons = document.querySelectorAll('[data-period]');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            periodButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateActivityChart(this.dataset.period);
        });
    });
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