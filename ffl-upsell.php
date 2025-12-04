<?php
/**
 * Plugin Name: FFL Upsell
 * Plugin URI: https://github.com/aaruca/ffl-upsell
 * Description: Fast related products powered by a precomputed relation table, Bricks-ready.
 * Version: 1.0.5
 * Author: Ale Aruca
 * Author URI: https://alearuca.com
 * Text Domain: ffl-upsell
 * Domain Path: /languages
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * WC requires at least: 7.0
 * WC tested up to: 9.0
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

namespace FFL\Upsell;

defined('ABSPATH') || exit;

define('FFL_UPSELL_VERSION', '1.0.5');
define('FFL_UPSELL_PLUGIN_FILE', __FILE__);
define('FFL_UPSELL_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('FFL_UPSELL_PLUGIN_URL', plugin_dir_url(__FILE__));
define('FFL_UPSELL_PLUGIN_BASENAME', plugin_basename(__FILE__));

if (!defined('FFL_UPSELL_OVERRIDE_WC_RELATED')) {
    define('FFL_UPSELL_OVERRIDE_WC_RELATED', false);
}

if (!defined('FFL_UPSELL_DROP_TABLE_ON_UNINSTALL')) {
    define('FFL_UPSELL_DROP_TABLE_ON_UNINSTALL', false);
}

require_once FFL_UPSELL_PLUGIN_DIR . 'vendor/autoload.php';

register_activation_hook(__FILE__, function () {
    Install\Activator::activate();
});

register_deactivation_hook(__FILE__, function () {
    Install\Deactivator::deactivate();
});

function fflu(): Plugin {
    return Plugin::instance();
}

add_action('before_woocommerce_init', function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});

add_action('plugins_loaded', function () {
    load_plugin_textdomain('ffl-upsell', false, dirname(FFL_UPSELL_PLUGIN_BASENAME) . '/languages');

    if (!class_exists('WooCommerce')) {
        add_action('admin_notices', function () {
            echo '<div class="error"><p><strong>' . esc_html__('FFL Upsell', 'ffl-upsell') . '</strong> ' . esc_html__('requires WooCommerce to be installed and active.', 'ffl-upsell') . '</p></div>';
        });
        return;
    }

    fflu()->init();

    // Initialize update checker
    Admin\UpdateChecker::instance();
}, 20);

function fflu_get_related_ids(int $product_id, int $limit = 12): array {
    return fflu()->related_service()->get_related_ids($product_id, $limit);
}

function fflu_get_products(array $ids): array {
    return Helpers\Products::get_by_ids($ids);
}
