/**
 * FFL Upsell - Admin Rebuild Handler
 */
(function($) {
    'use strict';

    let checkInterval;

    function startRebuild() {
        $.ajax({
            url: ffluAdmin.ajaxurl,
            type: 'POST',
            data: {
                action: 'fflu_start_rebuild',
                nonce: ffluAdmin.nonce
            },
            success: function(response) {
                if (response.success) {
                    $('#fflu-rebuild-start').hide();
                    $('#fflu-rebuild-cancel').show();
                    $('#fflu-rebuild-progress').show();
                    startProgressCheck();
                }
            },
            error: function(xhr, status, error) {
                console.error('FFL Upsell: Failed to start rebuild', error);
                alert(ffluAdmin.i18n.error_start);
            }
        });
    }

    function cancelRebuild() {
        if (!confirm(ffluAdmin.i18n.confirm_cancel)) {
            return;
        }

        $.ajax({
            url: ffluAdmin.ajaxurl,
            type: 'POST',
            data: {
                action: 'fflu_cancel_rebuild',
                nonce: ffluAdmin.nonce
            },
            success: function() {
                clearInterval(checkInterval);
                $('#fflu-rebuild-start').show();
                $('#fflu-rebuild-cancel').hide();
                $('#fflu-rebuild-status').text(ffluAdmin.i18n.cancelled);
            },
            error: function(xhr, status, error) {
                console.error('FFL Upsell: Failed to cancel rebuild', error);
            }
        });
    }

    function startProgressCheck() {
        checkInterval = setInterval(function() {
            $.ajax({
                url: ffluAdmin.ajaxurl,
                type: 'POST',
                data: {
                    action: 'fflu_get_rebuild_progress',
                    nonce: ffluAdmin.nonce
                },
                success: function(response) {
                    if (response.success && response.data.progress) {
                        updateProgress(response.data.progress);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('FFL Upsell: Failed to get progress', error);
                }
            });
        }, 2000);
    }

    function updateProgress(progress) {
        if (progress.status === 'completed') {
            clearInterval(checkInterval);
            $('#fflu-rebuild-start').show();
            $('#fflu-rebuild-cancel').hide();
            $('#fflu-rebuild-status').text(ffluAdmin.i18n.completed);
            $('#fflu-rebuild-message').html('<div class="notice notice-success"><p>' + ffluAdmin.i18n.success + '</p></div>').show();
        } else if (progress.status === 'running') {
            $('#fflu-rebuild-status').text(ffluAdmin.i18n.running);
        }

        let percent = progress.total_products > 0 ? (progress.processed / progress.total_products * 100).toFixed(1) : 0;

        $('#fflu-rebuild-percent').text(percent + '%');
        $('#fflu-rebuild-count').text(progress.processed);
        $('#fflu-rebuild-total').text(progress.total_products);
        $('#fflu-rebuild-bar').val(percent);
        $('#fflu-rebuild-relations').text(progress.total_relations);
    }

    function checkExistingRebuild() {
        $.ajax({
            url: ffluAdmin.ajaxurl,
            type: 'POST',
            data: {
                action: 'fflu_get_rebuild_progress',
                nonce: ffluAdmin.nonce
            },
            success: function(response) {
                if (response.success && response.data.progress && response.data.progress.status === 'running') {
                    $('#fflu-rebuild-start').hide();
                    $('#fflu-rebuild-cancel').show();
                    $('#fflu-rebuild-progress').show();
                    updateProgress(response.data.progress);
                    startProgressCheck();
                }
            }
        });
    }

    // Initialize on document ready
    $(document).ready(function() {
        $('#fflu-rebuild-start').on('click', startRebuild);
        $('#fflu-rebuild-cancel').on('click', cancelRebuild);
        checkExistingRebuild();
    });

})(jQuery);
