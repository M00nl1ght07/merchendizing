<?php
function sendMail($to, $subject, $body) {
    // Заголовки письма
    $headers = [
        'MIME-Version: 1.0',
        'Content-type: text/html; charset=utf-8',
        'From: MerchandiseControl <merchandising-service@yandex.ru>',
        'Reply-To: merchandising-service@yandex.ru',
        'X-Mailer: PHP/' . phpversion()
    ];

    // Отправка письма
    try {
        $result = mail(
            $to, 
            '=?UTF-8?B?' . base64_encode($subject) . '?=', // Кодируем тему для поддержки UTF-8
            $body, 
            implode("\r\n", $headers)
        );

        if (!$result) {
            error_log("Mail Error: Failed to send email to {$to}");
            return false;
        }

        return true;
    } catch (Exception $e) {
        error_log("Mail Error: " . $e->getMessage());
        return false;
    }
}
?> 