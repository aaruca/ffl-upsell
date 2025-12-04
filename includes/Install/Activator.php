<?php

namespace FFL\Upsell\Install;

defined('ABSPATH') || exit;

class Activator {
    public static function activate(): void {
        self::create_table();
        self::schedule_cron();
        self::set_default_options();

        flush_rewrite_rules();
    }

    private static function create_table(): void {
        global $wpdb;

        $table_name = $wpdb->prefix . 'ffl_related';
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE IF NOT EXISTS {$table_name} (
            product_id BIGINT(20) UNSIGNED NOT NULL,
            related_id BIGINT(20) UNSIGNED NOT NULL,
            score FLOAT NOT NULL DEFAULT 0,
            PRIMARY KEY (product_id, related_id),
            KEY product_score (product_id, score)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta($sql);
    }

    private static function schedule_cron(): void {
        $cron_enabled = get_option('fflu_cron_enabled', 1);

        if ($cron_enabled && !wp_next_scheduled('fflu_daily_rebuild')) {
            wp_schedule_event(time(), 'daily', 'fflu_daily_rebuild');
        }
    }

    private static function set_default_options(): void {
        $defaults = [
            'fflu_limit_per_product' => 20,
            'fflu_weight_cat_tag' => 0.6,
            'fflu_weight_cooccur' => 0.4,
            'fflu_cache_ttl' => 10,
            'fflu_batch_size' => 500,
            'fflu_cron_enabled' => 1,
        ];

        foreach ($defaults as $key => $value) {
            if (get_option($key) === false) {
                add_option($key, $value);
            }
        }
    }
}
