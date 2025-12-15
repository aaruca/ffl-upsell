<?php
/**
 * Plugin Name: Doofinder Sync
 * Description: Dynamically injects product meta for Doofinder and provides a debug interface.
 * Version: 2.4.0
 * Author: Ale Aruca, Muhammad Adeel
 * License: GPLv2 or later
 * License URI: http://www.gnu.org/licenses/gpl-2.0.html
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Define the prefix used for functions and constants
define( 'DSYNC_PREFIX', 'dsync_' );
define( 'DSYNC_PLUGIN_BASENAME', plugin_basename(__FILE__) );
define( 'DSYNC_PLUGIN_SLUG', dirname(DSYNC_PLUGIN_BASENAME) );

// GitHub updater configuration (override via wp-config.php if needed)
if (!defined('DSYNC_GITHUB_OWNER')) {
    define('DSYNC_GITHUB_OWNER', 'aaruca');
}

if (!defined('DSYNC_GITHUB_REPO')) {
    define('DSYNC_GITHUB_REPO', 'doofinder-sync');
}

if (!defined('DSYNC_GITHUB_BRANCH')) {
    define('DSYNC_GITHUB_BRANCH', 'main');
}

if (!defined('DSYNC_GITHUB_TOKEN')) {
    define('DSYNC_GITHUB_TOKEN', '');
}

add_filter('pre_set_site_transient_update_plugins', DSYNC_PREFIX . 'check_github_update');
function dsync_check_github_update($transient) {
    if (empty($transient->checked[DSYNC_PLUGIN_BASENAME])) {
        return $transient;
    }

    $remote = dsync_fetch_remote_metadata();
    if (!$remote) {
        return $transient;
    }

    $local_version = dsync_get_local_version();
    if ($local_version && version_compare($remote['version'], $local_version, '>')) {
        $update = new stdClass();
        $update->slug = DSYNC_PLUGIN_SLUG;
        $update->plugin = DSYNC_PLUGIN_BASENAME;
        $update->new_version = $remote['version'];
        $update->package = $remote['package'];
        $update->url = $remote['url'];
        $transient->response[DSYNC_PLUGIN_BASENAME] = $update;
    }

    return $transient;
}

add_filter('plugins_api', DSYNC_PREFIX . 'github_plugin_info', 10, 3);
function dsync_github_plugin_info($res, $action, $args) {
    if ($action !== 'plugin_information' || empty($args->slug) || $args->slug !== DSYNC_PLUGIN_SLUG) {
        return $res;
    }

    $remote = dsync_fetch_remote_metadata();
    if (!$remote) {
        return $res;
    }

    $info = new stdClass();
    $info->name = 'Doofinder Sync';
    $info->slug = DSYNC_PLUGIN_SLUG;
    $info->version = $remote['version'];
    $info->download_link = $remote['package'];
    $info->trunk = $remote['package'];
    $info->requires = dsync_get_header_value('RequiresWP');
    $info->tested = dsync_get_header_value('TestedWP');
    $info->requires_php = dsync_get_header_value('RequiresPHP');
    $info->author = 'Ale Aruca, Muhammad Adeel';
    $info->homepage = $remote['url'];

    $description = dsync_get_header_value('Description');
    $info->sections = [
        'description' => wpautop($description ? $description : 'Doofinder Sync extiende los datos de producto para Doofinder.'),
        'changelog'   => wpautop($remote['changelog'])
    ];

    return $info;
}

add_filter('upgrader_source_selection', DSYNC_PREFIX . 'adjust_github_source', 10, 4);
function dsync_adjust_github_source($source, $remote_source, $upgrader, $hook_extra) {
    if (empty($hook_extra['plugin']) || $hook_extra['plugin'] !== DSYNC_PLUGIN_BASENAME) {
        return $source;
    }

    $desired = trailingslashit($remote_source) . DSYNC_PLUGIN_SLUG . '/';
    if (is_dir($source) && !is_dir($desired)) {
        rename($source, $desired);
        return $desired;
    }

    return $source;
}

function dsync_fetch_remote_metadata() {
    $repo = dsync_get_repo_slug();
    if ($repo === '') {
        return null;
    }

    $cache_key = 'dsync_remote_meta_' . md5($repo . DSYNC_GITHUB_BRANCH);
    $cached = get_site_transient($cache_key);
    if ($cached !== false) {
        return $cached;
    }

    $plugin_file_url = sprintf(
        'https://api.github.com/repos/%s/contents/%s?ref=%s',
        $repo,
        basename(__FILE__),
        rawurlencode(DSYNC_GITHUB_BRANCH)
    );

    $file_response = dsync_github_api_request($plugin_file_url);
    if (!$file_response || empty($file_response['content'])) {
        return null;
    }

    $decoded_file = base64_decode($file_response['content']);
    if ($decoded_file === false) {
        return null;
    }

    $remote_version = dsync_extract_header_value($decoded_file, 'Version');
    if ($remote_version === '') {
        return null;
    }

    $meta = [
        'version' => $remote_version,
        'package' => sprintf(
            'https://github.com/%s/archive/refs/heads/%s.zip',
            $repo,
            rawurlencode(DSYNC_GITHUB_BRANCH)
        ),
        'url' => sprintf('https://github.com/%s', $repo),
        'changelog' => ''
    ];

    $readme_url = sprintf(
        'https://api.github.com/repos/%s/contents/readme.txt?ref=%s',
        $repo,
        rawurlencode(DSYNC_GITHUB_BRANCH)
    );

    $readme_response = dsync_github_api_request($readme_url);
    if ($readme_response && !empty($readme_response['content'])) {
        $readme = base64_decode($readme_response['content']);
        if ($readme !== false) {
            $meta['changelog'] = dsync_extract_readme_changelog($readme);
        }
    }

    set_site_transient($cache_key, $meta, 3 * HOUR_IN_SECONDS);
    return $meta;
}

function dsync_github_api_request($url) {
    $headers = [
        'Accept' => 'application/vnd.github+json',
        'User-Agent' => 'Doofinder-Sync-Updater'
    ];

    $token = trim(DSYNC_GITHUB_TOKEN);
    if ($token !== '') {
        $headers['Authorization'] = 'token ' . $token;
    }

    $response = wp_remote_get($url, [
        'headers' => $headers,
        'timeout' => 15
    ]);

    if (is_wp_error($response)) {
        return null;
    }

    $code = wp_remote_retrieve_response_code($response);
    if ($code < 200 || $code >= 300) {
        return null;
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);
    if (!is_array($data)) {
        return null;
    }

    return $data;
}

function dsync_extract_header_value($file_contents, $header) {
    $pattern = '/^[ \\t\\/*#@]*' . preg_quote($header, '/') . ':\\s*(.*)$/mi';
    if (preg_match($pattern, $file_contents, $matches) && isset($matches[1])) {
        return trim($matches[1]);
    }
    return '';
}

function dsync_extract_readme_changelog($readme) {
    $lines = explode("\n", $readme);
    $capture = false;
    $chunks = [];

    foreach ($lines as $line) {
        $trimmed = trim($line);
        if (stripos($trimmed, '== Changelog ==') === 0) {
            $capture = true;
            continue;
        }
        if ($capture && stripos($trimmed, '==') === 0 && stripos($trimmed, '== Changelog ==') === false) {
            break;
        }
        if ($capture) {
            $chunks[] = $line;
        }
    }

    $changelog = trim(implode("\n", $chunks));
    return $changelog === '' ? '' : $changelog;
}

function dsync_get_local_version() {
    return dsync_get_header_value('Version');
}

function dsync_get_header_value($key) {
    static $data = null;
    if ($data === null) {
        if (!function_exists('get_plugin_data')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        $data = get_plugin_data(__FILE__, false, false);
    }

    return isset($data[$key]) ? $data[$key] : '';
}

function dsync_get_repo_slug() {
    $owner = trim(DSYNC_GITHUB_OWNER);
    $repo = trim(DSYNC_GITHUB_REPO);
    $slug = ($owner !== '' && $repo !== '') ? $owner . '/' . $repo : '';
    return apply_filters('dsync_github_repo_slug', $slug);
}

/**
 * Defines the configuration for all dynamic meta fields.
 * 'tax' indicates a taxonomy lookup, 'cb' indicates a custom callback function.
 * * @return array Meta field configuration.
 */
function dsync_dynamic_meta_config() {
    return [
        '_category_slugs'     => ['tax' => 'product_cat',   'hier' => true],
        '_brand_slugs'        => ['tax' => 'product_brand', 'hier' => true],
        '_tag_slugs'          => ['tax' => 'product_tag',   'hier' => true],
        '_manufacturer_slugs' => ['cb' => DSYNC_PREFIX . 'get_manufacturer_slugs_for_product'],
        '_discount_codes'     => ['cb' => DSYNC_PREFIX . 'get_discount_price_for_product'],
        '_pewc_has_extra_fields' => ['cb' => 'pewc_has_extra_fields'],
        '_product_class'      => ['cb' => DSYNC_PREFIX . 'get_product_class_for_product'], 
    ];
}

// Filter to prevent escaping of forward slashes in JSON responses (e.g., in REST API)
add_filter('wp_json_encode_options', function() {
    return JSON_UNESCAPED_SLASHES;
});

// Hook to inject dynamic meta into WooCommerce REST API product response
add_filter('woocommerce_rest_prepare_product_object', DSYNC_PREFIX . 'add_dynamic_meta_to_rest', 10, 3);
/**
 * Adds dynamic meta fields to the REST API product response.
 */
function dsync_add_dynamic_meta_to_rest($response, $product, $request) {
    if (! $product instanceof WC_Product) {
        return $response;
    }
    
    $product_id = $product->get_id();
    foreach (dsync_dynamic_meta_config() as $meta_key => $opts) {
        // Compute and inject the dynamic meta value
        $response->data[$meta_key] = dsync_get_dynamic_meta_value($product_id, $opts);
    }
    
    // Set 'on_sale' flag to true if a discount price was calculated
    if (!empty($response->data['_discount_codes'])) {
        $response->data['on_sale'] = true;
    }
    
    return $response;
}

// Hook to inject dynamic meta into standard get_post_meta() calls
add_filter('get_post_metadata', DSYNC_PREFIX . 'inject_dynamic_meta', 10, 4);
/**
 * Intercepts get_post_metadata calls for 'product' post type and injects dynamic values.
 */
function dsync_inject_dynamic_meta($value, $post_id, $meta_key, $single) {
    if (get_post_type($post_id) !== 'product') {
        return $value;
    }
    $cfg = dsync_dynamic_meta_config();
    if (isset($cfg[$meta_key])) {
        // Compute the dynamic meta value
        $val = dsync_get_dynamic_meta_value($post_id, $cfg[$meta_key]);
        // Return single value or array based on the original request
        return $single ? $val : [$val];
    }
    return $value;
}

/**
 * Helper function to retrieve a dynamic meta value based on its configuration.
 */
function dsync_get_dynamic_meta_value($product_id, $opt) {
    if (!empty($opt['tax'])) {
        // Handle taxonomy lookup
        return dsync_get_taxonomy_slugs($product_id, $opt['tax'], !empty($opt['hier']));
    }
    if (!empty($opt['cb']) && is_callable($opt['cb'])) {
        // Handle custom callback function
        return call_user_func($opt['cb'], $product_id);
    }
    return '';
}

/**
 * Retrieves concatenated taxonomy slugs for a product, optionally handling hierarchy.
 */
function dsync_get_taxonomy_slugs($product_id, $tax, $hier = false) {
    $terms = get_the_terms($product_id, $tax);
    if (empty($terms) || is_wp_error($terms)) {
        return '';
    }

    $collected_paths = [];
    foreach ($terms as $term) {
        if ($hier) {
            // Get full hierarchical path (e.g., 'parent/child')
            $paths_for_term = dsync_get_taxonomy_paths($term->term_id, $tax);
            $collected_paths = array_merge($collected_paths, $paths_for_term);
        } else {
            // Get just the term slug
            $collected_paths[] = $term->slug;
        }
    }

    $unique_paths = array_unique($collected_paths);
    if (empty($unique_paths)) {
        return '';
    }
    
    $processed_paths = [];
    foreach ($unique_paths as $current_path) {
        if ($hier) {
            // Ensure hierarchical paths end with a slash for better indexing
            if (substr($current_path, -1) !== '/') {
                $processed_paths[] = $current_path . '/';
            } else {
                $processed_paths[] = $current_path;
            }
        } else {
            $processed_paths[] = $current_path;
        }
    }

    // Slugs are space-separated
    return implode(' ', $processed_paths);
}

/**
 * Recursively builds hierarchical paths (slugs) for a given term.
 */
function dsync_get_taxonomy_paths($term_id, $tax) {
    $paths = [];
    $slugs = [];

    $ancestor_ids = array_reverse(get_ancestors($term_id, $tax));
    $ancestor_ids[] = $term_id;

    foreach ($ancestor_ids as $ancestor_id) {
        $ancestor = get_term($ancestor_id, $tax);
        if (!is_wp_error($ancestor) && $ancestor) {
            $slugs[] = $ancestor->slug;
            $paths[] = implode('/', $slugs); // Stores paths like 'parent', 'parent/child', etc.
        }
    }

    return $paths;
}

/**
 * Computes manufacturer slugs for a product.
 * PRIORITIZES: Taxonomies (pa_manufacturer, manufacturer) > Text Attributes > Custom Fields.
 */
function dsync_get_manufacturer_slugs_for_product($product_id) {
    // MODIFICATION 1: Prioritize 'pa_manufacturer' as a Global Taxonomy.
    // This ensures we use the proper WooCommerce slug if it's set as a taxonomy term.
    $terms_pa_manufacturer = get_the_terms($product_id, 'pa_manufacturer');
    if ($terms_pa_manufacturer && !is_wp_error($terms_pa_manufacturer)) {
        $slugs = [];
        foreach ($terms_pa_manufacturer as $t) {
            $slugs[] = $t->slug;
        }
        return implode(' ', array_unique($slugs));
    }
    
    // Fallback 2: Check for a dedicated 'manufacturer' taxonomy (legacy/alternative setups).
    $terms = get_the_terms($product_id, 'manufacturer');
    if ($terms && !is_wp_error($terms)) {
        $slugs = [];
        foreach ($terms as $t) {
            $slugs[] = $t->slug;
        }
        return implode(' ', array_unique($slugs));
    }
    
    $product = wc_get_product($product_id);
    if ($product) {
        // Fallback 3: Get attribute value from 'pa_manufacturer' (when used as free text/non-taxonomy).
        // If it's free text, the slug must be generated by sanitizing the name.
        $val = $product->get_attribute('pa_manufacturer');
        if (!empty($val)) {
            // Decode HTML entities (e.g., &amp;)
            $val = html_entity_decode($val, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            
            // Replace problem characters with hyphens before sanitization
            $val = str_replace(['/', ',', '&', '  '], ['-', '-', '-', ' '], $val);
            
            // Sanitize to create the slug
            $slug = sanitize_title($val);
            
            // Clean up multiple consecutive hyphens
            $slug = preg_replace('/-+/', '-', $slug);
            
            return trim($slug, '-');
        }
        
        // Fallback 4: Try with other common attribute names
        $attr_names = ['manufacturer', 'Manufacturer', 'MANUFACTURER'];
        foreach ($attr_names as $attr) {
            $val = $product->get_attribute($attr);
            if (!empty($val)) {
                $val = html_entity_decode($val, ENT_QUOTES | ENT_HTML5, 'UTF-8');
                $val = str_replace(['/', ',', '&', '  '], ['-', '-', '-', ' '], $val);
                $slug = sanitize_title($val);
                $slug = preg_replace('/-+/', '-', $slug);
                return trim($slug, '-');
            }
        }
        
        // Fallback 5: Try with custom field 'Manufacturer'
        $cf = get_post_meta($product_id, 'Manufacturer', true);
        if (!empty($cf)) {
            $cf = html_entity_decode($cf, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $cf = str_replace(['/', ',', '&', '  '], ['-', '-', '-', ' '], $cf);
            $slug = sanitize_title($cf);
            $slug = preg_replace('/-+/', '-', $slug);
            return trim($slug, '-');
        }
    }

    return '';
}

/**
 * Computes the final discounted price, prioritizing "Discount Rules for WooCommerce" by Flycart,
 * and falling back to the standard WooCommerce sale price.
 */
function dsync_get_discount_price_for_product($product_id) {
    $p = wc_get_product($product_id);
    if (! $p) {
        return '';
    }

    $final_discounted_price_string = '';

    // Check for "Discount Rules for WooCommerce" plugin by Flycart
    if (class_exists('\Wdr\App\Controllers\ManageDiscount') && method_exists('\Wdr\App\Controllers\ManageDiscount', 'getDiscountDetailsOfAProduct')) {
        $plugin_discount_details = \Wdr\App\Controllers\ManageDiscount::getDiscountDetailsOfAProduct(false, $p, 1, 0);

        if ($plugin_discount_details && isset($plugin_discount_details['discounted_price']) && isset($plugin_discount_details['initial_price'])) {
            $plugin_calculated_discounted_price = floatval($plugin_discount_details['discounted_price']);
            $price_plugin_started_with = floatval($plugin_discount_details['initial_price']);

            // Only consider it a discount if the calculated price is lower than the starting price
            if ($plugin_calculated_discounted_price < $price_plugin_started_with) {
                $regular_price = floatval($p->get_regular_price());
                // Also ensure it's lower than the regular price
                if ($plugin_calculated_discounted_price < $regular_price) {
                    // Round up to the nearest two decimal places
                    $rounded_price = ceil($plugin_calculated_discounted_price * 100) / 100;
                    $final_discounted_price_string = number_format($rounded_price, 2, '.', '');
                }
            }
        }
    }

    // Fallback to standard WooCommerce sale price if no plugin discount was found
    if ($final_discounted_price_string === '') {
        $wc_sale_price = floatval($p->get_sale_price());
        $wc_regular_price = floatval($p->get_regular_price());
        if ($wc_sale_price > 0 && $wc_sale_price < $wc_regular_price) {
            $rounded_price = ceil($wc_sale_price * 100) / 100;
            $final_discounted_price_string = number_format($rounded_price, 2, '.', '');
        }
    }

    return $final_discounted_price_string;
}

/**
 * Retrieves the 'product_class' custom field value for a product.
 */
function dsync_get_product_class_for_product($product_id) {
    $product_class = get_post_meta($product_id, 'product_class', true);
    return !empty($product_class) ? sanitize_text_field($product_class) : '';
}

// Filter to correctly set the 'on sale' status based on the dynamically calculated discount price
add_filter('woocommerce_product_is_on_sale', DSYNC_PREFIX . 'check_discount_for_on_sale', 10, 2);
/**
 * Ensures 'is_on_sale' is true if the product has a dynamic discount price.
 */
function dsync_check_discount_for_on_sale($on_sale, $product) {
    if ($on_sale) {
        return $on_sale;
    }
    
    // Check if the dynamic discount price has been set (which means it's on sale)
    $discount_price = get_post_meta($product->get_id(), '_discount_codes', true);
    if (!empty($discount_price)) {
        return true;
    }
    
    return $on_sale;
}

// Add the admin menu page for debug interface
add_action('admin_menu', DSYNC_PREFIX . 'add_debug_menu_page');
function dsync_add_debug_menu_page(){
    add_menu_page(
        'Doofinder Sync Debug',
        'Doofinder Sync',
        'manage_options',
        'doofinder-sync-debug',
        DSYNC_PREFIX . 'render_debug_page',
        'dashicons-search',          
        30
    );
}

/**
 * Renders the Admin Debug page content, including field mapping and product inspection tool.
 */
function dsync_render_debug_page() {
    ?>
    <div class="wrap">
      <h1>Doofinder Sync - Meta Debug</h1>
      <p>Use this tool to inspect the dynamic metadata values generated for your products.</p>

      <h2>Doofinder Field Mapping Reference</h2>
      <p>Use these field names when configuring your Doofinder plugin mapping:</p>
      <table class="widefat fixed" cellspacing="0" style="margin-bottom: 20px; max-width: 600px;">
          <thead>
              <tr>
                  <th>Doofinder Attribute (Internal WordPress)</th>
                  <th>Doofinder Field Name (Suggested Mapping)</th>
              </tr>
          </thead>
          <tbody>
              <tr>
                  <td><code>_category_slugs</code></td>
                  <td><code>category_slugs</code></td>
              </tr>
              <tr>
                  <td><code>_tag_slugs</code></td>
                  <td><code>tag_slugs</code></td>
              </tr>
              <tr>
                  <td><code>_manufacturer_slugs</code></td>
                  <td><code>manufacturer_slugs</code></td>
              </tr>
              <tr>
                  <td><code>_brand_slugs</code></td>
                  <td><code>brand_slugs</code></td>
              </tr>
              <tr>
                  <td><code>_discount_codes</code></td> 
                  <td><code>discount_price</code></td>
              </tr>
              <tr>
                  <td><code>_pewc_has_extra_fields</code></td> 
                  <td><code>pewc_has_extra_fields</code></td>
              </tr>
              <tr>
                  <td><code>_product_class</code></td> 
                  <td><code>product_class</code></td>
              </tr>
          </tbody>
      </table>

      <hr>

      <h2>Inspect Product Meta</h2>
      <form method="get">
        <input type="hidden" name="page" value="doofinder-sync-debug">
        <label for="dsync_pid">Product ID: </label> <input type="number" id="dsync_pid" name="pid" value="<?php echo esc_attr(isset($_GET['pid']) ? intval($_GET['pid']) : ''); ?>" style="width:80px;">
        <?php submit_button('Inspect', 'primary', 'dsync_submit_inspect'); ?>
      </form>
      <?php
      if (isset($_GET['pid']) && !empty($_GET['pid'])) {
          $pid = intval($_GET['pid']);
          $product = wc_get_product($pid);
          if ($product) {
              echo '<h3>Results for Product #'. esc_html($pid) .': ' . esc_html($product->get_name()) . '</h3>'; 
              echo '<table class="widefat fixed" cellspacing="0"><thead>
                      <tr><th style="width: 30%;">Meta Key (Internal WordPress)</th><th>Computed Value</th></tr>
                    </thead><tbody>'; 
              foreach (dsync_dynamic_meta_config() as $meta_key => $opts) {
                  $val = dsync_get_dynamic_meta_value($pid, $opts);
                  echo '<tr><td>'. esc_html($meta_key) .'</td>
                            <td>';
                  if (is_bool($val)) {
                      echo $val ? 'true' : 'false';
                  } elseif (is_array($val)) {
                      echo nl2br(esc_html(print_r($val, true)));
                  } else {
                      echo nl2br(esc_html((string)$val));
                  }
                  echo '</td></tr>';
              }
              echo '</tbody></table>';
          } else {
              echo '<p><strong>Product not found with ID: ' . esc_html($pid) . '</strong></p>'; 
          }
      }
      ?>
    </div>
    <?php
}

/**
 * Checks for WooCommerce dependency on plugin activation.
 */
function dsync_activate_plugin() {
    if (!class_exists('WooCommerce')) {
        deactivate_plugins(plugin_basename(__FILE__));
        wp_die('Doofinder Sync requires WooCommerce to be installed and active. The plugin has been deactivated.'); 
    }
}
register_activation_hook(__FILE__, DSYNC_PREFIX . 'activate_plugin');

/**
 * Adds a script to fix potential price structure issues caused by certain themes/plugins.
 */
function dsync_add_price_structure_fix() {
    ?>
    <script>
    jQuery(document).ready(function($) {
        $('.price').each(function() {
            var $price = $(this);
            var $del = $price.find('del');
            
            // This entire block handles a specific price display issue (double-nested price tags)
            if ($del.find('ins').length > 0) {
                var originalPriceHTML = $del.find('ins .woocommerce-Price-amount').parent().html();
                var currentPriceHTML = $price.find('del + ins .woocommerce-Price-amount').parent().html();
                var originalPriceText = $del.find('ins .woocommerce-Price-amount').text();
                var currentPriceText = $price.find('del + ins .woocommerce-Price-amount').text();
                
                var newHtml = '<del aria-hidden="true">' + originalPriceHTML + '</del> ';
                newHtml += '<span class="screen-reader-text">Original price was: ' + originalPriceText + '.</span>';
                newHtml += '<ins>' + currentPriceHTML + '</ins>';
                newHtml += '<span class="screen-reader-text">Current price is: ' + currentPriceText + '.</span>';
                
                $price.html(newHtml);
            }
        });
    });
    </script>
    <?php
}

add_action('wp_footer', 'dsync_add_price_structure_fix');
