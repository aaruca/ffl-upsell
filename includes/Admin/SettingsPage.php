<?php

namespace FFL\Upsell\Admin;

use FFL\Upsell\Relations\Rebuilder;

defined('ABSPATH') || exit;

class SettingsPage {
    private Rebuilder $rebuilder;

    public function __construct(Rebuilder $rebuilder) {
        $this->rebuilder = $rebuilder;
    }

    public function register_menu(): void {
        add_submenu_page(
            'woocommerce',
            __('FFL Upsell Settings', 'ffl-upsell'),
            __('FFL Upsell', 'ffl-upsell'),
            'manage_woocommerce',
            'ffl-upsell-settings',
            [$this, 'render_page']
        );
    }

    public function register_settings(): void {
        register_setting('fflu_settings', 'fflu_limit_per_product', [
            'type' => 'integer',
            'default' => 20,
            'sanitize_callback' => 'absint',
        ]);

        register_setting('fflu_settings', 'fflu_weight_cat_tag', [
            'type' => 'number',
            'default' => 0.6,
            'sanitize_callback' => 'floatval',
        ]);

        register_setting('fflu_settings', 'fflu_weight_cooccur', [
            'type' => 'number',
            'default' => 0.4,
            'sanitize_callback' => 'floatval',
        ]);

        register_setting('fflu_settings', 'fflu_cache_ttl', [
            'type' => 'integer',
            'default' => 10,
            'sanitize_callback' => 'absint',
        ]);

        register_setting('fflu_settings', 'fflu_batch_size', [
            'type' => 'integer',
            'default' => 500,
            'sanitize_callback' => 'absint',
        ]);

        register_setting('fflu_settings', 'fflu_cron_enabled', [
            'type' => 'boolean',
            'default' => 1,
            'sanitize_callback' => function ($value) {
                $new_value = $value ? 1 : 0;
                $old_value = get_option('fflu_cron_enabled', 1);

                if ($new_value !== $old_value) {
                    if ($new_value) {
                        if (!wp_next_scheduled('fflu_daily_rebuild')) {
                            wp_schedule_event(time(), 'daily', 'fflu_daily_rebuild');
                        }
                    } else {
                        $timestamp = wp_next_scheduled('fflu_daily_rebuild');
                        if ($timestamp) {
                            wp_unschedule_event($timestamp, 'fflu_daily_rebuild');
                        }
                    }
                }

                return $new_value;
            },
        ]);

        register_setting('fflu_settings', 'fflu_delete_table_on_uninstall', [
            'type' => 'boolean',
            'default' => 0,
            'sanitize_callback' => function ($value) {
                return $value ? 1 : 0;
            },
        ]);

        add_settings_section(
            'fflu_main_section',
            __('Relation Builder Settings', 'ffl-upsell'),
            [$this, 'render_section_description'],
            'fflu_settings'
        );

        add_settings_field(
            'fflu_limit_per_product',
            __('Relations per Product', 'ffl-upsell'),
            [$this, 'render_limit_field'],
            'fflu_settings',
            'fflu_main_section'
        );

        add_settings_field(
            'fflu_weight_cat_tag',
            __('Category/Tag Weight', 'ffl-upsell'),
            [$this, 'render_cat_tag_weight_field'],
            'fflu_settings',
            'fflu_main_section'
        );

        add_settings_field(
            'fflu_weight_cooccur',
            __('Co-occurrence Weight', 'ffl-upsell'),
            [$this, 'render_cooccur_weight_field'],
            'fflu_settings',
            'fflu_main_section'
        );

        add_settings_field(
            'fflu_cache_ttl',
            __('Cache TTL (minutes)', 'ffl-upsell'),
            [$this, 'render_cache_ttl_field'],
            'fflu_settings',
            'fflu_main_section'
        );

        add_settings_field(
            'fflu_batch_size',
            __('Batch Size', 'ffl-upsell'),
            [$this, 'render_batch_size_field'],
            'fflu_settings',
            'fflu_main_section'
        );

        add_settings_field(
            'fflu_cron_enabled',
            __('Enable Daily Cron', 'ffl-upsell'),
            [$this, 'render_cron_enabled_field'],
            'fflu_settings',
            'fflu_main_section'
        );

        add_settings_field(
            'fflu_delete_table_on_uninstall',
            __('Delete Data on Uninstall', 'ffl-upsell'),
            [$this, 'render_delete_table_field'],
            'fflu_settings',
            'fflu_main_section'
        );
    }

    public function render_page(): void {
        if (!current_user_can('manage_woocommerce')) {
            return;
        }

        $this->handle_rebuild_action();
        $this->enqueue_rebuild_script();

        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

            <form method="post" action="options.php">
                <?php
                settings_fields('fflu_settings');
                do_settings_sections('fflu_settings');
                submit_button(__('Save Settings', 'ffl-upsell'));
                ?>
            </form>

            <hr>

            <h2><?php esc_html_e('Rebuild Relations', 'ffl-upsell'); ?></h2>
            <p><?php esc_html_e('Rebuild all product relations in background. You can leave this page and the process will continue.', 'ffl-upsell'); ?></p>

            <div id="fflu-rebuild-container">
                <p>
                    <button type="button" id="fflu-rebuild-start" class="button button-primary">
                        <?php esc_html_e('Start Rebuild', 'ffl-upsell'); ?>
                    </button>
                    <button type="button" id="fflu-rebuild-cancel" class="button" style="display:none;">
                        <?php esc_html_e('Cancel Rebuild', 'ffl-upsell'); ?>
                    </button>
                </p>

                <div id="fflu-rebuild-progress" style="display:none;">
                    <div style="background:#fff;border:1px solid #ccd0d4;padding:15px;margin:20px 0;">
                        <p><strong><?php esc_html_e('Status:', 'ffl-upsell'); ?></strong> <span id="fflu-rebuild-status"></span></p>
                        <p><strong><?php esc_html_e('Progress:', 'ffl-upsell'); ?></strong> <span id="fflu-rebuild-percent">0%</span> (<span id="fflu-rebuild-count">0</span> / <span id="fflu-rebuild-total">0</span> <?php esc_html_e('products', 'ffl-upsell'); ?>)</p>
                        <progress id="fflu-rebuild-bar" max="100" value="0" style="width:100%;height:30px;"></progress>
                        <p><strong><?php esc_html_e('Relations created:', 'ffl-upsell'); ?></strong> <span id="fflu-rebuild-relations">0</span></p>
                    </div>
                </div>

                <div id="fflu-rebuild-message" style="display:none;"></div>
            </div>
        </div>
        <?php
    }

    private function enqueue_rebuild_script(): void {
        wp_enqueue_script(
            'fflu-admin-rebuild',
            FFL_UPSELL_PLUGIN_URL . 'dist/js/admin-rebuild.js',
            ['jquery'],
            FFL_UPSELL_VERSION,
            true
        );

        wp_localize_script('fflu-admin-rebuild', 'ffluAdmin', [
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('fflu_rebuild'),
            'i18n' => [
                'confirm_cancel' => esc_html__('Are you sure you want to cancel the rebuild?', 'ffl-upsell'),
                'cancelled' => esc_html__('Cancelled', 'ffl-upsell'),
                'completed' => esc_html__('Completed', 'ffl-upsell'),
                'running' => esc_html__('Running...', 'ffl-upsell'),
                'success' => esc_html__('Rebuild completed successfully!', 'ffl-upsell'),
                'error_start' => esc_html__('Failed to start rebuild. Please try again.', 'ffl-upsell'),
            ]
        ]);
    }

    private function handle_rebuild_action(): void {
        // Deprecated - now handled via AJAX
    }

    public function render_section_description(): void {
        echo '<p>' . esc_html__('Configure how related products are calculated and cached.', 'ffl-upsell') . '</p>';
    }

    public function render_limit_field(): void {
        $value = get_option('fflu_limit_per_product', 20);
        echo '<input type="number" name="fflu_limit_per_product" value="' . esc_attr($value) . '" min="1" max="100" />';
        echo '<p class="description">' . esc_html__('Maximum number of related products to store per product.', 'ffl-upsell') . '</p>';
    }

    public function render_cat_tag_weight_field(): void {
        $value = get_option('fflu_weight_cat_tag', 0.6);
        echo '<input type="number" name="fflu_weight_cat_tag" value="' . esc_attr($value) . '" min="0" max="1" step="0.1" />';
        echo '<p class="description">' . esc_html__('Weight for category/tag similarity (0-1).', 'ffl-upsell') . '</p>';
    }

    public function render_cooccur_weight_field(): void {
        $value = get_option('fflu_weight_cooccur', 0.4);
        echo '<input type="number" name="fflu_weight_cooccur" value="' . esc_attr($value) . '" min="0" max="1" step="0.1" />';
        echo '<p class="description">' . esc_html__('Weight for order co-occurrence (0-1).', 'ffl-upsell') . '</p>';
    }

    public function render_cache_ttl_field(): void {
        $value = get_option('fflu_cache_ttl', 10);
        echo '<input type="number" name="fflu_cache_ttl" value="' . esc_attr($value) . '" min="1" max="1440" />';
        echo '<p class="description">' . esc_html__('How long to cache related product queries (in minutes).', 'ffl-upsell') . '</p>';
    }

    public function render_batch_size_field(): void {
        $value = get_option('fflu_batch_size', 500);
        echo '<input type="number" name="fflu_batch_size" value="' . esc_attr($value) . '" min="50" max="2000" />';
        echo '<p class="description">' . esc_html__('Number of products to process per batch during rebuild.', 'ffl-upsell') . '</p>';
    }

    public function render_cron_enabled_field(): void {
        $value = get_option('fflu_cron_enabled', 1);
        echo '<input type="checkbox" name="fflu_cron_enabled" value="1" ' . checked($value, 1, false) . ' />';
        echo '<label>' . esc_html__('Enable automatic daily rebuild via WP-Cron.', 'ffl-upsell') . '</label>';
    }

    public function render_delete_table_field(): void {
        $value = get_option('fflu_delete_table_on_uninstall', 0);
        echo '<input type="checkbox" name="fflu_delete_table_on_uninstall" value="1" ' . checked($value, 1, false) . ' id="fflu_delete_table" />';
        echo '<label for="fflu_delete_table">' . esc_html__('Delete relations table and all data when uninstalling the plugin.', 'ffl-upsell') . '</label>';
        echo '<p class="description" style="color: #d63638;">';
        echo '<strong>' . esc_html__('Warning:', 'ffl-upsell') . '</strong> ';
        echo esc_html__('Enabling this option will permanently delete all product relations when you uninstall the plugin. This action cannot be undone.', 'ffl-upsell');
        echo '</p>';
    }
}
