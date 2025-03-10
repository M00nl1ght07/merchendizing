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