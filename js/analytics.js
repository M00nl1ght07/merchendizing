document.addEventListener('DOMContentLoaded', function() {
    // Настройка темной темы для Chart.js
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    // График эффективности по дням
    const efficiencyChart = new Chart(
        document.getElementById('efficiencyChart'),
        {
            type: 'line',
            data: {
                labels: ['1 Мар', '2 Мар', '3 Мар', '4 Мар', '5 Мар', '6 Мар', '7 Мар'],
                datasets: [{
                    label: 'Эффективность',
                    data: [92, 95, 89, 96, 94, 98, 95],
                    borderColor: '#7C4DFF',
                    backgroundColor: 'rgba(124, 77, 255, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#7C4DFF',
                    pointBorderColor: '#1E293B',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        titleColor: '#fff',
                        bodyColor: '#94A3B8',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Эффективность: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#94A3B8',
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
                            color: '#94A3B8'
                        }
                    }
                }
            }
        }
    );

    // График распределения по регионам
    const regionsChart = new Chart(
        document.getElementById('regionsChart'),
        {
            type: 'doughnut',
            data: {
                labels: ['Москва', 'Санкт-Петербург', 'Казань'],
                datasets: [{
                    data: [45, 35, 20],
                    backgroundColor: [
                        '#7C4DFF',
                        '#4CAF50',
                        '#FF9800'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            color: '#94A3B8',
                            font: {
                                size: 12
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        backgroundColor: '#1E293B',
                        titleColor: '#fff',
                        bodyColor: '#94A3B8',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                }
            }
        }
    );

    // Обработка фильтров
    const periodFilter = document.querySelector('.analytics-filters select:first-child');
    const regionFilter = document.querySelector('.analytics-filters select:last-child');

    function updateData() {
        const period = periodFilter.value;
        const region = regionFilter.value;

        // Здесь будет запрос на сервер за новыми данными
        console.log('Обновление данных:', { period, region });

        // Пример обновления данных (в реальности данные придут с сервера)
        if (region) {
            efficiencyChart.data.datasets[0].data = generateRandomData(7, 85, 100);
            regionsChart.data.datasets[0].data = [100, 0, 0];
        } else {
            efficiencyChart.data.datasets[0].data = generateRandomData(7, 85, 100);
            regionsChart.data.datasets[0].data = [45, 35, 20];
        }

        efficiencyChart.update();
        regionsChart.update();
        updateMetrics();
    }

    // Генерация тестовых данных
    function generateRandomData(count, min, max) {
        return Array.from({ length: count }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
        );
    }

    // Обновление метрик
    function updateMetrics() {
        const metrics = document.querySelectorAll('.metric-info h3');
        metrics.forEach(metric => {
            const currentValue = parseInt(metric.textContent);
            const newValue = currentValue + Math.floor(Math.random() * 10) - 5;
            metric.textContent = metric.textContent.includes('%') ? 
                `${newValue}%` : newValue.toLocaleString();
        });
    }

    // Обработчики событий
    periodFilter.addEventListener('change', updateData);
    regionFilter.addEventListener('change', updateData);

    // Сортировка таблицы
    document.querySelectorAll('.table-analytics th').forEach(header => {
        header.addEventListener('click', () => {
            const table = header.closest('table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const index = Array.from(header.parentNode.children).indexOf(header);
            
            rows.sort((a, b) => {
                const aValue = a.children[index].textContent;
                const bValue = b.children[index].textContent;
                return aValue.localeCompare(bValue);
            });

            tbody.append(...rows);
        });
    });
}); 