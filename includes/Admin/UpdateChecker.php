<?php

namespace FFL\Upsell\Admin;

use YahnisElsts\PluginUpdateChecker\v5\PucFactory;

defined('ABSPATH') || exit;

class UpdateChecker {
    private static $instance = null;
    private $update_checker = null;

    public static function instance(): self {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        $this->init_update_checker();
    }

    private function init_update_checker(): void {
        $this->update_checker = PucFactory::buildUpdateChecker(
            'https://github.com/aaruca/ffl-upsell',
            FFL_UPSELL_PLUGIN_FILE,
            'ffl-upsell'
        );

        // Set the branch to check for updates (main, master, etc.)
        $this->update_checker->setBranch('main');

        // Optional: Set authentication if the repo is private
        // $this->update_checker->setAuthentication('your-github-token');

        // Optional: Check for updates every 12 hours
        $this->update_checker->checkForUpdates();
    }

    /**
     * Get the update checker instance
     */
    public function get_update_checker() {
        return $this->update_checker;
    }
}
