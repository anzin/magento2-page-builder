/**
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

define([
    'jquery',
    'slick'
], function ($) {
    'use strict';

    return function (config, sliderElement) {
        var $element = $(sliderElement);

        /**
         * Prevent each slick slider from being initialized more than once which could throw an error.
         */
        if ($element.hasClass('slick-initialized')) {
            $element.slick('unslick');
        }

        $element.slick({
            autoplay: $element.data('autoplay'),
            autoplaySpeed: $element.data('autoplay-speed') || 0,
            fade: $element.data('fade'),
            infinite: $element.data('is-infinite'),
            arrows: $element.data('show-arrows'),
            dots: $element.data('show-dots')
        });
    };
});
