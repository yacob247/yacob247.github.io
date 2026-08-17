/* Envizion AdSense privacy bootstrap. */
(function () {
  'use strict';
  var publisherId = '5812524294035974';
  var cmpSrc = 'https://fundingchoicesmessages.google.com/i/pub-' + publisherId + '?ers=1';

  function loadCmp() {
    if (!document.querySelector('script[src*="fundingchoicesmessages.google.com/i/pub-"]')) {
      var script = document.createElement('script');
      script.async = true;
      script.src = cmpSrc;
      document.head.appendChild(script);
    }
    var legacyBanner = document.getElementById('cookie-banner');
    if (legacyBanner) legacyBanner.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCmp, { once: true });
  } else {
    loadCmp();
  }
}());
