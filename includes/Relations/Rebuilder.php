<?php

namespace FFL\Upsell\Relations;

use FFL\Upsell\Helpers\Logger;

defined('ABSPATH') || exit;

class Rebuilder {
    public Repository $repository;
    private static ?bool $wc_lookup_table_exists = null;

    public function __construct(Repository $repository) {
        $this->repository = $repository;
    }

    private function wc_lookup_table_exists(): bool {
        if (self::$wc_lookup_table_exists !== null) {
            return self::$wc_lookup_table_exists;
        }

        global $wpdb;
        $table = $wpdb->get_var($wpdb->prepare(
            "SHOW TABLES LIKE %s",
            $wpdb->prefix . 'wc_order_product_lookup'
        ));

        self::$wc_lookup_table_exists = ($table === $wpdb->prefix . 'wc_order_product_lookup');
        return self::$wc_lookup_table_exists;
    }

    public function rebuild_all(array $args = []): array {
        $defaults = [
            'batch_size' => (int) get_option('fflu_batch_size', 500),
            'limit_per_product' => (int) get_option('fflu_limit_per_product', 20),
            'truncate' => true,
        ];

        $args = wp_parse_args($args, $defaults);

        do_action('fflu_rebuild_started', $args);

        if ($args['truncate']) {
            $this->repository->truncate();
        }

        $total_products = $this->get_eligible_products_count();
        $processed = 0;
        $total_relations = 0;
        $page = 1;
        $batch_index = 0;

        Logger::log("Starting rebuild for {$total_products} products");

        while (true) {
            $products = $this->get_eligible_products_paged($args['batch_size'], $page);

            if (empty($products)) {
                break;
            }

            $batch_relations = [];

            foreach ($products as $product_id) {
                $related = $this->build_related_for_product($product_id, $args['limit_per_product']);

                foreach ($related as $rel) {
                    $batch_relations[] = [
                        'product_id' => $product_id,
                        'related_id' => $rel['id'],
                        'score' => $rel['score'],
                    ];
                }

                $processed++;
            }

            if (!empty($batch_relations)) {
                $this->repository->bulk_insert($batch_relations);
                $total_relations += count($batch_relations);
            }

            $batch_index++;
            $total_batches = (int) ceil($total_products / $args['batch_size']);

            do_action('fflu_rebuild_batch_completed', [
                'batch' => $batch_index,
                'total_batches' => $total_batches,
                'processed' => $processed,
                'total' => $total_products,
                'relations_added' => count($batch_relations),
            ]);

            Logger::log("Batch {$batch_index}/{$total_batches} completed. Processed {$processed}/{$total_products} products.");

            $page++;
        }

        $result = [
            'products_processed' => $processed,
            'total_relations' => $total_relations,
        ];

        do_action('fflu_rebuild_completed', $result);

        Logger::log("Rebuild completed. {$processed} products, {$total_relations} relations.");

        \FFL\Upsell\Helpers\Cache::flush();

        return $result;
    }

    public function rebuild_single(int $product_id, int $limit_per_product = 20): int {
        $this->repository->delete_for_product($product_id);

        $related = $this->build_related_for_product($product_id, $limit_per_product);

        if (empty($related)) {
            \FFL\Upsell\Helpers\Cache::delete_by_prefix("fflu_rel_{$product_id}_");
            return 0;
        }

        $relations = [];
        foreach ($related as $rel) {
            $relations[] = [
                'product_id' => $product_id,
                'related_id' => $rel['id'],
                'score' => $rel['score'],
            ];
        }

        $this->repository->bulk_insert($relations);

        \FFL\Upsell\Helpers\Cache::delete_by_prefix("fflu_rel_{$product_id}_");

        return count($relations);
    }

    public function build_related_for_product(int $product_id, int $limit): array {
        $candidates = $this->get_candidates($product_id);

        if (empty($candidates)) {
            return [];
        }

        $candidates = apply_filters('fflu_candidates', $candidates, $product_id);

        $scored = [];

        foreach ($candidates as $candidate_id) {
            if ($candidate_id === $product_id) {
                continue;
            }

            $score = $this->calculate_score($product_id, $candidate_id);
            $score = apply_filters('fflu_score_for_pair', $score, $product_id, $candidate_id);

            if ($score > 0) {
                $scored[] = [
                    'id' => $candidate_id,
                    'score' => $score,
                ];
            }
        }

        usort($scored, fn($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($scored, 0, $limit);
    }

    private function get_candidates(int $product_id): array {
        $candidates = [];

        $taxonomy_candidates = $this->get_taxonomy_candidates($product_id);
        $cooccurrence_candidates = $this->get_cooccurrence_candidates($product_id);

        $candidates = array_unique(array_merge($taxonomy_candidates, $cooccurrence_candidates));

        return array_values(array_filter($candidates, fn($id) => $this->is_product_eligible($id)));
    }

    private function get_taxonomy_candidates(int $product_id): array {
        $candidates = [];

        $terms = wp_get_object_terms($product_id, ['product_cat', 'product_tag'], ['fields' => 'ids']);

        if (empty($terms) || is_wp_error($terms)) {
            return [];
        }

        $args = [
            'post_type' => 'product',
            'posts_per_page' => 200,
            'post__not_in' => [$product_id],
            'fields' => 'ids',
            'no_found_rows' => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
            'tax_query' => [
                'relation' => 'OR',
                [
                    'taxonomy' => 'product_cat',
                    'field' => 'term_id',
                    'terms' => $terms,
                ],
                [
                    'taxonomy' => 'product_tag',
                    'field' => 'term_id',
                    'terms' => $terms,
                ],
            ],
        ];

        $query = new \WP_Query($args);
        $candidates = $query->posts;

        wp_reset_postdata();

        return $candidates;
    }

    private function get_cooccurrence_candidates(int $product_id): array {
        if (!$this->wc_lookup_table_exists()) {
            if (is_admin() || (defined('WP_CLI') && WP_CLI)) {
                Logger::log('WooCommerce order product lookup table not found. Co-occurrence disabled.');
            }
            return [];
        }

        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT DISTINCT op2.product_id
            FROM {$wpdb->prefix}wc_order_product_lookup op1
            INNER JOIN {$wpdb->prefix}wc_order_product_lookup op2
                ON op1.order_id = op2.order_id
            WHERE op1.product_id = %d
                AND op2.product_id != %d
            LIMIT 200",
            $product_id,
            $product_id
        );

        $results = $wpdb->get_col($sql);

        if ($results === false || !is_array($results)) {
            return [];
        }

        return array_map('intval', $results);
    }

    private function calculate_score(int $product_id, int $candidate_id): float {
        $weights = apply_filters('fflu_scoring_weights', [
            'cat_tag' => (float) get_option('fflu_weight_cat_tag', 0.6),
            'cooccur' => (float) get_option('fflu_weight_cooccur', 0.4),
        ]);

        $cat_tag_score = $this->calculate_taxonomy_similarity($product_id, $candidate_id);
        $cooccur_score = $this->calculate_cooccurrence_score($product_id, $candidate_id);

        $total = ($cat_tag_score * $weights['cat_tag']) + ($cooccur_score * $weights['cooccur']);

        return max(0, min(1, $total));
    }

    private function calculate_taxonomy_similarity(int $product_id, int $candidate_id): float {
        $terms_a = wp_get_object_terms($product_id, ['product_cat', 'product_tag'], ['fields' => 'ids']);
        $terms_b = wp_get_object_terms($candidate_id, ['product_cat', 'product_tag'], ['fields' => 'ids']);

        if (is_wp_error($terms_a) || is_wp_error($terms_b)) {
            return 0;
        }

        if (empty($terms_a) || empty($terms_b)) {
            return 0;
        }

        $intersection = count(array_intersect($terms_a, $terms_b));
        $union = count(array_unique(array_merge($terms_a, $terms_b)));

        return $union > 0 ? $intersection / $union : 0;
    }

    private function calculate_cooccurrence_score(int $product_id, int $candidate_id): float {
        if (!$this->wc_lookup_table_exists()) {
            return 0;
        }

        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT COUNT(DISTINCT op1.order_id) as cooccur_count
            FROM {$wpdb->prefix}wc_order_product_lookup op1
            INNER JOIN {$wpdb->prefix}wc_order_product_lookup op2
                ON op1.order_id = op2.order_id
            WHERE op1.product_id = %d
                AND op2.product_id = %d",
            $product_id,
            $candidate_id
        );

        $count = (int) $wpdb->get_var($sql);

        return min(1, $count / 10);
    }

    private function get_eligible_products_count(): int {
        global $wpdb;

        $sql = "SELECT COUNT(DISTINCT p.ID)
                FROM {$wpdb->posts} p
                INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
                WHERE p.post_type = 'product'
                AND p.post_status = 'publish'
                AND pm.meta_key = '_stock_status'
                AND pm.meta_value = 'instock'";

        return (int) $wpdb->get_var($sql);
    }

    private function get_eligible_products_paged(int $per_page, int $page): array {
        global $wpdb;

        $offset = ($page - 1) * $per_page;

        $sql = $wpdb->prepare(
            "SELECT DISTINCT p.ID
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = 'product'
            AND p.post_status = 'publish'
            AND pm.meta_key = '_stock_status'
            AND pm.meta_value = 'instock'
            ORDER BY p.ID ASC
            LIMIT %d OFFSET %d",
            $per_page,
            $offset
        );

        $results = $wpdb->get_col($sql);

        return array_map('intval', $results);
    }

    private function is_product_eligible(int $product_id): bool {
        $product = wc_get_product($product_id);

        if (!$product) {
            return false;
        }

        if ($product->get_status() !== 'publish') {
            return false;
        }

        if (!$product->is_in_stock()) {
            return false;
        }

        return true;
    }
}
