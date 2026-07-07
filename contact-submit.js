/**
 * contact-submit.js
 * Submits the Yacob Digital contact form directly to Google Apps Script
 * using a hidden <iframe> as the form target — works on Chrome, Edge,
 * Firefox, and Safari without opening any new tab or email client.
 *
 * How it works:
 *   1. On submit, the <form> action is pointed at the Apps Script URL.
 *   2. The form target is set to a hidden <iframe> on the page.
 *   3. Apps Script receives the GET parameters and sends the email.
 *   4. The Apps Script redirect lands silently inside the iframe.
 *   5. We detect iframe load to show the success message.
 *
 * Requirements on the Apps Script side:
 *   Your doGet(e) must read e.parameter.name / .email / .subject / .message,
 *   call GmailApp.sendEmail(...), then return a plain text/HTML response.
 */

(function () {
  'use strict';

  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbyYsr03oyOeBTaI2wImBWVjbsVwR0LHYT_6o0R6-vUuZVb9VmjtWiYFZgSduppvPhpj/exec';

  const form   = document.getElementById('contact-form');
  const btn    = document.getElementById('submit-btn');
  const status = document.getElementById('form-status');
  const iframe = document.getElementById('submit-target');

  if (!form || !iframe) return;

  // Point the real <form> at Apps Script with iframe as target
  form.setAttribute('action', APPS_SCRIPT_URL);
  form.setAttribute('method', 'GET');
  form.setAttribute('target', 'submit-target');

  let submitted = false;

  form.addEventListener('submit', function (e) {
    // --- client-side validation ---
    const name    = form.querySelector('#name').value.trim();
    const email   = form.querySelector('#email').value.trim();
    const message = form.querySelector('#message').value.trim();

    if (!name || !email || !message) {
      e.preventDefault();
      showStatus('Please fill in your name, email, and message.', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      e.preventDefault();
      showStatus('Please enter a valid email address.', 'error');
      return;
    }

    // All good — let the form submit natively into the iframe
    submitted = true;
    setLoading(true);
    showStatus('Sending…', 'info');
  });

  // When the iframe loads after submission, treat it as success
  iframe.addEventListener('load', function () {
    if (!submitted) return; // ignore initial empty load
    submitted = false;
    setLoading(false);
    showStatus("Enquiry sent! We'll get back to you soon.", 'success');
    form.reset();
  });

  /* ── helpers ───────────────────────────────────────────────────────── */

  function setLoading(on) {
    btn.disabled    = on;
    btn.textContent = on ? 'Sending…' : 'Send Enquiry';
    btn.style.opacity = on ? '0.7' : '';
    btn.style.cursor  = on ? 'not-allowed' : '';
  }

  function showStatus(msg, type) {
    status.textContent = msg;
    status.className = 'mt-4 text-xs font-medium text-center';
    const colours = { success: 'text-green-600', error: 'text-red-500', info: 'text-gray-400' };
    status.classList.add(colours[type] || 'text-gray-400');
    status.classList.remove('hidden');
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

})();