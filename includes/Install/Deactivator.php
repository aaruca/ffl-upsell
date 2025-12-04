<?php

namespace FFL\Upsell\Install;

defined('ABSPATH') || exit;

class Deactivator {
    public static function deactivate(): void {
        self::unschedule_cron();
        flush_rewrite_rules();
    }

    private static function unschedule_cron(): void {
        $timestamp = wp_next_scheduled('fflu_daily_rebuild');
        if ($timestamp) {
            wp_unschedule_event($timestamp, 'fflu_daily_rebuild');
        }
    }
}
