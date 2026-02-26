<?php
/**
 * WooBooster Coupon — Auto-apply/remove WooCommerce coupons.
 *
 * When rules with 'apply_coupon' actions are matched, this class handles
 * automatically applying and removing the corresponding WooCommerce coupons
 * based on current cart contents.
 *
 * @package WooBooster
 */

if (!defined('ABSPATH')) {
    exit;
}

class WooBooster_Coupon
{
    /**
     * Session key for tracking auto-applied coupons.
     */
    const SESSION_KEY = 'woobooster_auto_coupons';

    /**
     * Register WooCommerce hooks.
     */
    public function init()
    {
        // Auto-apply/remove coupons when cart is updated.
        add_action('woocommerce_before_calculate_totals', array($this, 'maybe_apply_coupons'), 20);

        // Show notice when coupon is auto-applied (fires synchronously on the
        // request where apply_coupon() is called).
        add_action('woocommerce_applied_coupon', array($this, 'show_coupon_notice'));

        // Re-display auto-coupon notice on the cart page on subsequent requests.
        add_action('woocommerce_before_cart', array($this, 'maybe_show_cart_notices'));

        // Clean up session on cart empty.
        add_action('woocommerce_cart_emptied', array($this, 'clear_session'));

        // Force auto-applied coupons valid to prevent checkout errors.
        add_filter('woocommerce_coupon_is_valid', array($this, 'force_auto_coupons_valid'), 10, 3);

        // Suppress WC error notices for auto-applied coupons managed by WooBooster.
        add_filter('woocommerce_coupon_error', array($this, 'suppress_auto_coupon_error'), 10, 3);

        // Show a pre-cart promotional message on the single product page.
        add_action('woocommerce_single_product_summary', array($this, 'maybe_show_product_page_notice'), 25);
    }

    /**
     * Evaluate cart contents against rules and auto-apply/remove coupons.
     *
     * Hooked to woocommerce_before_calculate_totals (priority 20).
     *
     * @param WC_Cart $cart The WC cart object.
     */
    public function maybe_apply_coupons($cart)
    {
        if (is_admin() && !defined('DOING_AJAX')) {
            return;
        }

        // Prevent infinite recursion.
        static $running = false;
        if ($running) {
            return;
        }
        $running = true;

        $session = WC()->session;
        if (!$session) {
            $running = false;
            return;
        }

        // Get currently tracked auto-applied coupons.
        $auto_coupons = $session->get(self::SESSION_KEY, array());

        // Find all coupon IDs that should be applied based on current cart.
        // Returns coupon_id => message pairs.
        $should_apply = $this->get_matching_coupon_ids($cart);

        // Apply new coupons.
        foreach ($should_apply as $coupon_id => $message) {
            $coupon = new WC_Coupon($coupon_id);
            $code = $coupon->get_code();

            if (!$this->is_coupon_valid($coupon)) {
                continue;
            }

            if (!$cart->has_discount($code)) {
                // Write session FIRST so show_coupon_notice() can read it when
                // woocommerce_applied_coupon fires synchronously inside apply_coupon().
                $auto_coupons[$coupon_id] = array('code' => $code, 'message' => $message);
                $session->set(self::SESSION_KEY, $auto_coupons);
                $cart->apply_coupon($code);
            } elseif (!isset($auto_coupons[$coupon_id])) {
                // Coupon already in cart (persistent cart) but session expired.
                // Re-register so force_auto_coupons_valid() can protect it at checkout.
                $auto_coupons[$coupon_id] = array('code' => $code, 'message' => $message);
            }
        }

        // Remove coupons that no longer match.
        foreach ($auto_coupons as $coupon_id => $data) {
            $code = is_array($data) ? $data['code'] : $data;
            if (!isset($should_apply[$coupon_id])) {
                $cart->remove_coupon($code);
                unset($auto_coupons[$coupon_id]);
            }
        }

        $session->set(self::SESSION_KEY, $auto_coupons);

        $running = false;
    }

    /**
     * Get all coupon IDs that should be applied based on current cart contents.
     *
     * Scans each cart item, builds condition keys, and matches against rules
     * that have 'apply_coupon' actions.
     *
     * @param WC_Cart $cart The WC cart object.
     * @return array Associative array of coupon_id => custom_message.
     */
    private function get_matching_coupon_ids($cart)
    {
        $coupon_ids = array();

        if (!$cart || $cart->is_empty()) {
            return $coupon_ids;
        }

        // Get all active rules with 'apply_coupon' actions.
        $rules = $this->get_coupon_rules();

        if (empty($rules)) {
            return $coupon_ids;
        }

        // Build a list of all condition keys from items in the cart.
        $cart_keys = array();
        foreach ($cart->get_cart() as $cart_item) {
            $product_id = $cart_item['product_id'];
            $product = wc_get_product($product_id);
            if (!$product) {
                continue;
            }

            // Get product terms from request-scoped cache to avoid N+1 queries.
            $terms = $this->get_cached_product_terms($product_id);

            foreach ($terms as $term) {
                $cart_keys[] = sanitize_key($term->taxonomy) . ':' . sanitize_text_field($term->slug);
            }

            // Add specific product key.
            $cart_keys[] = 'specific_product:' . $product_id;
        }

        $cart_keys = array_unique($cart_keys);

        // Match against rules using UTC timestamps for consistent scheduling.
        $now = current_time('mysql', true);
        foreach ($rules as $rule) {
            // Check scheduling dates — skip if rule is outside its active window.
            if (!empty($rule->start_date) && $now < $rule->start_date) {
                continue;
            }
            if (!empty($rule->end_date) && $now > $rule->end_date) {
                continue;
            }

            if ($this->rule_matches_cart($rule, $cart_keys, $cart)) {
                // Get 'apply_coupon' actions from this rule.
                $action_groups = WooBooster_Rule::get_actions($rule->id);
                foreach ($action_groups as $group_id => $group_actions) {
                    foreach ($group_actions as $action) {
                        if ('apply_coupon' === $action->action_source && !empty($action->action_coupon_id)) {
                            $msg = isset($action->action_coupon_message) ? $action->action_coupon_message : '';
                            $coupon_ids[absint($action->action_coupon_id)] = $msg;
                        }
                    }
                }
            }
        }

        return $coupon_ids;
    }

    /**
     * Get all active rules that have at least one 'apply_coupon' action.
     *
     * @return array Array of rule objects.
     */
    private function get_coupon_rules()
    {
        global $wpdb;

        $rules_table = $wpdb->prefix . 'woobooster_rules';
        $actions_table = $wpdb->prefix . 'woobooster_rule_actions';

        // phpcs:ignore WordPress.DB.DirectDatabaseQuery
        return $wpdb->get_results(
            "SELECT DISTINCT r.* FROM {$rules_table} r
             INNER JOIN {$actions_table} a ON r.id = a.rule_id
             WHERE r.status = 1 AND a.action_source = 'apply_coupon'
             ORDER BY r.priority ASC"
        );
    }

    /**
     * Get product terms with request-scoped caching to avoid N+1 queries.
     *
     * @param int $product_id Product ID.
     * @return array Array of term objects.
     */
    private function get_cached_product_terms($product_id)
    {
        static $term_cache = array();

        if (!isset($term_cache[$product_id])) {
            $terms = wp_get_post_terms($product_id, get_object_taxonomies('product'), array('fields' => 'all'));
            $term_cache[$product_id] = is_wp_error($terms) ? array() : $terms;
        }

        return $term_cache[$product_id];
    }

    /**
     * Check if a rule's conditions match items currently in the cart.
     *
     * @param object $rule      The rule object.
     * @param array  $cart_keys Condition keys from cart items.
     * @param WC_Cart $cart     The WC cart object.
     * @return bool True if rule conditions are satisfied.
     */
    private function rule_matches_cart($rule, $cart_keys, $cart)
    {
        $conditions = WooBooster_Rule::get_conditions($rule->id);

        if (empty($conditions)) {
            return false;
        }

        // Build per-item data for quantity counting and exclusion checks.
        $cart_items = array();
        foreach ($cart->get_cart() as $cart_item) {
            $product_id = $cart_item['product_id'];
            $product = wc_get_product($product_id);
            if (!$product) {
                continue;
            }

            // Get product terms from request-scoped cache to avoid N+1 queries.
            $terms = $this->get_cached_product_terms($product_id);

            $item_keys = array();
            $item_cat_ids = array();
            foreach ($terms as $term) {
                $item_keys[] = sanitize_key($term->taxonomy) . ':' . sanitize_text_field($term->slug);
                if ('product_cat' === $term->taxonomy) {
                    $item_cat_ids[] = $term->term_id;
                }
            }
            $item_keys[] = 'specific_product:' . $product_id;

            $cart_items[] = array(
                'product_id' => $product_id,
                'quantity' => $cart_item['quantity'],
                'price' => (float) $product->get_price(),
                'keys' => $item_keys,
                'cat_ids' => $item_cat_ids,
            );
        }

        // OR between groups — at least one group must fully match.
        foreach ($conditions as $group_conditions) {
            $group_match = true;

            foreach ($group_conditions as $cond) {
                $attr = $cond->condition_attribute;
                $value = $cond->condition_value;
                $operator = isset($cond->condition_operator) ? $cond->condition_operator : 'equals';
                $min_qty = isset($cond->min_quantity) ? max(1, (int) $cond->min_quantity) : 1;

                // Build exclusion filters from condition.
                $ex_product_ids = array();
                if (!empty($cond->exclude_products)) {
                    $ex_product_ids = array_filter(array_map('absint', explode(',', $cond->exclude_products)));
                }
                $ex_cat_ids = array();
                if (!empty($cond->exclude_categories)) {
                    $slugs = array_filter(explode(',', $cond->exclude_categories));
                    foreach ($slugs as $slug) {
                        $term = get_term_by('slug', $slug, 'product_cat');
                        if ($term && !is_wp_error($term)) {
                            $ex_cat_ids[] = $term->term_id;
                        }
                    }
                }
                $ex_price_min = isset($cond->exclude_price_min) && '' !== $cond->exclude_price_min && null !== $cond->exclude_price_min
                    ? (float) $cond->exclude_price_min : null;
                $ex_price_max = isset($cond->exclude_price_max) && '' !== $cond->exclude_price_max && null !== $cond->exclude_price_max
                    ? (float) $cond->exclude_price_max : null;

                // Count qualifying quantity across all non-excluded cart items.
                $qualifying_qty = 0;

                foreach ($cart_items as $item) {
                    // Check exclusions — skip excluded items.
                    if (in_array($item['product_id'], $ex_product_ids, true)) {
                        continue;
                    }
                    if (!empty($ex_cat_ids) && array_intersect($item['cat_ids'], $ex_cat_ids)) {
                        continue;
                    }
                    if (null !== $ex_price_min && $item['price'] < $ex_price_min) {
                        continue;
                    }
                    if (null !== $ex_price_max && $item['price'] > $ex_price_max) {
                        continue;
                    }

                    // Check if this item matches the condition.
                    $item_matches = false;

                    if ('specific_product' === $attr) {
                        $product_ids = array_filter(array_map('absint', explode(',', $value)));
                        foreach ($product_ids as $pid) {
                            if (in_array('specific_product:' . $pid, $item['keys'], true)) {
                                $item_matches = true;
                                break;
                            }
                        }
                    } else {
                        $key = sanitize_key($attr) . ':' . sanitize_text_field($value);
                        if (in_array($key, $item['keys'], true)) {
                            $item_matches = true;
                        }

                        // Check include_children.
                        if (!$item_matches && !empty($cond->include_children)) {
                            foreach ($item['keys'] as $ik) {
                                $parts = explode(':', $ik, 2);
                                if ($parts[0] === $attr) {
                                    $child_term = get_term_by('slug', $parts[1], $attr);
                                    $parent_term = get_term_by('slug', $value, $attr);
                                    if ($child_term && $parent_term && !is_wp_error($child_term) && !is_wp_error($parent_term)) {
                                        if (term_is_ancestor_of($parent_term->term_id, $child_term->term_id, $attr)) {
                                            $item_matches = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if ('not_equals' === $operator) {
                        $item_matches = !$item_matches;
                    }

                    if ($item_matches) {
                        $qualifying_qty += $item['quantity'];
                    }
                }

                if ($qualifying_qty < $min_qty) {
                    $group_match = false;
                    break;
                }
            }

            if ($group_match) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if a coupon is valid for auto-application.
     *
     * Guards against expired, depleted, or disabled coupons.
     *
     * @param WC_Coupon $coupon The coupon object.
     * @return bool True if the coupon can be applied.
     */
    private function is_coupon_valid($coupon)
    {
        if (!$coupon || !$coupon->get_id()) {
            return false;
        }

        // Check if coupon exists and is published.
        $status = get_post_status($coupon->get_id());
        if ('publish' !== $status) {
            return false;
        }

        // Check expiry date.
        $expiry = $coupon->get_date_expires();
        if ($expiry && $expiry->getTimestamp() < time()) {
            return false;
        }

        // Check usage limits.
        $usage_limit = $coupon->get_usage_limit();
        if ($usage_limit > 0 && $coupon->get_usage_count() >= $usage_limit) {
            return false;
        }

        return true;
    }

    /**
     * Show a notice when WooBooster auto-applies a coupon.
     *
     * @param string $coupon_code The coupon code that was applied.
     */
    public function show_coupon_notice($coupon_code)
    {
        $session = WC()->session;
        if (!$session) {
            return;
        }

        $auto_coupons = $session->get(self::SESSION_KEY, array());
        $is_auto = false;
        $custom_message = '';

        // Check if this coupon was auto-applied by WooBooster.
        foreach ($auto_coupons as $id => $data) {
            $code = is_array($data) ? $data['code'] : $data;
            if (strtolower($code) === strtolower($coupon_code)) {
                $is_auto = true;
                $custom_message = is_array($data) && !empty($data['message']) ? $data['message'] : '';
                break;
            }
        }

        if ($is_auto) {
            // Remove WooCommerce's default "Coupon code applied successfully" notice.
            wc_clear_notices();

            if (!empty($custom_message)) {
                wc_add_notice(wp_kses_post($custom_message), 'success');
            } else {
                wc_add_notice(
                    sprintf(
                        /* translators: %s: coupon code */
                        __('Coupon "%s" has been automatically applied based on your cart!', 'woobooster'),
                        esc_html(strtoupper($coupon_code))
                    ),
                    'success'
                );
            }
        }
    }

    /**
     * Re-display auto-coupon notices on the cart page.
     *
     * woocommerce_applied_coupon only fires on the request when apply_coupon()
     * is called. This method runs on woocommerce_before_cart to show the notice
     * on subsequent page loads as long as the coupon is still in the cart.
     *
     * Skips coupons that already have a success notice queued (avoids duplicates
     * on the very first request when show_coupon_notice() already ran).
     */
    public function maybe_show_cart_notices()
    {
        $session = WC()->session;
        if (!$session) {
            return;
        }

        $cart = WC()->cart;
        if (!$cart) {
            return;
        }

        $auto_coupons = $session->get(self::SESSION_KEY, array());
        if (empty($auto_coupons)) {
            return;
        }

        // Collect codes that already have a queued success notice so we don't
        // duplicate the message on the request when apply_coupon() just fired.
        $already_noticed = array();
        $existing_notices = wc_get_notices('success');
        foreach ($existing_notices as $notice) {
            $text = is_array($notice) ? ($notice['notice'] ?? '') : $notice;
            $already_noticed[] = strtolower(wp_strip_all_tags($text));
        }

        foreach ($auto_coupons as $coupon_id => $data) {
            $code    = is_array($data) ? $data['code'] : $data;
            $message = is_array($data) && !empty($data['message']) ? $data['message'] : '';

            // Only show if the coupon is still applied in the cart.
            if (!$cart->has_discount($code)) {
                continue;
            }

            // Build the notice text we would display.
            if (!empty($message)) {
                $notice_text = wp_kses_post($message);
            } else {
                $notice_text = sprintf(
                    /* translators: %s: coupon code */
                    __('Coupon "%s" has been automatically applied based on your cart!', 'woobooster'),
                    esc_html(strtoupper($code))
                );
            }

            // Skip if an identical notice is already queued.
            $notice_plain = strtolower(wp_strip_all_tags($notice_text));
            if (in_array($notice_plain, $already_noticed, true)) {
                continue;
            }

            wc_add_notice($notice_text, 'success');
        }
    }

    /**
     * Clear auto-coupon tracking when cart is emptied.
     */
    public function clear_session()
    {
        $session = WC()->session;
        if ($session) {
            $session->set(self::SESSION_KEY, array());
        }
    }

    /**
     * Force auto-applied coupons to be considered valid even if their product/category
     * requirements are not met by the current cart contents.
     * This prevents WooCommerce from throwing checkout errors and removing the coupon
     * before the user has a chance to add the required products.
     *
     * @param bool       $valid  Whether the coupon is valid.
     * @param WC_Coupon  $coupon The coupon object.
     * @param WC_Discounts $discount Optional discount object.
     * @return bool
     */
    public function force_auto_coupons_valid($valid, $coupon, $discount = null)
    {
        // If it's already valid, no need to do anything.
        if ($valid) {
            return $valid;
        }

        $session = WC()->session;
        if (!$session) {
            return $valid;
        }

        $auto_coupons = $session->get(self::SESSION_KEY, array());
        if (empty($auto_coupons)) {
            return $valid;
        }

        $coupon_id = $coupon->get_id();

        // If this coupon was auto-applied by WooBooster
        if (isset($auto_coupons[$coupon_id])) {
            // Check basic constraints so we don't force expired/exhausted coupons.
            // If it passes basic constraints, we assume the invalidity is due to missing
            // required products (which is the UX feature we are supporting).
            if ($this->passes_basic_coupon_checks($coupon)) {
                return true;
            }
        }

        return $valid;
    }

    /**
     * Perform basic non-cart-related validation checks on a coupon.
     *
     * @param WC_Coupon $coupon The coupon object.
     * @return bool True if basic checks pass.
     */
    private function passes_basic_coupon_checks($coupon)
    {
        if (!$coupon || !$coupon->get_id()) {
            return false;
        }

        if ('publish' !== get_post_status($coupon->get_id())) {
            return false;
        }

        // Check expiry date.
        $expiry = $coupon->get_date_expires();
        if ($expiry && $expiry->getTimestamp() < time()) {
            return false;
        }

        // Check overall usage limit.
        $usage_limit = $coupon->get_usage_limit();
        if ($usage_limit > 0 && $coupon->get_usage_count() >= $usage_limit) {
            return false;
        }

        return true;
    }

    /**
     * Suppress WooCommerce coupon error notices for auto-applied coupons.
     *
     * When WC validates coupons at checkout and finds a product restriction not
     * met, it fires woocommerce_coupon_error before woocommerce_coupon_is_valid.
     * This filter intercepts those notices and returns an empty string for any
     * coupon that WooBooster is actively managing (so the customer never sees a
     * confusing "Coupon not applicable" error on a coupon they never manually
     * entered).
     *
     * @param string    $error   The error message WC is about to display.
     * @param int       $err_code WC error code constant.
     * @param WC_Coupon $coupon  The coupon object.
     * @return string Empty string to suppress, or original error string.
     */
    public function suppress_auto_coupon_error($error, $err_code, $coupon)
    {
        $session = WC()->session;
        if (!$session) {
            return $error;
        }

        $auto_coupons = $session->get(self::SESSION_KEY, array());
        if (empty($auto_coupons)) {
            return $error;
        }

        $coupon_id = $coupon->get_id();

        if (isset($auto_coupons[$coupon_id])) {
            // Returning an empty string tells WC not to add the notice.
            return '';
        }

        return $error;
    }

    /**
     * Display a promotional coupon notice on the single product page.
     *
     * Runs at woocommerce_single_product_summary priority 25 (after the product
     * title at 5 and price at 10, before the excerpt at 20... well, after it,
     * which places the notice just above or alongside the add-to-cart form).
     *
     * Only shows when there is at least one active rule whose conditions match
     * the current product AND whose action is 'apply_coupon' with a custom
     * message set.
     */
    public function maybe_show_product_page_notice()
    {
        global $post;

        if (!$post || !is_singular('product')) {
            return;
        }

        $product_id = absint($post->ID);
        if (!$product_id) {
            return;
        }

        $messages = $this->get_product_coupon_messages($product_id);
        if (empty($messages)) {
            return;
        }

        foreach ($messages as $message) {
            // Output an inline styled div. We deliberately avoid wc_add_notice()
            // here because that queues a notice for the global notice area which
            // appears at the top of the page — we want it inline with the product
            // summary. A simple, unstyled div keeps the output theme-agnostic.
            echo '<div class="woobooster-product-coupon-notice" style="'
                . 'background:#f0fff4;border:1px solid #68d391;border-radius:4px;'
                . 'padding:10px 14px;margin:10px 0;font-size:.95em;color:#276749;">'
                . wp_kses_post($message)
                . '</div>';
        }
    }

    /**
     * Get coupon promotional messages for a specific product.
     *
     * Loads all active rules that have 'apply_coupon' actions with a custom
     * message, then checks whether any condition group in the rule matches
     * the given product (by specific_product ID, category slug, attribute
     * term slug, etc.).
     *
     * @param int $product_id The product ID to check.
     * @return array Array of message strings (may be empty).
     */
    private function get_product_coupon_messages($product_id)
    {
        $messages = array();

        $rules = $this->get_coupon_rules();
        if (empty($rules)) {
            return $messages;
        }

        // Build condition keys for this product once (same logic as get_matching_coupon_ids).
        $product_keys = array();
        $terms = wp_get_post_terms($product_id, get_object_taxonomies('product'), array('fields' => 'all'));
        if (!is_wp_error($terms)) {
            foreach ($terms as $term) {
                $product_keys[] = sanitize_key($term->taxonomy) . ':' . sanitize_text_field($term->slug);
            }
        }
        $product_keys[] = 'specific_product:' . $product_id;

        $now = current_time('mysql');

        foreach ($rules as $rule) {
            // Respect scheduling.
            if (!empty($rule->start_date) && $now < $rule->start_date) {
                continue;
            }
            if (!empty($rule->end_date) && $now > $rule->end_date) {
                continue;
            }

            // Check if ANY condition group in this rule matches the product.
            $conditions = WooBooster_Rule::get_conditions($rule->id);
            if (empty($conditions)) {
                continue;
            }

            $rule_matches = false;
            foreach ($conditions as $group_conditions) {
                $group_match = true;
                foreach ($group_conditions as $cond) {
                    $attr     = $cond->condition_attribute;
                    $value    = $cond->condition_value;
                    $operator = isset($cond->condition_operator) ? $cond->condition_operator : 'equals';

                    $item_matches = false;
                    if ('specific_product' === $attr) {
                        $ids = array_filter(array_map('absint', explode(',', $value)));
                        $item_matches = in_array($product_id, $ids, true);
                    } else {
                        $key = sanitize_key($attr) . ':' . sanitize_text_field($value);
                        $item_matches = in_array($key, $product_keys, true);

                        if (!$item_matches && !empty($cond->include_children)) {
                            foreach ($product_keys as $pk) {
                                $parts = explode(':', $pk, 2);
                                if ($parts[0] === $attr) {
                                    $child_term  = get_term_by('slug', $parts[1], $attr);
                                    $parent_term = get_term_by('slug', $value, $attr);
                                    if ($child_term && $parent_term && !is_wp_error($child_term) && !is_wp_error($parent_term)) {
                                        if (term_is_ancestor_of($parent_term->term_id, $child_term->term_id, $attr)) {
                                            $item_matches = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    if ('not_equals' === $operator) {
                        $item_matches = !$item_matches;
                    }

                    if (!$item_matches) {
                        $group_match = false;
                        break;
                    }
                }

                if ($group_match) {
                    $rule_matches = true;
                    break;
                }
            }

            if (!$rule_matches) {
                continue;
            }

            // Rule matches — collect messages from 'apply_coupon' actions.
            $action_groups = WooBooster_Rule::get_actions($rule->id);
            foreach ($action_groups as $group_actions) {
                foreach ($group_actions as $action) {
                    if ('apply_coupon' === $action->action_source
                        && !empty($action->action_coupon_message)
                    ) {
                        $msg = trim($action->action_coupon_message);
                        if ($msg !== '' && !in_array($msg, $messages, true)) {
                            $messages[] = $msg;
                        }
                    }
                }
            }
        }

        return $messages;
    }
}
