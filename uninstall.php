<?php
/**
 * Fired when the plugin is uninstalled.
 */

defined('WP_UNINSTALL_PLUGIN') || exit;

$autoload_file = __DIR__ . '/vendor/autoload.php';

if (file_exists($autoload_file)) {
    require_once $autoload_file;
    FFL\Upsell\Install\Uninstall::uninstall();
} else {
    error_log('FFL Upsell: vendor/autoload.php not found during uninstall. Run composer install.');
}
