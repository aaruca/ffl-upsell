<?php

namespace FFL\Upsell\Runtime;

use FFL\Upsell\Relations\Repository;
use FFL\Upsell\Helpers\Cache;

defined('ABSPATH') || exit;

class RelatedService {
    private Repository $repository;

    public function __construct(Repository $repository) {
        $this->repository = $repository;
    }

    public function get_related_ids(int $product_id, int $limit = 12): array {
        $cache_key = "fflu_rel_{$product_id}_{$limit}";
        $cache_ttl = (int) get_option('fflu_cache_ttl', 10);
        $cache_ttl = apply_filters('fflu_cache_ttl', $cache_ttl, $product_id);

        $cached = Cache::get($cache_key);

        if ($cached !== false) {
            return $cached;
        }

        $ids = $this->repository->get_related_ids($product_id, $limit * 2);

        // Optimize: Filter products in a single query instead of N+1
        $ids = $this->filter_valid_products($ids);

        $ids = array_values($ids);
        $ids = array_slice($ids, 0, $limit);

        if (empty($ids)) {
            $ids = $this->get_fallback_products($product_id, $limit);
        }

        $ids = apply_filters('fflu_related_ids', $ids, $product_id, $limit);

        Cache::set($cache_key, $ids, $cache_ttl * MINUTE_IN_SECONDS);

        return $ids;
    }

    /**
     * Filter products by visibility and stock status using a single query.
     * Avoids N+1 query problem.
     */
    private function filter_valid_products(array $product_ids): array {
        if (empty($product_ids)) {
            return [];
        }

        global $wpdb;

        $ids_placeholder = implode(',', array_map('intval', $product_ids));

        $valid_ids = $wpdb->get_col(
            "SELECT DISTINCT p.ID
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm_stock ON p.ID = pm_stock.post_id AND pm_stock.meta_key = '_stock_status'
            INNER JOIN {$wpdb->postmeta} pm_visibility ON p.ID = pm_visibility.post_id AND pm_visibility.meta_key = '_visibility'
            WHERE p.ID IN ({$ids_placeholder})
            AND p.post_status = 'publish'
            AND p.post_type = 'product'
            AND pm_stock.meta_value = 'instock'
            AND pm_visibility.meta_value IN ('visible', 'catalog', 'search')

            UNION

            SELECT DISTINCT p.ID
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm_stock ON p.ID = pm_stock.post_id AND pm_stock.meta_key = '_stock_status'
            LEFT JOIN {$wpdb->postmeta} pm_visibility ON p.ID = pm_visibility.post_id AND pm_visibility.meta_key = '_visibility'
            WHERE p.ID IN ({$ids_placeholder})
            AND p.post_status = 'publish'
            AND p.post_type = 'product'
            AND pm_stock.meta_value = 'instock'
            AND pm_visibility.meta_id IS NULL"
        );

        // Maintain original order from $product_ids
        $valid_ids_map = array_flip(array_map('intval', $valid_ids));
        return array_filter($product_ids, function($id) use ($valid_ids_map) {
            return isset($valid_ids_map[$id]);
        });
    }

    private function get_fallback_products(int $product_id, int $limit): array {
        $related_ids = wc_get_related_products($product_id, $limit);

        if (empty($related_ids)) {
            return [];
        }

        $related_ids = array_filter($related_ids, function ($id) {
            $product = wc_get_product($id);
            return $product && $product->is_visible() && $product->is_in_stock();
        });

        return array_values(array_slice($related_ids, 0, $limit));
    }

    public function override_wc_related(): void {
        add_filter('woocommerce_related_products', [$this, 'filter_wc_related_products'], 10, 3);
    }

    public function filter_wc_related_products(array $related_posts, int $product_id, array $args): array {
        $limit = $args['limit'] ?? 12;
        $related_ids = $this->get_related_ids($product_id, $limit);

        if (empty($related_ids)) {
            return $related_posts;
        }

        return $related_ids;
    }
}
