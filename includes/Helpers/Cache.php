<?php

namespace FFL\Upsell\Helpers;

defined('ABSPATH') || exit;

class Cache {
    private const KEYS_REGISTRY = 'fflu_cache_keys_registry';
    private const REGISTRY_VERSION = 'fflu_cache_registry_version';

    public static function get(string $key) {
        if (wp_using_ext_object_cache()) {
            return wp_cache_get($key, 'fflu');
        }

        return get_transient($key);
    }

    public static function set(string $key, $value, int $expiration = 0): bool {
        if (wp_using_ext_object_cache()) {
            self::register_key($key);
            return wp_cache_set($key, $value, 'fflu', $expiration);
        }

        return set_transient($key, $value, $expiration);
    }

    public static function delete(string $key): bool {
        if (wp_using_ext_object_cache()) {
            self::unregister_key($key);
            return wp_cache_delete($key, 'fflu');
        }

        return delete_transient($key);
    }

    public static function delete_by_prefix(string $prefix): int {
        $deleted = 0;

        if (wp_using_ext_object_cache()) {
            if (function_exists('wp_cache_flush_group')) {
                wp_cache_flush_group('fflu');
                self::clear_registry();
                return -1;
            }

            $keys = self::get_registered_keys();
            foreach ($keys as $key) {
                if (strpos($key, $prefix) === 0) {
                    wp_cache_delete($key, 'fflu');
                    self::unregister_key($key);
                    $deleted++;
                }
            }
        }

        global $wpdb;
        $like_pattern = '_transient_' . $wpdb->esc_like($prefix) . '%';
        $timeout_pattern = '_transient_timeout_' . $wpdb->esc_like($prefix) . '%';

        $deleted += (int) $wpdb->query(
            $wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $like_pattern)
        );
        $wpdb->query(
            $wpdb->prepare("DELETE FROM {$wpdb->options} WHERE option_name LIKE %s", $timeout_pattern)
        );

        return $deleted;
    }

    public static function flush(): void {
        if (wp_using_ext_object_cache()) {
            if (function_exists('wp_cache_flush_group')) {
                wp_cache_flush_group('fflu');
            } else {
                $keys = self::get_registered_keys();
                foreach ($keys as $key) {
                    wp_cache_delete($key, 'fflu');
                }
            }
            self::clear_registry();
        }

        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_fflu_%'");
        $wpdb->query("DELETE FROM {$wpdb->options} WHERE option_name LIKE '_transient_timeout_fflu_%'");
    }

    private static function register_key(string $key): void {
        $version = (int) get_option(self::REGISTRY_VERSION, 1);
        $keys = get_option(self::KEYS_REGISTRY . '_v' . $version, []);

        if (!is_array($keys)) {
            $keys = [];
        }

        if (count($keys) > 10000) {
            $version++;
            update_option(self::REGISTRY_VERSION, $version, false);
            $keys = [];
        }

        $keys[$key] = time();
        update_option(self::KEYS_REGISTRY . '_v' . $version, $keys, false);
    }

    private static function unregister_key(string $key): void {
        $version = (int) get_option(self::REGISTRY_VERSION, 1);
        $keys = get_option(self::KEYS_REGISTRY . '_v' . $version, []);

        if (is_array($keys) && isset($keys[$key])) {
            unset($keys[$key]);
            update_option(self::KEYS_REGISTRY . '_v' . $version, $keys, false);
        }
    }

    private static function get_registered_keys(): array {
        $version = (int) get_option(self::REGISTRY_VERSION, 1);
        $keys = get_option(self::KEYS_REGISTRY . '_v' . $version, []);

        return is_array($keys) ? array_keys($keys) : [];
    }

    private static function clear_registry(): void {
        $version = (int) get_option(self::REGISTRY_VERSION, 1);
        delete_option(self::KEYS_REGISTRY . '_v' . $version);
        update_option(self::REGISTRY_VERSION, $version + 1, false);
    }
}
