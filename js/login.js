document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.querySelector('.toggle-password');

    // Переключение видимости пароля
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // Обработка входа
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            email: document.getElementById('email').value.trim(),
            password: passwordInput.value
        };

        try {
            const response = await fetch('api/index.php?controller=auth&action=login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: Object.entries(formData)
                    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
                    .join('&')
            });

            if (!response.ok) {
                throw new Error('Ошибка сети');
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Успешный вход
            window.location.href = 'dashboard.html';

        } catch (error) {
            alert(error.message || 'Ошибка при входе');
        }
    });
}); 