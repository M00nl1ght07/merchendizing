// Глобальные переменные для графиков
let activityChart = null;
let regionsChart = null;

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

    // Загружаем данные при старте
    loadDashboardStats();

    // Обработчики для переключения периодов
    document.querySelectorAll('[data-period]').forEach(button => {
        button.addEventListener('click', function() {
            document.querySelectorAll('[data-period]').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            loadDashboardStats(this.dataset.period);
        });
    });

    // Обработчик изменения региона
    const regionFilter = document.getElementById('regionFilter');
    if (regionFilter) {
        regionFilter.addEventListener('change', () => {
            loadDashboardStats(
                document.querySelector('[data-period].active')?.dataset.period || 'week',
                regionFilter.value
            );
        });
    }
});

// Загрузка данных дашборда
async function loadDashboardStats(period = 'week', region = '') {
    try {
        const response = await fetch(`api/index.php?controller=stats&action=getDashboardStats&period=${period}&region=${region}`);
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Ошибка загрузки статистики');
        }

        console.log('Полученные данные:', data); // Для отладки

        // Обновляем метрики в карточках
        if (data.metrics) {
            document.querySelector('[data-stat="active-merchandisers"] h3').textContent = 
                data.metrics.active_merchandisers;
            
            document.querySelector('[data-stat="visits-today"] h3').textContent = 
                data.metrics.visits_today;
            
            document.querySelector('[data-stat="tasks-completed"] h3').textContent = 
                data.metrics.tasks_completed;
            
            document.querySelector('[data-stat="new-reports"] h3').textContent = 
                data.metrics.new_reports;
        }

        // Обновляем графики
        if (data.stats && data.stats.length > 0) {
            console.log('Данные для графика активности:', data.stats); // Для отладки
            updateActivityChart(data.stats);
        }

        if (data.regions && data.regions.length > 0) {
            console.log('Данные для графика регионов:', data.regions); // Для отладки
            updateRegionsChart(data.regions);
        }

    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'error');
    }
}

// График активности
function updateActivityChart(stats) {
    const ctx = document.getElementById('activityChart');
    if (!ctx) return;

    console.log('Данные для графика:', stats); // Отладка

    const chartData = {
        labels: stats.map(item => {
            const date = new Date(item.date);
            return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        }),
        datasets: [
            {
                label: 'Посещения',
                data: stats.map(item => parseInt(item.visits_count) || 0),
                borderColor: '#7C4DFF',
                backgroundColor: 'rgba(124, 77, 255, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            },
            {
                label: 'Отчеты',
                data: stats.map(item => parseInt(item.reports_count) || 0),
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            },
            {
                label: 'Эффективность',
                data: stats.map(item => parseFloat(item.efficiency_avg) || 0),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                min: 0,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: 10
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: 10
                }
            }
        },
        plugins: {
            legend: {
                labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };

    if (activityChart) {
        activityChart.destroy();
    }

    activityChart = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: chartOptions
    });
}

// График по регионам
function updateRegionsChart(regions) {
    const ctx = document.getElementById('regionsChart');
    if (!ctx) return;

    console.log('Данные для графика регионов:', regions); // Отладка

    const chartData = {
        labels: regions.map(r => r.region),
        datasets: [{
            label: 'Эффективность по регионам',
            data: regions.map(r => Math.round(parseFloat(r.efficiency_avg) || 0)),
            backgroundColor: regions.map((_, i) => {
                const colors = ['#7C4DFF', '#2196F3', '#4CAF50', '#FFC107', '#FF5722'];
                return colors[i % colors.length];
            }),
            borderRadius: 6,
            borderWidth: 0,
            maxBarThickness: 50
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                min: 0,
                max: 100,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: 10,
                    callback: function(value) {
                        return value + '%';
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: 10
                }
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const region = regions[context.dataIndex];
                        return [
                            `Эффективность: ${Math.round(context.parsed.y)}%`,
                            `Мерчандайзеров: ${region.merchandisers_count}`,
                            `Точек продаж: ${region.locations_count}`
                        ];
                    }
                }
            }
        }
    };

    if (regionsChart) {
        regionsChart.destroy();
    }

    regionsChart = new Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: chartOptions
    });
}

// Обновление метрик
function updateMetrics(stats) {
    if (!stats || !stats.length) return;

    // Берем последние значения для текущих показателей
    const latest = stats[stats.length - 1];
    
    // Считаем средние значения за период
    const avgVisits = Math.round(stats.reduce((sum, item) => sum + (item.visits_count || 0), 0) / stats.length);
    const avgReports = Math.round(stats.reduce((sum, item) => sum + (item.reports_count || 0), 0) / stats.length);
    const avgEfficiency = Math.round(stats.reduce((sum, item) => sum + (item.efficiency_avg || 0), 0) / stats.length);

    // Обновляем значения в карточках
    updateMetricValue('visits-today', latest.visits_count || 0, avgVisits);
    updateMetricValue('tasks-completed', latest.reports_count || 0, avgReports);
    updateMetricValue('efficiency', latest.efficiency_avg || 0, avgEfficiency);
}

// Вспомогательная функция для обновления метрики
function updateMetricValue(metricId, value, prevValue) {
    const container = document.querySelector(`[data-stat="${metricId}"]`);
    if (!container) return;

    const valueEl = container.querySelector('h3');
    const trendEl = container.querySelector('.trend');
    
    if (valueEl) {
        valueEl.textContent = metricId === 'efficiency' ? `${value}%` : value;
    }

    if (trendEl) {
        const trend = ((value - prevValue) / prevValue * 100) || 0;
        const trendClass = trend >= 0 ? 'up' : 'down';
        trendEl.className = `trend ${trendClass}`;
        trendEl.innerHTML = `
            <i class="fa fa-arrow-${trendClass}"></i>
            ${Math.abs(Math.round(trend))}%
        `;
    }
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