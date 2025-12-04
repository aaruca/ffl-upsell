<?php
/**
 * Template for [fflu_related] shortcode
 *
 * @var array $products Array of WC_Product objects
 */

defined('ABSPATH') || exit;

if (empty($products)) {
    return;
}

global $product;
$original_product = $product;
?>

<div class="fflu-related-products">
    <?php foreach ($products as $loop_product) :
        $product = $loop_product;
    ?>
        <div class="fflu-product-card">
            <a href="<?php echo esc_url($loop_product->get_permalink()); ?>" class="fflu-product-link">
                <?php if ($loop_product->get_image_id()) : ?>
                    <div class="fflu-product-image">
                        <?php echo wp_kses_post($loop_product->get_image('woocommerce_thumbnail')); ?>
                    </div>
                <?php endif; ?>

                <h3 class="fflu-product-title">
                    <?php echo esc_html($loop_product->get_name()); ?>
                </h3>

                <div class="fflu-product-price">
                    <?php echo wp_kses_post($loop_product->get_price_html()); ?>
                </div>
            </a>

            <div class="fflu-product-actions">
                <?php woocommerce_template_loop_add_to_cart(['product' => $loop_product]); ?>
            </div>
        </div>
    <?php endforeach; ?>
</div>

<?php $product = $original_product; ?>
