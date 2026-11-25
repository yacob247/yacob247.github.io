/* Envizion AdSense privacy bootstrap. */
(function () {
  'use strict';
  var publisherId = '5812524294035974';
  var cmpSrc = 'https://fundingchoicesmessages.google.com/i/pub-' + publisherId + '?ers=1';

  function openPrivacyChoices() {
    window.googlefc = window.googlefc || { callbackQueue: [] };
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    window.googlefc.callbackQueue.push({ event: 'OPEN_PRIVACY_AND_MESSAGING' });
  }

  function addSharedUi() {
    if (!document.getElementById('envizion-consent-ui')) {
      var style = document.createElement('style');
      style.id = 'envizion-consent-ui';
      style.textContent = `
        .global-nav { background: #f8fafc !important; border-bottom: 1px solid #dbe3ee !important; color: #334155; }
        .global-nav > div { max-width: 1200px !important; margin: 0 auto !important; padding: 8px 20px !important; line-height: 1.5; display: flex; flex-wrap: wrap; align-items: center; gap: .25rem .6rem; }
        .global-nav a { color: #334155; text-decoration: none; font-weight: 650; }
        .global-nav a:hover, .global-nav a:focus-visible { color: #1d4ed8; text-decoration: underline; }
        .site-nav .nav-menu.is-open .nav-menu-content { opacity: 1; transform: scale(1); visibility: visible; }
        .site-nav .nav-menu > button:focus-visible, .site-nav a:focus-visible, .topbar a:focus-visible, .nav-dropdown summary:focus-visible { outline: 3px solid rgba(37,99,235,.35); outline-offset: 3px; }
        #envizion-privacy-button { position: fixed; left: 16px; bottom: 16px; z-index: 99990; border: 1px solid rgba(148,163,184,.5); border-radius: 999px; padding: 9px 13px; background: rgba(15,23,42,.94); color: #fff; box-shadow: 0 8px 24px rgba(15,23,42,.22); cursor: pointer; font: 700 12px/1.2 system-ui,sans-serif; }
        #envizion-privacy-button:hover, #envizion-privacy-button:focus-visible { background: #1d4ed8; }
        .envizion-site-footer { margin-top: 3rem; padding: 2rem max(20px, calc((100% - 1180px) / 2)); border-top: 1px solid rgba(148,163,184,.25); background: #0f172a; color: #cbd5e1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; font: 600 13px/1.6 system-ui,sans-serif; }
        .envizion-site-footer a { color: #bfdbfe; text-decoration: none; margin-right: 1rem; }
        .envizion-site-footer a:hover, .envizion-site-footer a:focus-visible { color: #fff; text-decoration: underline; }
        @media (max-width: 640px) { #envizion-privacy-button { left: 10px; bottom: 10px; } .global-nav > div { padding-inline: 12px !important; } }
      `;
      document.head.appendChild(style);
    }

    document.querySelectorAll('.global-nav').forEach(function (nav) {
      if (!nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Site information');
    });

    document.querySelectorAll('.site-nav .nav-menu > button').forEach(function (button) {
      var menu = button.parentElement;
      if (!menu || button.dataset.envizionBound) return;
      button.dataset.envizionBound = 'true';
      button.setAttribute('aria-haspopup', 'true');
      button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', function () {
        var open = menu.classList.toggle('is-open');
        button.setAttribute('aria-expanded', String(open));
      });
    });

    document.addEventListener('click', function (event) {
      document.querySelectorAll('.site-nav .nav-menu.is-open').forEach(function (menu) {
        if (!menu.contains(event.target)) {
          menu.classList.remove('is-open');
          var button = menu.querySelector(':scope > button');
          if (button) button.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.querySelectorAll('[data-envizion-year]').forEach(function (year) {
      year.textContent = String(new Date().getFullYear());
    });

    if (!document.getElementById('envizion-privacy-button')) {
      var privacyButton = document.createElement('button');
      privacyButton.id = 'envizion-privacy-button';
      privacyButton.type = 'button';
      privacyButton.textContent = 'Privacy choices';
      privacyButton.setAttribute('aria-label', 'Open privacy and advertising choices');
      privacyButton.addEventListener('click', openPrivacyChoices);
      document.body.appendChild(privacyButton);
    }
  }

  function loadCmp() {
    if (!document.querySelector('script[src*="fundingchoicesmessages.google.com/i/pub-"]')) {
      var script = document.createElement('script');
      script.async = true;
      script.src = cmpSrc;
      document.head.appendChild(script);
    }
    var legacyBanner = document.getElementById('cookie-banner');
    if (legacyBanner) legacyBanner.remove();
    addSharedUi();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCmp, { once: true });
  } else {
    loadCmp();
  }
}());
