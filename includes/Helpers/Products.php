<?php

namespace FFL\Upsell\Helpers;

defined('ABSPATH') || exit;

class Products {
    public static function get_by_ids(array $ids): array {
        if (empty($ids)) {
            return [];
        }

        $args = [
            'include' => $ids,
            'limit' => count($ids),
            'orderby' => 'post__in',
            'return' => 'objects',
            'status' => 'publish',
        ];

        return wc_get_products($args);
    }

    public static function is_valid(int $product_id): bool {
        $product = wc_get_product($product_id);

        if (!$product) {
            return false;
        }

        if ($product->get_status() !== 'publish') {
            return false;
        }

        if (!$product->is_visible()) {
            return false;
        }

        return true;
    }

    public static function get_published_ids(int $limit = -1): array {
        $args = [
            'status' => 'publish',
            'limit' => $limit,
            'return' => 'ids',
        ];

        return wc_get_products($args);
    }
}
