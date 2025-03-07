document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const phoneInput = document.getElementById('phone');
    const togglePassword = document.querySelector('.toggle-password');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    // Маска для телефона
    const phoneMask = IMask(phoneInput, {
        mask: '+{7} 000 000-00-00',
        lazy: false  // показывать маску сразу
    });

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
        
        // Длина не менее 8 символов
        if (password.length >= 8) strength++;
        
        // Содержит строчные и заглавные буквы
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
        
        // Содержит цифры
        if (password.match(/\d/)) strength++;
        
        // Содержит спецсимволы
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
            strengthText.style.color = '#4CAF50';
        } else if (strength >= 2) {
            strengthBar.classList.add('medium');
            strengthText.textContent = 'Средний пароль';
            strengthText.style.color = '#FFA500';
        } else {
            strengthBar.classList.add('weak');
            strengthText.textContent = 'Слабый пароль';
            strengthText.style.color = '#FF4444';
        }
    });

    // Обработка отправки формы
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Проверка силы пароля
        const passwordStrength = checkPasswordStrength(passwordInput.value);
        if (passwordStrength < 2) {
            alert('Пароль слишком слабый. Используйте более надежный пароль.');
            return;
        }

        // Проверка совпадения паролей
        if (passwordInput.value !== confirmPasswordInput.value) {
            alert('Пароли не совпадают');
            return;
        }

        // Проверка согласия с условиями
        if (!document.getElementById('terms').checked) {
            alert('Необходимо согласиться с условиями использования');
            return;
        }

        // Проверка корректности телефона
        if (!phoneMask.masked.isComplete) {
            alert('Введите корректный номер телефона');
            return;
        }

        // Сбор данных формы
        const formData = {
            company: document.getElementById('company').value.trim(),
            inn: document.getElementById('inn').value.trim(),
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            email: document.getElementById('email').value.trim(),
            phone: phoneMask.unmaskedValue, // Получаем значение без маски
            password: passwordInput.value
        };

        try {
            const response = await fetch('api/index.php?controller=auth&action=register', {
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

            alert('Регистрация успешно завершена!');
            window.location.href = 'login.html';

        } catch (error) {
            alert(error.message || 'Ошибка при регистрации');
        }
    });
}); 