document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    const securityForm = document.getElementById('securityForm');
    const changePhotoBtn = document.querySelector('.change-photo-btn');
    const profileImage = document.querySelector('.profile-image');

    // Обработка изменения фото
    changePhotoBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    profileImage.src = event.target.result;
                    // Здесь будет загрузка файла на сервер
                };
                reader.readAsDataURL(file);
            }
        };
        
        input.click();
    });

    // Обработка формы профиля
    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Здесь будет отправка данных на сервер
        console.log('Сохранение данных профиля...');
        
        // Временно: показываем сообщение
        alert('Изменения сохранены');
    });

    // Обработка формы безопасности
    securityForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const inputs = this.querySelectorAll('input[type="password"]');
        const [currentPassword, newPassword, confirmPassword] = Array.from(inputs).map(input => input.value);

        if (newPassword !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        // Здесь будет отправка данных на сервер
        console.log('Изменение пароля...');
        
        // Временно: показываем сообщение
        alert('Пароль успешно изменен');
        inputs.forEach(input => input.value = '');
    });
}); 