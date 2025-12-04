<?php

namespace FFL\Upsell\Admin;

defined('ABSPATH') || exit;

class Notices {
    private array $notices = [];

    public function add(string $message, string $type = 'info'): void {
        $this->notices[] = [
            'message' => $message,
            'type' => $type,
        ];
    }

    public function display(): void {
        foreach ($this->notices as $notice) {
            $class = 'notice notice-' . esc_attr($notice['type']);
            printf(
                '<div class="%s"><p>%s</p></div>',
                esc_attr($class),
                esc_html($notice['message'])
            );
        }

        $this->notices = [];
    }
}
