<?php

namespace FFL\Upsell\Runtime;

use FFL\Upsell\Helpers\Products;

defined('ABSPATH') || exit;

class Shortcode {
    private RelatedService $related_service;

    public function __construct(RelatedService $related_service) {
        $this->related_service = $related_service;
    }

    public function register(): void {
        add_shortcode('fflu_related', [$this, 'render']);
    }

    public function render(array $atts): string {
        $atts = shortcode_atts([
            'limit' => 8,
            'product_id' => 0,
        ], $atts, 'fflu_related');

        $product_id = (int) $atts['product_id'];

        if ($product_id === 0) {
            $product_id = $this->get_current_product_id();
        }

        if ($product_id === 0) {
            return '';
        }

        $limit = absint($atts['limit']);
        $related_ids = $this->related_service->get_related_ids($product_id, $limit);

        if (empty($related_ids)) {
            return '';
        }

        $products = Products::get_by_ids($related_ids);

        if (empty($products)) {
            return '';
        }

        ob_start();

        $template = apply_filters('fflu_shortcode_template_path', FFL_UPSELL_PLUGIN_DIR . 'templates/related-shortcode.php');

        // Validate template path to prevent path traversal
        if (file_exists($template)) {
            $real_template = realpath($template);
            $real_plugin_dir = realpath(FFL_UPSELL_PLUGIN_DIR);

            if ($real_template && $real_plugin_dir && strpos($real_template, $real_plugin_dir) === 0) {
                include $template;
            } else {
                error_log('FFL Upsell: Template path validation failed - potential path traversal attempt');
                $this->render_default_template($products);
            }
        } else {
            $this->render_default_template($products);
        }

        $output = ob_get_clean();

        return apply_filters('fflu_shortcode_template_html', $output, $products, $atts);
    }

    private function get_current_product_id(): int {
        global $product, $post;

        if ($product && is_a($product, 'WC_Product')) {
            return $product->get_id();
        }

        if ($post && $post->post_type === 'product') {
            return $post->ID;
        }

        if (is_singular('product')) {
            return get_the_ID();
        }

        return 0;
    }

    private function render_default_template(array $products): void {
        global $product;
        $original_product = $product;

        echo '<div class="fflu-related-products">';

        foreach ($products as $loop_product) {
            $product = $loop_product;

            echo '<div class="fflu-product-card">';
            echo '<a href="' . esc_url($loop_product->get_permalink()) . '">';

            if ($loop_product->get_image_id()) {
                echo wp_kses_post($loop_product->get_image('woocommerce_thumbnail'));
            }

            echo '<h3 class="fflu-product-title">' . esc_html($loop_product->get_name()) . '</h3>';
            echo '<span class="fflu-product-price">' . wp_kses_post($loop_product->get_price_html()) . '</span>';
            echo '</a>';

            woocommerce_template_loop_add_to_cart(['product' => $loop_product]);

            echo '</div>';
        }

        echo '</div>';

        $product = $original_product;
    }
}
