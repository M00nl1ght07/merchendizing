document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Получаем данные профиля из БД
        const response = await fetch('api/index.php?controller=profile&action=getProfile');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Заполняем данные профиля в хедере
        const userNameHeader = document.querySelector('.user-name');
        const userAvatarHeader = document.querySelector('.avatar');
        if (userNameHeader) userNameHeader.textContent = data.profile.name;
        if (userAvatarHeader) userAvatarHeader.src = data.profile.avatar_url || 'images/avatar.png';

        // Заполняем основную информацию профиля
        const profileImage = document.querySelector('.profile-image');
        const profileName = document.querySelector('h4'); // Имя под фотографией
        const profileRole = document.querySelector('p.text-muted'); // Роль под именем

        if (profileImage) profileImage.src = data.profile.avatar_url || 'images/avatar.png';
        if (profileName) profileName.textContent = data.profile.name;
        if (profileRole) profileRole.textContent = data.profile.role;

        // Заполняем поля формы
        const nameInput = document.querySelector('input[name="name"]');
        const emailInput = document.querySelector('input[name="email"]');
        const phoneInput = document.querySelector('input[name="phone"]');
        const companyInput = document.querySelector('input[name="company"]');

        if (nameInput) nameInput.value = data.profile.name;
        if (emailInput) emailInput.value = data.profile.email;
        if (phoneInput) phoneInput.value = data.profile.phone || '';
        if (companyInput) companyInput.value = data.profile.company_name;

        // Обновляем статистику
        const reportsCount = document.querySelector('.stat-value:nth-child(1)');
        const merchandisersCount = document.querySelector('.stat-value:nth-child(2)');
        const efficiencyRate = document.querySelector('.stat-value:nth-child(3)');

        if (reportsCount) reportsCount.textContent = data.stats.reports;
        if (merchandisersCount) merchandisersCount.textContent = data.stats.merchandisers;
        if (efficiencyRate) efficiencyRate.textContent = data.stats.efficiency + '%';

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        alert('Ошибка при загрузке данных профиля');
    }

    // Обработчик загрузки фото
    const changePhotoBtn = document.querySelector('.change-photo-btn');
    changePhotoBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('avatar', file);

                try {
                    const response = await fetch('api/index.php?controller=profile&action=updateAvatar', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (data.success) {
                        document.querySelector('.profile-image').src = data.avatar_url;
                        document.querySelector('.avatar').src = data.avatar_url;
                    } else {
                        throw new Error(data.error);
                    }
                } catch (error) {
                    console.error('Ошибка при загрузке аватара:', error);
                    alert('Ошибка при загрузке файла');
                }
            }
        };
        
        input.click();
    });

    // Обработчик формы профиля
    const profileForm = document.getElementById('profileForm');
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        try {
            const response = await fetch('api/index.php?controller=profile&action=updateProfile', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                // Обновляем имя пользователя везде
                const newName = formData.get('name');
                document.querySelector('.user-name').textContent = newName;
                document.querySelector('.avatar').src = formData.get('avatar') || 'images/avatar.png';
                alert('Изменения сохранены');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка при сохранении профиля:', error);
            alert(error.message || 'Ошибка при сохранении данных');
        }
    });

    // Функция проверки сложности пароля (как на регистрации)
    function checkPasswordStrength(password) {
        // Минимум 6 символов
        return password.length >= 6;
    }

    // В обработчике формы безопасности:
    const securityForm = document.getElementById('securityForm');
    securityForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Проверяем совпадение паролей
        if (newPassword !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        // Проверяем длину пароля
        if (!checkPasswordStrength(newPassword)) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }

        try {
            const response = await fetch('api/index.php?controller=profile&action=updatePassword', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                alert('Пароль успешно изменен');
                this.reset();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка при изменении пароля:', error);
            alert(error.message || 'Ошибка при изменении пароля');
        }
    });

    // Инициализация маски для телефона
    if (phoneInput) {
        IMask(phoneInput, {
            mask: '+{7} (000) 000-00-00'
        });
    }
});

async function loadHeader() {
    return new Promise((resolve) => {
        const headerComponent = document.getElementById('header-component');
        if (!headerComponent) {
            resolve();
            return;
        }

        fetch('components/header.html')
            .then(response => response.text())
            .then(html => {
                headerComponent.innerHTML = html;
                resolve();
            });
    });
}

async function loadProfile() {
    try {
        const response = await fetch('api/index.php?controller=profile&action=getProfile');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Заполняем данные профиля
        document.querySelector('.profile-name').textContent = data.profile.name;
        document.querySelector('.profile-role').textContent = data.profile.role;
        document.querySelector('.profile-image').src = data.profile.avatar_url || 'images/avatar.png';

        const profileInfo = document.querySelector('.profile-info');
        profileInfo.innerHTML = `
            <div class="info-item">
                <i class="fa fa-envelope"></i>
                <span>${data.profile.email}</span>
            </div>
            <div class="info-item">
                <i class="fa fa-phone"></i>
                <span>${data.profile.phone || 'Не указан'}</span>
            </div>
            <div class="info-item">
                <i class="fa fa-building"></i>
                <span>${data.profile.company_name}</span>
            </div>
        `;

        // Заполняем форму
        document.querySelector('input[name="name"]').value = data.profile.name;
        document.querySelector('input[name="email"]').value = data.profile.email;
        document.querySelector('input[name="phone"]').value = data.profile.phone || '';
        document.querySelector('input[name="company"]').value = data.profile.company_name;

        // Обновляем статистику
        const statItems = document.querySelectorAll('.stat-value');
        statItems[0].textContent = data.stats.reports;
        statItems[1].textContent = data.stats.merchandisers;
        statItems[2].textContent = data.stats.efficiency + '%';

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        alert('Ошибка при загрузке данных профиля');
    }
}

async function loadProfileData() {
    try {
        const response = await fetch('api/index.php?controller=profile&action=getProfile');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error);
        }

        // Заполняем данные профиля
        document.getElementById('profileName').textContent = data.profile.name;
        document.getElementById('profileRole').textContent = data.profile.role;
        document.getElementById('profileImage').src = data.profile.avatar_url || 'images/avatar.png';
        document.getElementById('userAvatar').src = data.profile.avatar_url || 'images/avatar.png';
        document.getElementById('userName').textContent = data.profile.name;

        // Заполняем информацию о пользователе
        const profileInfo = document.querySelector('.profile-info');
        profileInfo.innerHTML = `
            <div class="info-item">
                <i class="fa fa-envelope"></i>
                <span>${data.profile.email}</span>
            </div>
            <div class="info-item">
                <i class="fa fa-phone"></i>
                <span>${data.profile.phone || 'Не указан'}</span>
            </div>
            <div class="info-item">
                <i class="fa fa-building"></i>
                <span>${data.profile.company_name}</span>
            </div>
        `;

        // Заполняем форму редактирования
        document.querySelector('input[name="name"]').value = data.profile.name;
        document.querySelector('input[name="email"]').value = data.profile.email;
        document.querySelector('input[name="phone"]').value = data.profile.phone || '';
        document.querySelector('input[name="company"]').value = data.profile.company_name;

        // Обновляем статистику
        document.getElementById('reportsCount').textContent = data.stats.reports;
        document.getElementById('merchandisersCount').textContent = data.stats.merchandisers;
        document.getElementById('efficiencyRate').textContent = data.stats.efficiency + '%';

    } catch (error) {
        console.error('Ошибка при загрузке профиля:', error);
        alert('Ошибка при загрузке данных профиля');
    }

    // Обработчик загрузки фото
    const changePhotoBtn = document.querySelector('.change-photo-btn');
    changePhotoBtn.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = async function(e) {
            const file = e.target.files[0];
            if (file) {
                const formData = new FormData();
                formData.append('avatar', file);

                try {
                    const response = await fetch('api/index.php?controller=profile&action=updateAvatar', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (data.success) {
                        document.getElementById('profileImage').src = data.avatar_url;
                        document.getElementById('userAvatar').src = data.avatar_url;
                    } else {
                        throw new Error(data.error);
                    }
                } catch (error) {
                    console.error('Ошибка при загрузке аватара:', error);
                    alert('Ошибка при загрузке файла');
                }
            }
        };
        
        input.click();
    });

    // Обработчик формы профиля
    const profileForm = document.getElementById('profileForm');
    profileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        try {
            const response = await fetch('api/index.php?controller=profile&action=updateProfile', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                // Обновляем имя пользователя везде
                const newName = formData.get('name');
                document.getElementById('profileName').textContent = newName;
                document.getElementById('userName').textContent = newName;
                alert('Изменения сохранены');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка при сохранении профиля:', error);
            alert(error.message || 'Ошибка при сохранении данных');
        }
    });

    // Функция проверки сложности пароля (как на регистрации)
    function checkPasswordStrength(password) {
        // Минимум 6 символов
        return password.length >= 6;
    }

    // В обработчике формы безопасности:
    const securityForm = document.getElementById('securityForm');
    securityForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');

        // Проверяем совпадение паролей
        if (newPassword !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }

        // Проверяем длину пароля
        if (!checkPasswordStrength(newPassword)) {
            alert('Пароль должен содержать минимум 6 символов');
            return;
        }

        try {
            const response = await fetch('api/index.php?controller=profile&action=updatePassword', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                alert('Пароль успешно изменен');
                this.reset();
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Ошибка при изменении пароля:', error);
            alert(error.message || 'Ошибка при изменении пароля');
        }
    });

    // Инициализация маски для телефона
    const phoneInput = document.querySelector('input[name="phone"]');
    if (phoneInput) {
        IMask(phoneInput, {
            mask: '+{7} (000) 000-00-00'
        });
    }
} 