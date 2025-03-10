// Добавляем функцию показа уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

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
        
        const formData = new FormData(this);
        
        // Отладочный вывод
        console.log('Отправляемые данные:', {
            email: formData.get('email'),
            userType: formData.get('userType')
        });

        try {
            const response = await fetch('api/index.php?controller=auth&action=login', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            console.log('Ответ сервера:', data); // Отладочный вывод

            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                showNotification(data.error, 'error');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            showNotification('Произошла ошибка при входе', 'error');
        }
    });
}); 