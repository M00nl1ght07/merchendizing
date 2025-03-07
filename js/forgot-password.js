document.addEventListener('DOMContentLoaded', function() {
    const forgotForm = document.getElementById('forgotForm');
    const verifyForm = document.getElementById('verifyForm');
    const resetForm = document.getElementById('resetForm');
    const timerElement = document.getElementById('timer');
    const resendLink = document.querySelector('.resend-link');
    const codeInputs = document.querySelectorAll('.code-input');
    
    let timerInterval;
    let userEmail = ''; // Для хранения email между этапами

    // Функция запуска таймера
    function startTimer() {
        let timeLeft = 60;
        timerElement.textContent = timeLeft;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                document.querySelector('.timer').classList.add('d-none');
                resendLink.classList.remove('d-none');
            }
        }, 1000);
    }

    // Обработка ввода кода подтверждения
    codeInputs.forEach((input, index) => {
        input.addEventListener('input', function() {
            if (this.value.length === 1) {
                if (index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
            }
        });

        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !this.value) {
                if (index > 0) {
                    codeInputs[index - 1].focus();
                }
            }
        });
    });

    // Отправка email для получения кода
    forgotForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        userEmail = email;

        try {
            const response = await fetch('api/index.php?controller=auth&action=forgotPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `email=${encodeURIComponent(email)}`
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Показываем форму ввода кода
            forgotForm.classList.add('d-none');
            verifyForm.classList.remove('d-none');
            startTimer();

        } catch (error) {
            alert(error.message || 'Ошибка при отправке кода');
        }
    });

    // Повторная отправка кода
    resendLink.addEventListener('click', async function(e) {
        e.preventDefault();
        
        try {
            const response = await fetch('api/index.php?controller=auth&action=resendCode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `email=${encodeURIComponent(userEmail)}`
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Скрываем ссылку и показываем таймер
            resendLink.classList.add('d-none');
            document.querySelector('.timer').classList.remove('d-none');
            startTimer();

            alert('Новый код отправлен на email');

        } catch (error) {
            alert(error.message || 'Ошибка при отправке кода');
        }
    });

    // Проверка кода подтверждения
    verifyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const code = Array.from(document.querySelectorAll('.code-input'))
            .map(input => input.value)
            .join('');

        try {
            const response = await fetch('api/index.php?controller=auth&action=verifyResetCode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `email=${encodeURIComponent(userEmail)}&code=${code}`
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Показываем форму сброса пароля
            verifyForm.classList.add('d-none');
            resetForm.classList.remove('d-none');

        } catch (error) {
            alert(error.message || 'Неверный код подтверждения');
        }
    });

    // Добавляем обработку показа/скрытия пароля
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Проверка силы пароля
    const newPasswordInput = document.getElementById('newPassword');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

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

    newPasswordInput.addEventListener('input', function() {
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

    // В обработчике отправки формы resetForm добавим проверку силы пароля
    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const code = Array.from(document.querySelectorAll('.code-input'))
            .map(input => input.value)
            .join('');
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        // Проверка силы пароля
        const passwordStrength = checkPasswordStrength(newPassword);
        if (passwordStrength < 2) {
            alert('Пароль слишком слабый. Используйте более надежный пароль.');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        try {
            const response = await fetch('api/index.php?controller=auth&action=resetPassword', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `email=${encodeURIComponent(userEmail)}&code=${code}&password=${encodeURIComponent(newPassword)}`
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            alert('Пароль успешно изменен');
            window.location.href = 'login.html';

        } catch (error) {
            alert(error.message || 'Ошибка при смене пароля');
        }
    });
}); 