<?php

namespace FFL\Upsell;

defined('ABSPATH') || exit;

class Plugin {
    private static ?Plugin $instance = null;

    private Relations\Repository $repository;
    private Relations\Rebuilder $rebuilder;
    private Runtime\RelatedService $related_service;
    private Runtime\Shortcode $shortcode;
    private Admin\SettingsPage $settings_page;
    private Admin\ToolsPage $tools_page;
    private Admin\Notices $notices;
    private Admin\RebuildHandler $rebuild_handler;
    private ?Bricks\QueryProvider $bricks_query_provider = null;
    private bool $integrations_loaded = false;

    public static function instance(): Plugin {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->load_services();
    }

    private function load_services(): void {
        $this->repository = new Relations\Repository();
        $this->rebuilder = new Relations\Rebuilder($this->repository);
        $this->related_service = new Runtime\RelatedService($this->repository);
        $this->shortcode = new Runtime\Shortcode($this->related_service);
        $this->settings_page = new Admin\SettingsPage($this->rebuilder);
        $this->tools_page = new Admin\ToolsPage($this->repository);
        $this->notices = new Admin\Notices();
        $this->rebuild_handler = new Admin\RebuildHandler($this->rebuilder);
    }

    public function init(): void {
        $this->register_hooks();
        $this->maybe_register_cli();

        // Cargar integraciones lo más pronto posible
        add_action('init', [$this, 'load_integrations'], 5);
    }

    private function register_hooks(): void {
        add_action('init', [$this->shortcode, 'register']);
        add_action('admin_menu', [$this->settings_page, 'register_menu'], 99);
        add_action('admin_menu', [$this->tools_page, 'register_menu'], 99);
        add_action('admin_init', [$this->settings_page, 'register_settings']);
        add_action('admin_notices', [$this->notices, 'display']);

        $this->rebuild_handler->register_hooks();

        $cron_enabled = get_option('fflu_cron_enabled', 1);

        if ($cron_enabled) {
            add_action('fflu_daily_rebuild', [$this->rebuild_handler, 'start_background_rebuild']);

            if (!wp_next_scheduled('fflu_daily_rebuild')) {
                wp_schedule_event(time(), 'daily', 'fflu_daily_rebuild');
            }
        } else {
            $timestamp = wp_next_scheduled('fflu_daily_rebuild');
            if ($timestamp) {
                wp_unschedule_event($timestamp, 'fflu_daily_rebuild');
            }
        }

        if (FFL_UPSELL_OVERRIDE_WC_RELATED) {
            $this->related_service->override_wc_related();
        }
    }

    public function load_integrations(): void {
        if ($this->integrations_loaded) {
            return;
        }

        $this->integrations_loaded = true;

        if (defined('BRICKS_VERSION')) {
            $this->bricks_query_provider = new Bricks\QueryProvider($this->related_service);
            $this->bricks_query_provider->register();
        }
    }

    private function maybe_register_cli(): void {
        if (defined('WP_CLI') && WP_CLI) {
            \WP_CLI::add_command('fflu', CLI\Commands::class);
        }
    }

    public function repository(): Relations\Repository {
        return $this->repository;
    }

    public function rebuilder(): Relations\Rebuilder {
        return $this->rebuilder;
    }

    public function related_service(): Runtime\RelatedService {
        return $this->related_service;
    }

    public function notices(): Admin\Notices {
        return $this->notices;
    }
}
