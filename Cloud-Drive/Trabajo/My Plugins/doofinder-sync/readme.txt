=== Doofinder Sync ===
Contributors: Ale Aruca, Muhammad Adeel
Tags: woocommerce, doofinder, product feed, product meta, sync, product add-ons
Requires at least: 5.0
Tested up to: 6.4
Stable tag: 2.4.0
Requires PHP: 7.2
Requires Plugins: woocommerce
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Dynamically injects enhanced product metadata for Doofinder integration and provides a debug interface for inspection.

== Description ==

Doofinder Sync enhances your WooCommerce product data by dynamically generating and injecting crucial metadata fields. This is particularly useful for optimizing your product feed for search and discovery services like Doofinder.

The plugin automatically computes and makes available the following meta fields for each product:

*   `_category_slugs`: Hierarchical category slugs (e.g., "parent-cat/child-cat/").
*   `_tag_slugs`: Product tag slugs.
*   `_manufacturer_slugs`: Manufacturer slugs, aggregated from taxonomies and attributes.
*   `_brand_slugs`: Brand slugs, typically from a dedicated `product_brand` taxonomy.
*   `_discount_codes`: The actual discounted price of a product, considering rules from the "Discount Rules for WooCommerce" plugin by Flycart, or standard WooCommerce sale prices if no plugin discount applies.
*   `_pewc_has_extra_fields`: **Indicates whether a product has associated "Product Add-Ons Ultimate" extra fields (`true` or `false`).**
*   `_product_class`: Value stored in the custom field `product_class`.

These dynamic meta fields are:

1.  **Injected into the WooCommerce REST API product response:** Making them readily available for external integrations.
2.  **Made accessible via `get_post_meta()`:** Allowing other plugins or custom code to retrieve these computed values as if they were standard post meta.

Additionally, Doofinder Sync provides a "Meta Debug" page under the "Doofinder Sync" top-level menu in the WordPress admin area. This interface allows administrators to:

*   View a reference table for mapping internal WordPress field names to suggested Doofinder field names.
*   Inspect the computed dynamic meta values for any specific product by entering its ID.

This plugin requires WooCommerce to be active. It also leverages the "Discount Rules for WooCommerce" plugin by Flycart for accurate discount price calculation if that plugin is installed and active.

== Installation ==

1.  Upload the `doofinder-sync` folder to the `/wp-content/plugins/` directory.
2.  Activate the plugin through the 'Plugins' menu in WordPress.
3.  Ensure WooCommerce is installed and activated.
4.  (Optional but Recommended) If you use "Discount Rules for WooCommerce" by Flycart, ensure it is active for accurate discount price meta.
5.  You will find a new menu item "Doofinder Sync" in your WordPress admin sidebar. This page contains the debug tool and field mapping reference.

== Frequently Asked Questions ==

= Does this plugin create the Doofinder feed? =

No, this plugin focuses on preparing and making dynamic product metadata available. You would typically use another plugin or service to generate the actual Doofinder feed, and then map the fields provided by Doofinder Sync (like `category_slugs`, `discount_price`, `pewc_has_extra_fields`, etc.) within that feed generation tool.

= How does it get the discount price? =

It first checks if "Discount Rules for WooCommerce" by Flycart is active and tries to get the discount price from its logic. If no discount is found via that plugin, or if the plugin is not active, it falls back to the standard WooCommerce sale price (if one is set and is lower than the regular price).

= Where can I see the generated meta? =

1.  **REST API:** When fetching products via the WooCommerce REST API, the dynamic meta fields will be included in the product data.
2.  **Meta Debug Page:** Navigate to "Doofinder Sync" in your WordPress admin menu. You can enter a Product ID to see all computed meta values for that product. Boolean values (true/false) will be displayed as the words "true" or "false" for clarity in this debug view.
3.  **Programmatically:** Other plugins or custom code can use `get_post_meta($product_id, '_category_slugs', true)` (and other meta keys defined in this plugin) to retrieve the values.

= Can I customize the meta keys or the logic? =

Yes, the plugin is designed with filter hooks in mind (though not explicitly added in this base version). The core logic is within the `dsync_dynamic_meta_config()` function and the associated callback functions. Developers can modify these or use WordPress filters (if added) to customize the behavior.

= What if I don't have a 'product_brand' or 'manufacturer' taxonomy? =

*   For `_product_brand_slugs`, the plugin currently expects a taxonomy named `product_brand`. If you use a different taxonomy for brands, you'll need to modify the `dsync_dynamic_meta_config()` function in the plugin code.
*   For `_product_manufacturer_slugs`, the logic is more flexible and tries to get manufacturer information from a `manufacturer` taxonomy, product attributes named "manufacturer" (case-insensitive), global attributes containing "manufacturer" in their taxonomy name, and a custom field named "Manufacturer".

== Screenshots ==

1.  The Meta Debug page in the WordPress admin area, showing the field mapping reference and product inspection tool. (You would add a screenshot named `screenshot-1.png` to your plugin's `/assets` folder for this)

== Changelog ==

= 2.4.0 =
*   New: Auto-actualizaciones desde GitHub (rama configurable, token opcional). El plugin renombra la carpeta descargada para que el upgrader de WordPress la acepte sin pasos manuales.
*   Bump de versión y metadatos.

= 2.0.0 =
*   **Feature:** Added dynamic meta field `_pewc_has_extra_fields` to indicate if a product has "Product Add-Ons Ultimate" extra fields.
*   **Enhancement:** Debug page now displays boolean values as "true" or "false" for improved clarity.
*   **Update:** Removed copy-to-clipboard functionality from the debug table for conciseness.
*   Initial release.
*   Dynamic meta injection for categories, tags, manufacturers, brands, and discount prices.
*   REST API integration.
*   `get_post_meta` filter integration.
*   Admin debug interface.

== Upgrade Notice ==

= 2.4.0 =
Se añade la auto-actualización desde GitHub. Configura los defines `DSYNC_GITHUB_OWNER`, `DSYNC_GITHUB_REPO`, `DSYNC_GITHUB_BRANCH` (y opcionalmente `DSYNC_GITHUB_TOKEN`) si necesitas apuntar a otra cuenta o rama.

= 2.0.0 =
This is a major feature update. Please update your Doofinder product feed mappings to include the new `pewc_has_extra_fields` if you wish to use this new data.
