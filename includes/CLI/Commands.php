<?php

namespace FFL\Upsell\CLI;

use FFL\Upsell\Relations\Rebuilder;
use FFL\Upsell\Relations\Repository;

defined('ABSPATH') || exit;

class Commands {
    public function rebuild($args, $assoc_args): void {
        $repository = new Repository();
        $rebuilder = new Rebuilder($repository);

        $product_id = isset($assoc_args['product_id']) ? absint($assoc_args['product_id']) : 0;
        $batch_size = isset($assoc_args['batch_size']) ? absint($assoc_args['batch_size']) : (int) get_option('fflu_batch_size', 500);
        $limit_per_product = isset($assoc_args['limit_per_product']) ? absint($assoc_args['limit_per_product']) : (int) get_option('fflu_limit_per_product', 20);

        $truncate = true;
        if (isset($assoc_args['truncate'])) {
            $truncate_val = $assoc_args['truncate'];
            if (is_string($truncate_val)) {
                $truncate = !in_array(strtolower($truncate_val), ['false', '0', 'no'], true);
            } else {
                $truncate = (bool) $truncate_val;
            }
        }

        if ($product_id > 0) {
            $this->rebuild_single($rebuilder, $product_id, $limit_per_product);
        } else {
            $this->rebuild_all($rebuilder, $batch_size, $limit_per_product, $truncate);
        }
    }

    private function rebuild_single(Rebuilder $rebuilder, int $product_id, int $limit_per_product): void {
        \WP_CLI::log("Rebuilding relations for product ID: {$product_id}");

        $product = wc_get_product($product_id);

        if (!$product) {
            \WP_CLI::error("Product ID {$product_id} not found.");
            return;
        }

        $count = $rebuilder->rebuild_single($product_id, $limit_per_product);

        \WP_CLI::success("Rebuilt {$count} relations for product ID {$product_id}.");
    }

    private function rebuild_all(Rebuilder $rebuilder, int $batch_size, int $limit_per_product, bool $truncate): void {
        \WP_CLI::log('Starting full rebuild of related products...');
        \WP_CLI::log("Batch size: {$batch_size}");
        \WP_CLI::log("Limit per product: {$limit_per_product}");
        \WP_CLI::log("Truncate table: " . ($truncate ? 'yes' : 'no'));

        $progress_handler = function ($data) {
            if (isset($data['batch'])) {
                \WP_CLI::log(sprintf(
                    'Batch %d/%d completed. Processed %d/%d products. Added %d relations.',
                    $data['batch'],
                    $data['total_batches'],
                    $data['processed'],
                    $data['total'],
                    $data['relations_added']
                ));
            }
        };

        add_action('fflu_rebuild_batch_completed', $progress_handler);

        $result = $rebuilder->rebuild_all([
            'batch_size' => $batch_size,
            'limit_per_product' => $limit_per_product,
            'truncate' => $truncate,
        ]);

        remove_action('fflu_rebuild_batch_completed', $progress_handler);

        \WP_CLI::success(sprintf(
            'Rebuild completed! Processed %d products, created %d relations.',
            $result['products_processed'],
            $result['total_relations']
        ));
    }
}
