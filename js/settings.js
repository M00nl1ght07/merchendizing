document.addEventListener('DOMContentLoaded', function() {
    const navButtons = document.querySelectorAll('.settings-nav .btn');
    const sections = document.querySelectorAll('.settings-section');
    const forms = document.querySelectorAll('form');

    // Переключение вкладок
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

    // Обработка форм
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Сохранение настроек формы:', this.id);
            alert('Настройки сохранены');
        });
    });

    // Обработка переключателя темы
    const themeSwitch = document.querySelector('#interface .form-check-input');
    themeSwitch.addEventListener('change', function() {
        document.body.classList.toggle('dark-theme');
        // Здесь будет сохранение настройки темы
    });
}); 