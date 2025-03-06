document.addEventListener('DOMContentLoaded', function() {
    const forgotForm = document.getElementById('forgotForm');
    const verifyForm = document.getElementById('verifyForm');
    const resetForm = document.getElementById('resetForm');
    const timerElement = document.getElementById('timer');
    const resendLink = document.querySelector('.resend-link');
    const codeInputs = document.querySelectorAll('.code-input');
    
    let timerInterval;

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

    // Отправка email для восстановления
    forgotForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        
        // Здесь будет отправка запроса на сервер
        console.log('Отправка кода на email:', email);
        
        // Показываем форму верификации
        forgotForm.classList.add('d-none');
        verifyForm.classList.remove('d-none');
        verifyForm.classList.add('active');
        
        startTimer();
    });

    // Повторная отправка кода
    resendLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Здесь будет повторная отправка кода
        console.log('Повторная отправка кода');
        
        resendLink.classList.add('d-none');
        document.querySelector('.timer').classList.remove('d-none');
        startTimer();
    });

    // Проверка кода подтверждения
    verifyForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const code = Array.from(codeInputs).map(input => input.value).join('');
        
        // Здесь будет проверка кода
        console.log('Проверка кода:', code);
        
        // Показываем форму сброса пароля
        verifyForm.classList.add('d-none');
        resetForm.classList.remove('d-none');
        resetForm.classList.add('active');
    });

    // Сброс пароля
    resetForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;
        
        if (newPassword !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }
        
        // Здесь будет отправка нового пароля
        console.log('Установка нового пароля');
        
        // Временно: просто показываем сообщение
        alert('Пароль успешно изменен');
        window.location.href = 'login.html';
    });
}); 