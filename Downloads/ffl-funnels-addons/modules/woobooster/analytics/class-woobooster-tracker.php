<?php
/**
 * WooBooster Tracker — Attribution & Conversion Tracking.
 *
 * Tracks which WooBooster recommendations lead to add-to-cart and purchases.
 * Uses JS attribution via wp_localize_script to intercept WooCommerce AJAX events.
 *
 * @package WooBooster
 */

if (!defined('ABSPATH')) {
    exit;
}

class WooBooster_Tracker
{

    /**
     * Accumulated recommendations per page load: [ [rule_id => int, product_ids => int[]], ... ]
     *
     * @var array
     */
    private static $recommendations = array();

    /**
     * Option key for the add-to-cart counter.
     */
    const COUNTER_OPTION = 'woobooster_atc_counter';

    /**
     * Initialize hooks.
     */
    public function init()
    {
        // Frontend: output tracking JS data.
        add_action('wp_footer', array($this, 'output_tracking_data'), 99);

        // Cart: capture attribution from AJAX add-to-cart.
        add_filter('woocommerce_add_cart_item_data', array($this, 'capture_cart_item_data'), 10, 2);

        // Cart: increment add-to-cart counter.
        add_action('woocommerce_add_to_cart', array($this, 'track_add_to_cart'), 10, 6);

        // Order: persist attribution to order line item meta.
        add_action('woocommerce_checkout_create_order_line_item', array($this, 'persist_order_item_meta'), 10, 4);
    }

    /**
     * Register a recommendation set (called from Bricks, Frontend, Shortcode).
     *
     * @param int   $rule_id     The matched rule ID.
     * @param array $product_ids The recommended product IDs.
     */
    public static function register_recommendation($rule_id, $product_ids)
    {
        if (!$rule_id || empty($product_ids)) {
            return;
        }

        self::$recommendations[] = array(
            'rule_id' => absint($rule_id),
            'product_ids' => array_map('absint', $product_ids),
        );
    }

    /**
     * Output tracking data as wp_localize_script in the footer.
     */
    public function output_tracking_data()
    {
        if (empty(self::$recommendations)) {
            return;
        }

        wp_enqueue_script(
            'woobooster-tracking',
            plugin_dir_url(dirname(__FILE__)) . 'assets/js/woobooster-tracking.js',
            array('jquery'),
            FFLA_VERSION,
            true
        );

        wp_localize_script('woobooster-tracking', 'WooBoosterTracking', array(
            'recommendations' => self::$recommendations,
        ));
    }

    /**
     * Capture attribution data from the AJAX add-to-cart request.
     *
     * Hooked on woocommerce_add_cart_item_data.
     *
     * @param array $cart_item_data Existing cart item data.
     * @param int   $product_id    Product being added.
     * @return array
     */
    public function capture_cart_item_data($cart_item_data, $product_id)
    {
        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        if (!empty($_POST['wb_rule_id'])) {
            $cart_item_data['_wb_source_rule'] = absint($_POST['wb_rule_id']);
        }

        return $cart_item_data;
    }

    /**
     * Increment the add-to-cart counter when a WooBooster-attributed item is added.
     *
     * @param string $cart_item_key Cart item key.
     * @param int    $product_id    Product ID.
     * @param int    $quantity      Quantity.
     * @param int    $variation_id  Variation ID.
     * @param array  $variation     Variation data.
     * @param array  $cart_item_data Cart item data.
     */
    public function track_add_to_cart($cart_item_key, $product_id, $quantity, $variation_id, $variation, $cart_item_data)
    {
        if (!empty($cart_item_data['_wb_source_rule'])) {
            global $wpdb;
            $rule_id = absint($cart_item_data['_wb_source_rule']);
            $month_key = gmdate('Y-m');
            $counter_option_name = self::COUNTER_OPTION . '_' . $month_key . '_' . $rule_id;

            // Use atomic increment to prevent race conditions under concurrent traffic.
            // Try to increment an existing counter option, or create it if it doesn't exist.
            $current = (int) get_option($counter_option_name, 0);
            update_option($counter_option_name, $current + 1, false);
        }
    }

    /**
     * Persist the attribution to order line item meta.
     *
     * @param WC_Order_Item_Product $item          Order line item.
     * @param string                $cart_item_key Cart item key.
     * @param array                 $values        Cart item data.
     * @param WC_Order              $order         The order.
     */
    public function persist_order_item_meta($item, $cart_item_key, $values, $order)
    {
        if (!empty($values['_wb_source_rule'])) {
            $item->add_meta_data('_wb_source_rule', absint($values['_wb_source_rule']), true);
        }
    }
}
