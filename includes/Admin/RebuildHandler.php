<?php

namespace FFL\Upsell\Admin;

use FFL\Upsell\Relations\Rebuilder;

defined('ABSPATH') || exit;

class RebuildHandler {
    private Rebuilder $rebuilder;
    private const OPTION_KEY = 'fflu_rebuild_progress';
    private const LOCK_KEY = 'fflu_rebuild_lock';
    private const LOCK_TIMEOUT = 3600;

    public function __construct(Rebuilder $rebuilder) {
        $this->rebuilder = $rebuilder;
    }

    public function register_hooks(): void {
        add_action('wp_ajax_fflu_start_rebuild', [$this, 'ajax_start_rebuild']);
        add_action('wp_ajax_fflu_get_rebuild_progress', [$this, 'ajax_get_progress']);
        add_action('wp_ajax_fflu_cancel_rebuild', [$this, 'ajax_cancel_rebuild']);
        add_action('fflu_background_rebuild_batch', [$this, 'process_batch'], 10, 1);
    }

    public function start_background_rebuild(): void {
        if (!$this->acquire_lock()) {
            return;
        }

        $this->cancel_pending_actions();
        $this->init_rebuild();
    }

    public function ajax_start_rebuild(): void {
        check_ajax_referer('fflu_rebuild', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(['message' => __('Insufficient permissions', 'ffl-upsell')]);
        }

        if (!$this->acquire_lock()) {
            wp_send_json_error(['message' => __('Another rebuild is already running', 'ffl-upsell')]);
        }

        $this->cancel_pending_actions();

        $progress = $this->init_rebuild();

        wp_send_json_success([
            'message' => __('Rebuild started', 'ffl-upsell'),
            'progress' => $progress,
        ]);
    }

    private function init_rebuild(): array {
        $batch_size = (int) get_option('fflu_batch_size', 500);
        $limit_per_product = (int) get_option('fflu_limit_per_product', 20);

        global $wpdb;
        $total_products = (int) $wpdb->get_var(
            "SELECT COUNT(DISTINCT p.ID)
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id
            WHERE p.post_type = 'product'
            AND p.post_status = 'publish'
            AND pm.meta_key = '_stock_status'
            AND pm.meta_value = 'instock'"
        );

        $progress = [
            'status' => 'running',
            'total_products' => $total_products,
            'processed' => 0,
            'current_page' => 1,
            'total_relations' => 0,
            'batch_size' => $batch_size,
            'limit_per_product' => $limit_per_product,
            'started_at' => time(),
            'truncated' => false,
        ];

        update_option(self::OPTION_KEY, $progress, false);

        $this->schedule_next_batch(1);

        return $progress;
    }

    public function process_batch(int $page): void {
        $progress = get_option(self::OPTION_KEY);

        if (!$progress || $progress['status'] !== 'running') {
            $this->release_lock();
            return;
        }

        if ($page === 1 && !$progress['truncated']) {
            $this->rebuilder->repository->truncate();
            $progress['truncated'] = true;
            update_option(self::OPTION_KEY, $progress, false);
        }

        $products = $this->get_products_page($progress['batch_size'], $page);

        if (empty($products)) {
            $this->complete_rebuild();
            return;
        }

        $batch_relations = [];

        foreach ($products as $product_id) {
            $related = $this->rebuilder->build_related_for_product($product_id, $progress['limit_per_product']);

            foreach ($related as $rel) {
                $batch_relations[] = [
                    'product_id' => $product_id,
                    'related_id' => $rel['id'],
                    'score' => $rel['score'],
                ];
            }

            $progress['processed']++;
        }

        if (!empty($batch_relations)) {
            $this->rebuilder->repository->bulk_insert($batch_relations);
            $progress['total_relations'] += count($batch_relations);
        }

        $progress['current_page'] = $page;
        update_option(self::OPTION_KEY, $progress, false);

        $this->schedule_next_batch($page + 1);
    }

    private function schedule_next_batch(int $page): void {
        if (function_exists('as_schedule_single_action')) {
            as_schedule_single_action(time(), 'fflu_background_rebuild_batch', [$page], 'fflu_rebuild');
        } else {
            wp_schedule_single_event(time(), 'fflu_background_rebuild_batch', [$page]);
        }
    }

    private function complete_rebuild(): void {
        $progress = get_option(self::OPTION_KEY);

        if (!$progress) {
            return;
        }

        $progress['status'] = 'completed';
        $progress['completed_at'] = time();
        $progress['duration'] = $progress['completed_at'] - $progress['started_at'];

        update_option(self::OPTION_KEY, $progress, false);

        \FFL\Upsell\Helpers\Cache::flush();

        $this->release_lock();
    }

    public function ajax_get_progress(): void {
        check_ajax_referer('fflu_rebuild', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(['message' => __('Insufficient permissions', 'ffl-upsell')]);
        }

        $progress = get_option(self::OPTION_KEY, [
            'status' => 'idle',
            'total_products' => 0,
            'processed' => 0,
            'total_relations' => 0,
        ]);

        wp_send_json_success(['progress' => $progress]);
    }

    public function ajax_cancel_rebuild(): void {
        check_ajax_referer('fflu_rebuild', 'nonce');

        if (!current_user_can('manage_woocommerce')) {
            wp_send_json_error(['message' => __('Insufficient permissions', 'ffl-upsell')]);
        }

        $progress = get_option(self::OPTION_KEY);

        if ($progress && $progress['status'] === 'running') {
            $progress['status'] = 'cancelled';
            $progress['cancelled_at'] = time();
            update_option(self::OPTION_KEY, $progress, false);
        }

        $this->cancel_pending_actions();
        $this->release_lock();

        wp_send_json_success(['message' => __('Rebuild cancelled', 'ffl-upsell')]);
    }

    private function acquire_lock(): bool {
        $lock_time = get_transient(self::LOCK_KEY);

        if ($lock_time && (time() - $lock_time) < self::LOCK_TIMEOUT) {
            return false;
        }

        set_transient(self::LOCK_KEY, time(), self::LOCK_TIMEOUT);
        return true;
    }

    private function release_lock(): void {
        delete_transient(self::LOCK_KEY);
    }

    private function cancel_pending_actions(): void {
        if (function_exists('as_unschedule_all_actions')) {
            as_unschedule_all_actions('fflu_background_rebuild_batch', [], 'fflu_rebuild');
        } else {
            wp_clear_scheduled_hook('fflu_background_rebuild_batch');
        }
    }

    private function get_products_page(int $per_page, int $page): array {
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
}
