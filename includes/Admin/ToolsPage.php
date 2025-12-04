<?php

namespace FFL\Upsell\Admin;

use FFL\Upsell\Relations\Repository;

defined('ABSPATH') || exit;

class ToolsPage {
    private Repository $repository;

    public function __construct(Repository $repository) {
        $this->repository = $repository;
    }

    public function register_menu(): void {
        add_submenu_page(
            'woocommerce',
            __('FFL Upsell Tools', 'ffl-upsell'),
            __('FFL Tools', 'ffl-upsell'),
            'manage_woocommerce',
            'ffl-upsell-tools',
            [$this, 'render_page']
        );
    }

    public function render_page(): void {
        if (!current_user_can('manage_woocommerce')) {
            return;
        }

        $product_id = isset($_GET['product_id']) ? absint($_GET['product_id']) : 0;

        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>

            <h2><?php esc_html_e('Inspect Product Relations', 'ffl-upsell'); ?></h2>

            <form method="get" action="">
                <input type="hidden" name="page" value="ffl-upsell-tools" />
                <p>
                    <label for="product_id"><?php esc_html_e('Product ID:', 'ffl-upsell'); ?></label>
                    <input type="number" name="product_id" id="product_id" value="<?php echo esc_attr($product_id); ?>" min="1" />
                    <button type="submit" class="button"><?php esc_html_e('Search', 'ffl-upsell'); ?></button>
                </p>
            </form>

            <?php if ($product_id > 0) : ?>
                <?php $this->render_product_relations($product_id); ?>
            <?php endif; ?>

            <hr>

            <h2><?php esc_html_e('Statistics', 'ffl-upsell'); ?></h2>
            <?php $this->render_statistics(); ?>
        </div>
        <?php
    }

    private function render_product_relations(int $product_id): void {
        $product = wc_get_product($product_id);

        if (!$product) {
            echo '<div class="notice notice-error"><p>' . esc_html__('Product not found.', 'ffl-upsell') . '</p></div>';
            return;
        }

        $related = $this->repository->get_related_with_scores($product_id, 100);

        ?>
        <h3><?php echo esc_html(sprintf(__('Related products for: %s (ID: %d)', 'ffl-upsell'), $product->get_name(), $product_id)); ?></h3>

        <?php if (empty($related)) : ?>
            <p><?php esc_html_e('No related products found.', 'ffl-upsell'); ?></p>
        <?php else : ?>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th><?php esc_html_e('Related Product ID', 'ffl-upsell'); ?></th>
                        <th><?php esc_html_e('Product Name', 'ffl-upsell'); ?></th>
                        <th><?php esc_html_e('Score', 'ffl-upsell'); ?></th>
                        <th><?php esc_html_e('Status', 'ffl-upsell'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($related as $rel) : ?>
                        <?php
                        $rel_product = wc_get_product($rel['related_id']);
                        $rel_name = $rel_product ? $rel_product->get_name() : __('Unknown', 'ffl-upsell');
                        $rel_status = $rel_product ? $rel_product->get_status() : 'N/A';
                        ?>
                        <tr>
                            <td><?php echo esc_html($rel['related_id']); ?></td>
                            <td>
                                <?php if ($rel_product) : ?>
                                    <a href="<?php echo esc_url(get_edit_post_link($rel['related_id'])); ?>" target="_blank">
                                        <?php echo esc_html($rel_name); ?>
                                    </a>
                                <?php else : ?>
                                    <?php echo esc_html($rel_name); ?>
                                <?php endif; ?>
                            </td>
                            <td><?php echo esc_html(number_format($rel['score'], 4)); ?></td>
                            <td><?php echo esc_html($rel_status); ?></td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>
        <?php
    }

    private function render_statistics(): void {
        $total_relations = $this->repository->get_total_relations();

        ?>
        <table class="form-table">
            <tr>
                <th scope="row"><?php esc_html_e('Total Relations in Database', 'ffl-upsell'); ?></th>
                <td><?php echo esc_html(number_format($total_relations)); ?></td>
            </tr>
            <tr>
                <th scope="row"><?php esc_html_e('Database Table Status', 'ffl-upsell'); ?></th>
                <td>
                    <?php
                    if ($this->repository->table_exists()) {
                        echo '<span style="color: green;">' . esc_html__('Table exists', 'ffl-upsell') . '</span>';
                    } else {
                        echo '<span style="color: red;">' . esc_html__('Table missing', 'ffl-upsell') . '</span>';
                    }
                    ?>
                </td>
            </tr>
        </table>
        <?php
    }
}
