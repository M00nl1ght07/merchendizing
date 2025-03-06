document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePassword = document.querySelector('.toggle-password');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    // Переключение видимости пароля
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const icon = this.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });

    // Проверка силы пароля
    function checkPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        if (password.match(/\d/)) strength++;
        if (password.match(/[^a-zA-Z\d]/)) strength++;

        return strength;
    }

    // Обновление индикатора силы пароля
    passwordInput.addEventListener('input', function() {
        const strength = checkPasswordStrength(this.value);
        
        strengthBar.className = 'strength-bar';
        if (strength >= 4) {
            strengthBar.classList.add('strong');
            strengthText.textContent = 'Надежный пароль';
        } else if (strength >= 2) {
            strengthBar.classList.add('medium');
            strengthText.textContent = 'Средний пароль';
        } else {
            strengthBar.classList.add('weak');
            strengthText.textContent = 'Слабый пароль';
        }
    });

    // Валидация формы при отправке
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Проверка совпадения паролей
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert('Пароли не совпадают');
            return;
        }

        // Сбор данных формы
        const formData = {
            company: document.getElementById('company').value,
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            password: passwordInput.value,
            terms: document.getElementById('terms').checked
        };

        // Здесь будет логика регистрации
        console.log('Отправка формы:', formData);
        
        // Временно: просто показываем сообщение
        alert('Функция регистрации будет добавлена позже');
    });
}); 