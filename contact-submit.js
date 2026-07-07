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
      replyTo: `${name} <${email}>`,
      subject: subject
        ? `[Yacob Digital] ${subject}`
        : `[Yacob Digital] New enquiry from ${name}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>New Enquiry</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#2563eb;border-radius:12px 12px 0 0;padding:32px 40px;text-align:left;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:8px;padding:6px 14px;margin-bottom:16px;">
              <span style="color:#fff;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Yacob Digital</span>
            </div>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">New contact enquiry</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Someone submitted the contact form on your website.</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 40px;">

            <!-- Sender card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <div style="display:flex;align-items:center;margin-bottom:4px;">
                    <div style="width:40px;height:40px;border-radius:50%;background:#2563eb;display:inline-flex;align-items:center;justify-content:center;margin-right:14px;vertical-align:middle;">
                      <span style="color:#fff;font-size:16px;font-weight:700;line-height:40px;display:inline-block;width:40px;text-align:center;">${escHtml(name.charAt(0).toUpperCase())}</span>
                    </div>
                    <div style="display:inline-block;vertical-align:middle;">
                      <div style="font-size:15px;font-weight:700;color:#0f172a;line-height:1.2;">${escHtml(name)}</div>
                      <div style="font-size:13px;color:#2563eb;margin-top:2px;"><a href="mailto:${escHtml(email)}" style="color:#2563eb;text-decoration:none;">${escHtml(email)}</a></div>
                    </div>
                  </div>
                </td>
              </tr>
            </table>

            <!-- Subject row -->
            ${subject ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:0;">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">Subject</p>
                  <p style="margin:0;font-size:15px;font-weight:600;color:#0f172a;">${escHtml(subject)}</p>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr><td style="border-top:1px solid #f1f5f9;font-size:0;">&nbsp;</td></tr></table>
            ` : ''}

            <!-- Message -->
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;">Message</p>
            <div style="background:#f8fafc;border-left:3px solid #2563eb;border-radius:0 8px 8px 0;padding:16px 20px;font-size:14px;line-height:1.75;color:#334155;white-space:pre-wrap;">${escHtml(message)}</div>

            <!-- Reply CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
              <tr>
                <td>
                  <a href="https://mail.google.com/mail/?view=cm&amp;to=${escHtml(email)}&amp;su=Re%3A%20${encodeURIComponent(subject || 'Your enquiry')}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 28px;border-radius:8px;letter-spacing:0.3px;">Reply to ${escHtml(name)}</a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.6;">
              This message was submitted via the contact form at <strong>yacobdigital.com</strong><br/>
              © ${new Date().getFullYear()} Yacob Digital · <a href="mailto:envizionupdates@gmail.com" style="color:#94a3b8;text-decoration:underline;">envizionupdates@gmail.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
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