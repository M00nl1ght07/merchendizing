document.addEventListener('DOMContentLoaded', async function() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) throw new Error('Пользователь не авторизован');

        // Загружаем данные компании
        const response = await fetch('api/index.php?controller=settings&action=getCompanySettings');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Ошибка загрузки настроек');
        }

        // Заполняем поля формы
        const companyForm = document.getElementById('companyForm');
        if (companyForm) {
            companyForm.querySelector('input[name="company_name"]').value = data.company.name;
            companyForm.querySelector('input[name="inn"]').value = data.company.inn;
            companyForm.querySelector('input[name="address"]').value = data.company.address || '';
            companyForm.querySelector('input[name="phone"]').value = data.company.phone || '';

            // Если это мерчендайзер - делаем все поля неактивными
            if (user.type === 'merchandiser') {
                // Делаем все input и select неактивными
                companyForm.querySelectorAll('input, select, textarea').forEach(element => {
                    element.disabled = true;
                });

                // Скрываем все кнопки сохранения
                companyForm.querySelectorAll('button[type="submit"]').forEach(button => {
                    button.style.display = 'none';
                });

                // Добавляем сообщение о том, что настройки доступны только для просмотра
                const notice = document.createElement('div');
                notice.className = 'alert alert-info mt-3';
                notice.textContent = 'Настройки доступны только для просмотра';
                companyForm.insertBefore(notice, companyForm.firstChild);
            } else {
                // Для админа - добавляем обработчик формы
                companyForm.addEventListener('submit', async function(e) {
                    e.preventDefault();
                    try {
                        const formData = new FormData(this);
                        const response = await fetch('api/index.php?controller=settings&action=updateCompany', {
                            method: 'POST',
                            body: formData
                        });

                        const data = await response.json();
                        if (!data.success) {
                            throw new Error(data.error);
                        }

                        showNotification('Настройки успешно сохранены', 'success');
                    } catch (error) {
                        console.error('Ошибка при сохранении настроек:', error);
                        showNotification(error.message, 'error');
                    }
                });
            }
        }

        // Инициализация маски для телефона
        const phoneInput = document.querySelector('input[name="phone"]');
        if (phoneInput) {
            IMask(phoneInput, {
                mask: '+{7} ({9}00) 000-00-00',
                lazy: false
            });
        }

        // Делаем все переключатели уведомлений включенными и неактивными
        const notificationSwitches = document.querySelectorAll('.settings-section input[type="checkbox"]');
        notificationSwitches.forEach(switchEl => {
            // Включаем все переключатели
            switchEl.checked = true;
            
            // Делаем их неактивными
            switchEl.disabled = true;
            
            // Добавляем стили, чтобы визуально показать, что они всегда включены
            const switchLabel = switchEl.closest('label') || switchEl.parentElement;
            if (switchLabel) {
                switchLabel.style.opacity = '1';
                switchLabel.style.cursor = 'default';
            }
        });

        // При отправке формы настроек уведомлений
        const notificationsForm = document.getElementById('notificationsForm');
        if (notificationsForm) {
            notificationsForm.addEventListener('submit', function(e) {
                // Убеждаемся, что все переключатели отмечены как включенные перед отправкой
                notificationsForm.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = true;
                });
            });
        }

        // Обработка интеграций
        await loadIntegrationsStatus();

        // Если пользователь не администратор, делаем кнопки интеграций неактивными
        if (user.type !== 'admin') {
            document.querySelectorAll('.integration-item button').forEach(button => {
                button.disabled = true;
                button.classList.add('disabled');
                button.style.cursor = 'not-allowed';
                button.style.opacity = '0.6';
            });
        } else {
            // Обработчики для кнопок интеграций (только для админов)
            const integrationButtons = document.querySelectorAll('.integration-item button');
            
            // Кнопка 1C (первая в списке)
            if (integrationButtons[0]) {
                integrationButtons[0].addEventListener('click', function() {
                    alert('Подключение к системе 1С:Предприятие в разработке');
                });
            }

            // Кнопка Excel (вторая в списке)
            if (integrationButtons[1]) {
                integrationButtons[1].addEventListener('click', async function() {
                    try {
                        // Определяем текущий статус по классу кнопки
                        const isActive = this.classList.contains('btn-outline-danger');
                        const type = 'excel';
                        const status = isActive ? 'disabled' : 'active';

                        console.log(`Меняем статус Excel: ${isActive ? 'active->disabled' : 'disabled->active'}`);

                        const response = await fetch('api/index.php?controller=settings&action=updateIntegration', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: `type=${type}&status=${status}`
                        });

                        const data = await response.json();

                        if (data.success) {
                            // Обновляем внешний вид кнопки
                            if (status === 'active') {
                                this.textContent = 'Отключить';
                                this.classList.remove('btn-outline-primary');
                                this.classList.add('btn-outline-danger');
                                localStorage.setItem('excel_integration', 'active');
                            } else {
                                this.textContent = 'Подключить';
                                this.classList.remove('btn-outline-danger');
                                this.classList.add('btn-outline-primary');
                                localStorage.setItem('excel_integration', 'disabled');
                            }
                            
                            showNotification(`Интеграция Excel ${status === 'active' ? 'включена' : 'отключена'}`, 'success');
                            
                            // Обновляем статусы интеграций после изменения
                            await loadIntegrationsStatus();
                        } else {
                            throw new Error(data.error || 'Ошибка обновления интеграции');
                        }
                    } catch (error) {
                        console.error('Ошибка:', error);
                        showNotification(error.message, 'error');
                    }
                });
            }
        }

    } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
        showNotification(error.message, 'error');
    }

    // Переключение вкладок
    const navButtons = document.querySelectorAll('.settings-nav .btn');
    const sections = document.querySelectorAll('.settings-section');

    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const target = this.dataset.target;
            
            // Активация кнопки
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            // Показ соответствующей секции
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                }
            });
        });
    });

    // Активируем первую вкладку по умолчанию
    if (navButtons[0]) {
        navButtons[0].click();
    }

    // Обработка переключателя темы
    const themeSwitch = document.querySelector('#interface .form-check-input');
    themeSwitch.addEventListener('change', function() {
        document.body.classList.toggle('dark-theme');
        // Здесь будет сохранение настройки темы
    });
});

// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Загрузка статуса интеграций с сервера
async function loadIntegrationsStatus() {
    try {
        console.log('Загрузка статуса интеграций...');
        
        const response = await fetch('api/index.php?controller=settings&action=getIntegrations');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Ошибка загрузки интеграций');
        }

        console.log('Получены данные интеграций:', data.integrations);
        
        const integrations = data.integrations;
        const buttons = document.querySelectorAll('.integration-item button');
        
        // Обновляем состояние кнопок на основе данных сервера
        integrations.forEach(integration => {
            if (integration.type === '1c') {
                // Обновляем кнопку 1C (первая в списке)
                if (buttons[0]) {
                    if (integration.status === 'active') {
                        buttons[0].textContent = 'Отключить';
                        buttons[0].classList.remove('btn-outline-primary');
                        buttons[0].classList.add('btn-outline-danger');
                    } else {
                        buttons[0].textContent = 'Подключить';
                        buttons[0].classList.remove('btn-outline-danger');
                        buttons[0].classList.add('btn-outline-primary');
                    }
                }
            } else if (integration.type === 'excel') {
                // Обновляем кнопку Excel (вторая в списке)
                if (buttons[1]) {
                    console.log(`Статус Excel интеграции: ${integration.status}`);
                    
                    if (integration.status === 'active') {
                        buttons[1].textContent = 'Отключить';
                        buttons[1].classList.remove('btn-outline-primary');
                        buttons[1].classList.add('btn-outline-danger');
                        localStorage.setItem('excel_integration', 'active');
                    } else {
                        buttons[1].textContent = 'Подключить'; 
                        buttons[1].classList.remove('btn-outline-danger');
                        buttons[1].classList.add('btn-outline-primary');
                        localStorage.setItem('excel_integration', 'disabled');
                    }
                }
            }
        });

    } catch (error) {
        console.error('Ошибка при загрузке статуса интеграций:', error);
        showNotification('Не удалось загрузить статус интеграций', 'error');
    }
} 