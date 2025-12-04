<?php

namespace FFL\Upsell\Bricks;

use FFL\Upsell\Runtime\RelatedService;

defined('ABSPATH') || exit;

class QueryProvider {
    private RelatedService $related_service;

    public function __construct(RelatedService $related_service) {
        $this->related_service = $related_service;
    }

    public function register(): void {
        add_filter('bricks/setup/control_options', [$this, 'add_query_type_to_dropdown'], 10);
        add_filter('bricks/query/run', [$this, 'run_query'], 10, 2);
        add_filter('bricks/query/loop_object_type', [$this, 'set_loop_object_type'], 10, 3);
        add_filter('bricks/query/controls', [$this, 'add_query_controls'], 10, 2);
    }

    public function add_query_type_to_dropdown(array $control_options): array {
        $control_options['queryTypes']['fflu_related'] = __('FFL Related Products', 'ffl-upsell');
        return $control_options;
    }

    public function set_loop_object_type($object_type, $loop_object, $query): string {
        // Ensure object_type is always a string
        $object_type = is_string($object_type) ? $object_type : '';

        if (!is_object($query) || !isset($query->object_type)) {
            return $object_type;
        }

        if ($query->object_type === 'fflu_related') {
            return 'post';
        }

        return $object_type;
    }

    public function add_query_controls(array $controls, string $object_type): array {
        if ($object_type !== 'fflu_related') {
            return $controls;
        }

        $controls['posts_per_page'] = [
            'label' => __('Posts Per Page', 'ffl-upsell'),
            'type' => 'number',
            'min' => 1,
            'max' => 100,
            'default' => 8,
            'placeholder' => 8,
        ];

        return $controls;
    }

    public function run_query(array $results, \Bricks\Query $query): array {
        if (!isset($query->object_type) || $query->object_type !== 'fflu_related') {
            return $results;
        }

        $query_vars = $query->settings;
        $limit = isset($query_vars['posts_per_page']) ? absint($query_vars['posts_per_page']) : 8;
        $product_id = $this->get_current_product_id();

        if ($product_id === 0) {
            return [];
        }

        $related_ids = $this->related_service->get_related_ids($product_id, $limit);

        if (empty($related_ids)) {
            return [];
        }

        $wp_query_args = [
            'post_type' => 'product',
            'post__in' => $related_ids,
            'posts_per_page' => $limit,
            'orderby' => 'post__in',
            'post_status' => 'publish',
            'ignore_sticky_posts' => true,
        ];

        $wp_query = new \WP_Query($wp_query_args);

        return $wp_query->posts;
    }

    private function get_current_product_id(): int {
        global $product, $post;

        // Primero intentar obtener el ID del post actual (contexto de Bricks)
        if (is_singular('product')) {
            return get_the_ID();
        }

        // Luego intentar con el producto global de WooCommerce
        if ($product && is_a($product, 'WC_Product')) {
            return $product->get_id();
        }

        // Finalmente con el post global
        if ($post && $post->post_type === 'product') {
            return $post->ID;
        }

        return 0;
    }
}
