<?php

namespace FFL\Upsell\Helpers;

defined('ABSPATH') || exit;

class Logger {
    public static function log(string $message, string $level = 'info'): void {
        if (defined('WP_CLI') && \WP_CLI) {
            \WP_CLI::log($message);
            return;
        }

        if (function_exists('wc_get_logger')) {
            $logger = wc_get_logger();
            $logger->log($level, $message, ['source' => 'ffl-upsell']);
        } else {
            error_log('[FFL Upsell] ' . $message);
        }
    }

    public static function error(string $message): void {
        self::log($message, 'error');
    }

    public static function debug(string $message): void {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            self::log($message, 'debug');
        }
    }
}
