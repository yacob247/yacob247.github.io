/**
 * contact-submit.js
 * Submits the Yacob Digital contact form to Google Apps Script via JSON POST.
 *
 * Works on Chrome, Edge, Firefox, Safari — no email client, no new tab.
 *
 * Apps Script side expects JSON body: { to, subject, html, text }
 * The script has a 90s sleep (for GitHub Pages build delay), so we fire
 * the request and show success immediately — we don't wait for a response.
 */

(function () {
  'use strict';

  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbyYsr03oyOeBTaI2wImBWVjbsVwR0LHYT_6o0R6-vUuZVb9VmjtWiYFZgSduppvPhpj/exec';

  const RECIPIENT = 'envizionupdates@gmail.com';

  const form   = document.getElementById('contact-form');
  const btn    = document.getElementById('submit-btn');
  const status = document.getElementById('form-status');

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // --- collect + trim ---
    const name    = form.querySelector('#name').value.trim();
    const email   = form.querySelector('#email').value.trim();
    const subject = form.querySelector('#subject').value.trim();
    const message = form.querySelector('#message').value.trim();

    // --- validate ---
    if (!name || !email || !message) {
      showStatus('Please fill in your name, email, and message.', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showStatus('Please enter a valid email address.', 'error');
      return;
    }

    setLoading(true);
    showStatus('Sending…', 'info');

    const payload = {
      to: RECIPIENT,
      subject: subject
        ? `[Yacob Digital] ${subject}`
        : `[Yacob Digital] New enquiry from ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;color:#1e293b">
          <h2 style="color:#2563eb;margin-bottom:4px">New contact enquiry</h2>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin-bottom:20px"/>
          <p><strong>Name:</strong> ${escHtml(name)}</p>
          <p><strong>Email:</strong> <a href="mailto:${escHtml(email)}">${escHtml(email)}</a></p>
          ${subject ? `<p><strong>Subject:</strong> ${escHtml(subject)}</p>` : ''}
          <p><strong>Message:</strong></p>
          <div style="background:#f8fafc;border-left:3px solid #2563eb;padding:12px 16px;border-radius:4px;white-space:pre-wrap">${escHtml(message)}</div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin-top:24px"/>
          <p style="color:#94a3b8;font-size:12px">Sent via the Yacob Digital contact form</p>
        </div>
      `,
      text: `Name: ${name}\nEmail: ${email}\n${subject ? 'Subject: ' + subject + '\n' : ''}\nMessage:\n${message}`,
    };

    try {
      // Fire and forget — Apps Script sleeps 90s so we never await the response.
      // keepalive:true ensures the request completes even if the user navigates away.
      fetch(APPS_SCRIPT_URL, {
        method:  'POST',
        mode:    'no-cors',   // GAS can't send CORS headers after its redirect
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        keepalive: true,
      });

      // Show success straight away — request is in-flight, email will arrive
      showStatus("Enquiry sent! We'll get back to you soon.", 'success');
      form.reset();

    } catch (err) {
      // fetch() only throws on network-down / blocked by browser
      console.error('[contact-submit]', err);
      showStatus(
        'Could not send. Please email envizionupdates@gmail.com directly.',
        'error'
      );
    } finally {
      setLoading(false);
    }
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
    status.className   = 'mt-4 text-xs font-medium text-center';
    const colours = { success: 'text-green-600', error: 'text-red-500', info: 'text-gray-400' };
    status.classList.add(colours[type] || 'text-gray-400');
    status.classList.remove('hidden');
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();