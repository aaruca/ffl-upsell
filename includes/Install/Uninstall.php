<?php

namespace FFL\Upsell\Install;

defined('ABSPATH') || exit;

class Uninstall {
    public static function uninstall(): void {
        // Check if user wants to delete the table via UI option or wp-config constant
        $delete_table = get_option('fflu_delete_table_on_uninstall', 0);
        $delete_via_constant = defined('FFL_UPSELL_DROP_TABLE_ON_UNINSTALL') && FFL_UPSELL_DROP_TABLE_ON_UNINSTALL;

        if ($delete_table || $delete_via_constant) {
            self::drop_table();
        }

        self::delete_options();
        self::clear_cache();
    }

    private static function drop_table(): void {
        global $wpdb;
        $table_name = $wpdb->prefix . 'ffl_related';
        $wpdb->query("DROP TABLE IF EXISTS {$table_name}");
    }

    private static function delete_options(): void {
        $options = [
            'fflu_limit_per_product',
            'fflu_weight_cat_tag',
            'fflu_weight_cooccur',
            'fflu_cache_ttl',
            'fflu_batch_size',
            'fflu_cron_enabled',
            'fflu_delete_table_on_uninstall',
        ];

        foreach ($options as $option) {
            delete_option($option);
        }
    }

    private static function clear_cache(): void {
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_fflu_rel_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_fflu_rel_%'");
    }
}
