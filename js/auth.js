// Проверка авторизации
async function checkAuth() {
    try {
        const response = await fetch('api/index.php?controller=auth&action=checkAuth');
        const data = await response.json();

        if (!data.success) {
            window.location.href = 'login.html';
            return null;
        }

        return data.user;
    } catch (error) {
        console.error('Ошибка при проверке авторизации:', error);
        window.location.href = 'login.html';
        return null;
    }
}

// Выход из системы
async function logout() {
    try {
        await fetch('api/index.php?controller=auth&action=logout');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Ошибка при выходе:', error);
    }
} 