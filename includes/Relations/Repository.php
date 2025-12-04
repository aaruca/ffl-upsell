<?php

namespace FFL\Upsell\Relations;

defined('ABSPATH') || exit;

class Repository {
    private string $table_name;

    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'ffl_related';
    }

    public function get_related_ids(int $product_id, int $limit = 12, int $offset = 0): array {
        global $wpdb;

        if (!$this->table_exists()) {
            if (is_admin() || (defined('WP_CLI') && WP_CLI)) {
                error_log('FFL Upsell: ffl_related table does not exist. Run activation/rebuild.');
            }
            return [];
        }

        $query_args = apply_filters('fflu_query_args', [
            'product_id' => $product_id,
            'limit' => $limit,
            'offset' => $offset,
        ]);

        $sql = $wpdb->prepare(
            "SELECT related_id FROM {$this->table_name}
            WHERE product_id = %d
            ORDER BY score DESC
            LIMIT %d OFFSET %d",
            $query_args['product_id'],
            $query_args['limit'],
            $query_args['offset']
        );

        $results = $wpdb->get_col($sql);

        if ($results === false || !is_array($results)) {
            return [];
        }

        return array_map('intval', $results);
    }

    public function get_related_with_scores(int $product_id, int $limit = 100): array {
        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT related_id, score FROM {$this->table_name}
            WHERE product_id = %d
            ORDER BY score DESC
            LIMIT %d",
            $product_id,
            $limit
        );

        return $wpdb->get_results($sql, ARRAY_A);
    }

    public function truncate(): void {
        global $wpdb;
        $result = $wpdb->query("TRUNCATE TABLE {$this->table_name}");

        if ($result === false) {
            error_log('FFL Upsell: Failed to truncate table - ' . $wpdb->last_error);
        }
    }

    public function delete_for_product(int $product_id): void {
        global $wpdb;
        $result = $wpdb->delete($this->table_name, ['product_id' => $product_id], ['%d']);

        if ($result === false) {
            error_log('FFL Upsell: Failed to delete relations for product ' . $product_id . ' - ' . $wpdb->last_error);
        }
    }

    public function bulk_insert(array $relations): bool {
        if (empty($relations)) {
            return true;
        }

        global $wpdb;

        $values = [];
        $placeholders = [];

        foreach ($relations as $relation) {
            $values[] = $relation['product_id'];
            $values[] = $relation['related_id'];
            $values[] = $relation['score'];
            $placeholders[] = '(%d, %d, %f)';
        }

        $sql = "INSERT INTO {$this->table_name} (product_id, related_id, score) VALUES ";
        $sql .= implode(', ', $placeholders);
        $sql .= " ON DUPLICATE KEY UPDATE score = VALUES(score)";

        $prepared = $wpdb->prepare($sql, $values);
        $result = $wpdb->query($prepared);

        if ($result === false) {
            error_log('FFL Upsell: Bulk insert failed - ' . $wpdb->last_error);
            error_log('FFL Upsell: Failed query: ' . substr($prepared, 0, 500));
            return false;
        }

        return true;
    }

    public function get_count_for_product(int $product_id): int {
        global $wpdb;

        $sql = $wpdb->prepare(
            "SELECT COUNT(*) FROM {$this->table_name} WHERE product_id = %d",
            $product_id
        );

        return (int) $wpdb->get_var($sql);
    }

    public function get_total_relations(): int {
        global $wpdb;
        return (int) $wpdb->get_var("SELECT COUNT(*) FROM {$this->table_name}");
    }

    public function table_exists(): bool {
        global $wpdb;
        $table = $wpdb->get_var($wpdb->prepare(
            "SHOW TABLES LIKE %s",
            $this->table_name
        ));
        return $table === $this->table_name;
    }
}
