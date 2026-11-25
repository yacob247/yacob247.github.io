/* Shared consent bootstrap for the remaining static tool pages. */
(function () {
  'use strict';
  if (!document.querySelector('script[src*="ad-consent-bootstrap.js"]')) {
    var bootstrap = document.createElement('script');
    bootstrap.defer = true;
    bootstrap.src = '/ad-consent-bootstrap.js';
    document.head.appendChild(bootstrap);
  }
  if (!document.querySelector('script[src*="fundingchoicesmessages.google.com/i/pub-"]')) {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://fundingchoicesmessages.google.com/i/pub-5812524294035974?ers=1';
    document.head.appendChild(script);
  }
  var legacyBanner = document.getElementById('cookie-banner');
  if (legacyBanner) legacyBanner.remove();
}());
