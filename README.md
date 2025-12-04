# FFL Upsell

Fast related products for WooCommerce powered by a precomputed relation table, with full Bricks Builder integration.

## Description

FFL Upsell is a high-performance WordPress plugin that replaces WooCommerce's default related products system with a precomputed scoring algorithm. Instead of calculating related products on every page load, FFL Upsell builds and caches relationships in a dedicated database table, making it ideal for stores with 50,000+ products.

**Key Features:**

- Precomputed relation table for instant queries
- Smart scoring based on category/tag similarity and order co-occurrence
- Daily automatic rebuilds via WP-Cron
- WP-CLI support for manual rebuilds
- Shortcode for displaying related products
- Full Bricks Builder integration (Query Provider + Element)
- Optional override of native WooCommerce related products
- Configurable weights, limits, and batch processing
- Object cache / transient caching for optimal performance

## Requirements

- PHP 8.0+
- WordPress 6.0+
- WooCommerce 7.0+
- Composer (for autoloading)

## Installation

1. **Install the plugin:**

   Upload the `ffl-upsell` folder to `/wp-content/plugins/` or install via the WordPress plugin installer.

2. **Run Composer:**

   Navigate to the plugin directory and run:

   ```bash
   composer install --no-dev --optimize-autoloader
   ```

   This generates the `vendor/autoload.php` file required for PSR-4 autoloading.

3. **Activate the plugin:**

   Go to **Plugins** in your WordPress admin and activate **FFL Upsell**.

4. **Build initial relations:**

   After activation, the plugin creates the `{prefix}ffl_related` database table. To populate it, either:

   - Wait for the daily WP-Cron to run automatically, or
   - Trigger a manual rebuild via WP-CLI (recommended):

     ```bash
     wp fflu rebuild
     ```

   - Or use the admin "Rebuild Relations Now" button under **WooCommerce > FFL Upsell**.

## Configuration

### Settings Page

Navigate to **WooCommerce > FFL Upsell** to configure:

- **Relations per Product:** Maximum number of related products to store per product (default: 20)
- **Category/Tag Weight:** Scoring weight for taxonomy similarity (default: 0.6)
- **Co-occurrence Weight:** Scoring weight for order co-occurrence (default: 0.4)
- **Cache TTL:** How long to cache related product queries in minutes (default: 10)
- **Batch Size:** Number of products to process per batch during rebuild (default: 500)
- **Enable Daily Cron:** Toggle automatic daily rebuilds via WP-Cron (default: enabled)

### Optional Constants

Add these to your `wp-config.php` to modify plugin behavior:

```php
// Override WooCommerce's native related products with FFL Upsell results
define('FFL_UPSELL_OVERRIDE_WC_RELATED', true);

// Drop the database table on plugin uninstall (default: false)
define('FFL_UPSELL_DROP_TABLE_ON_UNINSTALL', true);
```

## Usage

### WP-CLI Commands

**Rebuild all products:**

```bash
wp fflu rebuild
```

**Rebuild with custom batch size and limit:**

```bash
wp fflu rebuild --batch_size=1000 --limit_per_product=30
```

**Rebuild a single product:**

```bash
wp fflu rebuild --product_id=123
```

**Skip truncating the table before rebuild:**

```bash
wp fflu rebuild --truncate=false
```

### Shortcode

Display related products on any page or post:

```php
[fflu_related limit="8"]
```

**Attributes:**

- `limit` - Number of products to display (default: 8)
- `product_id` - Specific product ID to show relations for (default: current product)

**Example:**

```php
[fflu_related limit="12" product_id="456"]
```

### PHP Functions

**Get related product IDs:**

```php
$related_ids = fflu_get_related_ids(123, 10);
// Returns array of up to 10 related product IDs for product 123
```

**Get product objects:**

```php
$products = fflu_get_products([456, 789, 101]);
// Returns array of WC_Product objects
```

### Bricks Builder Integration

#### Query Provider

1. In Bricks Builder, add a **Query Loop** element
2. Set **Query Type** to **FFL Related Products**
3. Configure settings:
   - `limit` - Number of products to fetch (default: 8)
   - `use_current_product` - Use current product context (default: true)
   - `product_id` - Fallback product ID when not on a product page

#### Custom Element

1. In Bricks Builder, search for the **FFL Related Products** element
2. Add it to your template
3. Configure controls:
   - **Title** - Section heading
   - **Limit** - Number of products
   - **Product ID** - Leave empty to use current product
   - **Layout** - Grid or List
   - **Columns** - Number of columns (grid only)
   - **Show Price** - Toggle price display
   - **Show Add to Cart** - Toggle add to cart button
   - **Gap** - Spacing between products

## Hooks & Filters

### Filters

**Modify related IDs before returning:**

```php
add_filter('fflu_related_ids', function($ids, $product_id, $limit) {
    // Custom logic here
    return $ids;
}, 10, 3);
```

**Adjust scoring weights:**

```php
add_filter('fflu_scoring_weights', function($weights) {
    $weights['cat_tag'] = 0.7;
    $weights['cooccur'] = 0.3;
    return $weights;
});
```

**Filter candidate products:**

```php
add_filter('fflu_candidates', function($candidates, $product_id) {
    // Add or remove candidate IDs
    return $candidates;
}, 10, 2);
```

**Modify score for a specific pair:**

```php
add_filter('fflu_score_for_pair', function($score, $product_id, $candidate_id) {
    // Custom scoring logic
    return $score;
}, 10, 3);
```

**Adjust cache TTL:**

```php
add_filter('fflu_cache_ttl', function($ttl, $product_id) {
    return 30; // 30 minutes
}, 10, 2);
```

**Modify shortcode template path:**

```php
add_filter('fflu_shortcode_template_path', function($path) {
    return get_stylesheet_directory() . '/ffl-upsell/related-shortcode.php';
});
```

**Filter shortcode output HTML:**

```php
add_filter('fflu_shortcode_template_html', function($html, $products, $atts) {
    // Modify HTML output
    return $html;
}, 10, 3);
```

### Actions

**Before rebuild starts:**

```php
add_action('fflu_rebuild_started', function($args) {
    // Log or notify
});
```

**After each batch completes:**

```php
add_action('fflu_rebuild_batch_completed', function($data) {
    // $data contains: batch, total_batches, processed, total, relations_added
});
```

**After rebuild completes:**

```php
add_action('fflu_rebuild_completed', function($result) {
    // $result contains: products_processed, total_relations
});
```

## Database Schema

Table: `{prefix}ffl_related`

| Column       | Type                | Description                        |
|--------------|---------------------|------------------------------------|
| product_id   | BIGINT(20) UNSIGNED | Source product ID                  |
| related_id   | BIGINT(20) UNSIGNED | Related product ID                 |
| score        | FLOAT               | Relevance score (0-1)              |

**Indexes:**

- Primary key: `(product_id, related_id)`
- Index: `product_score (product_id, score DESC)`

## Algorithm

FFL Upsell calculates relationships using two weighted scoring factors:

1. **Taxonomy Similarity (Category/Tag):** Jaccard index of shared categories and tags
2. **Order Co-occurrence:** How often products are purchased together (normalized)

Final score = `(taxonomy_score × weight_cat_tag) + (cooccur_score × weight_cooccur)`

Scores are normalized to 0-1 and the top N products (configurable) are stored per product.

## Performance

- **Batch processing:** Prevents memory exhaustion on large catalogs
- **Precomputed scores:** Queries are instant, no runtime calculations
- **Object cache support:** Uses Redis/Memcached if available, falls back to transients
- **Indexed queries:** Database queries use optimized indexes for fast lookups
- **Scalable:** Tested with 50,000+ products

## Tools Page

Navigate to **WooCommerce > FFL Tools** to:

- Search for a product ID and view its related products with scores
- View database statistics (total relations, table status)

## Uninstallation

When you uninstall the plugin:

- Settings options are deleted
- Cached transients are cleared
- The database table is **only** dropped if you set:

  ```php
  define('FFL_UPSELL_DROP_TABLE_ON_UNINSTALL', true);
  ```

  in your `wp-config.php` before uninstalling.

## Author

**Ale Aruca**
[https://alearuca.com](https://alearuca.com)

## License

GPL v2 or later
[https://www.gnu.org/licenses/gpl-2.0.html](https://www.gnu.org/licenses/gpl-2.0.html)

## Support

For issues, feature requests, or questions, please open an issue on the plugin's repository.

## Changelog

### 1.0.0

- Initial release
- Precomputed relation table
- WP-CLI support
- Bricks Builder integration
- Shortcode support
- Daily WP-Cron rebuilds
- Configurable scoring weights
- Admin settings and tools pages
