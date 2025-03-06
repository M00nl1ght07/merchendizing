document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');

    // Переключение видимости пароля
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Изменение иконки
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // Обработка отправки формы
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = passwordInput.value;
        const remember = document.getElementById('remember').checked;

        // Здесь будет логика авторизации
        console.log('Отправка формы:', { email, password, remember });
        
        // Временно: просто показываем сообщение
        alert('Функция авторизации будет добавлена позже');
    });
}); 