<?php
class Api {
    protected $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    protected function response($data, $status = 200) {
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type');
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    protected function error($message, $status = 400) {
        $this->response(['error' => $message], $status);
    }
}
?> 