document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем авторизацию
    const user = await checkAuth();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Загружаем данные компании
    try {
        const response = await fetch('api/index.php?controller=settings&action=getCompanySettings');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Заполняем поля формы
        document.querySelector('input[name="company_name"]').value = data.company.name;
        document.querySelector('input[name="inn"]').value = data.company.inn;
        document.querySelector('input[name="address"]').value = data.company.address || '';
        document.querySelector('input[name="phone"]').value = data.company.phone || '';

        // Инициализация маски для телефона
        const phoneInput = document.querySelector('input[name="phone"]');
        if (phoneInput) {
            IMask(phoneInput, {
                mask: '+{7} (000) 000-00-00'
            });
        }

        // Инициализация маски для адреса
        const addressInput = document.querySelector('input[name="address"]');
        if (addressInput) {
            // Добавляем плейсхолдер и подсказку
            addressInput.placeholder = '146500, г. Москва, ул. Борисовские Пруды, д. 20';
            const helpText = document.createElement('small');
            helpText.className = 'form-text text-muted';
            helpText.textContent = 'Формат: 146500, г. Москва, ул. Борисовские Пруды, д. 20';
            addressInput.parentNode.appendChild(helpText);

            // Форматирование при потере фокуса
            addressInput.addEventListener('blur', function() {
                let value = this.value.trim();
                
                // Если адрес не пустой и не содержит нужные префиксы
                if (value) {
                    // Добавляем префикс города, если его нет
                    if (!value.includes('г.')) {
                        value = value.replace(/^(\d{6}),\s*(.+?),/, '$1, г. $2,');
                    }
                    
                    // Добавляем префикс улицы, если его нет
                    if (!value.includes('ул.')) {
                        value = value.replace(/,\s*([^,]+),\s*д\./, ', ул. $1, д.');
                    }
                    
                    // Добавляем префикс дома, если его нет
                    if (!value.includes('д.')) {
                        value = value.replace(/,\s*(\d+[А-Яа-я]?)$/, ', д. $1');
                    }

                    this.value = value;
                }
            });
        }
    } catch (error) {
        console.error('Ошибка при загрузке настроек:', error);
        alert('Ошибка при загрузке настроек компании');
    }

    // Обработка формы компании
    const companyForm = document.getElementById('companyForm');
    companyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        try {
            const response = await fetch('api/index.php?controller=settings&action=updateCompany', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                alert('Настройки компании сохранены');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка при сохранении настроек:', error);
            alert(error.message || 'Ошибка при сохранении настроек');
        }
    });

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