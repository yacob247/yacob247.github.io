/**
 * contact-submit.js
 * Submits the Yacob Digital contact form to Google Apps Script via JSON POST.
 *
 * Works on Chrome, Edge, Firefox, Safari — no email client, no new tab.
 * Also intercepts mailto links with an elegant UX modal supporting direct Gmail redirection.
 */

(function () {
  'use strict';

  const APPS_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbzAW6uVNde6I0DGnnrWqncLNX78Auyfnji9mXoIQp2HREOntBz2dnVJeIM3PDqGLhzD_g/exec';

  const RECIPIENT = 'envizionupdates@gmail.com';

  const form   = document.getElementById('contact-form');
  const btn    = document.getElementById('submit-btn');
  const status = document.getElementById('form-status');

  // Inject custom styles for our gorgeous dynamic modal
  const style = document.createElement('style');
  style.textContent = `
    .email-modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px); z-index: 9999; display: flex;
      align-items: center; justify-content: center; opacity: 0;
      transition: opacity 0.25s ease; pointer-events: none;
    }
    .email-modal-overlay.active { opacity: 1; pointer-events: auto; }
    .email-modal {
      background: white; border-radius: 16px; width: 90%; max-width: 440px;
      padding: 28px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
      transform: scale(0.95); transition: transform 0.25s ease;
    }
    .email-modal-overlay.active .email-modal { transform: scale(1); }
  `;
  document.head.appendChild(style);

  // We removed the useless "Default client/Outlook" option entirely as requested!
  const modalHTML = `
    <div class="email-modal" role="dialog" aria-modal="true">
      <div class="flex justify-between items-start mb-4">
        <h3 class="text-lg font-bold text-gray-900 font-heading">How would you like to email us?</h3>
        <button id="close-email-modal" class="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <p class="text-sm text-gray-500 mb-6 leading-relaxed">
        Choose your preferred method below to get in touch with us at <span class="font-semibold text-gray-800">${RECIPIENT}</span>:
      </p>
      
      <div class="space-y-3">
        <!-- Option 1: Gmail (100% Free, opens instant compose tab) -->
        <a id="email-opt-gmail" href="#" target="_blank" class="flex items-center gap-3 w-full p-3.5 border border-gray-100 hover:border-blue-200 rounded-xl hover:bg-blue-50/50 transition text-left group">
          <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-105 transition">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          </div>
          <div>
            <div class="text-sm font-bold text-gray-800">Open in Gmail</div>
            <div class="text-xs text-gray-500">Redirects to browser compose tab</div>
          </div>
        </a>

        <!-- Option 2: Copy Email (Universal fallback option) -->
        <button id="email-opt-copy" class="flex items-center gap-3 w-full p-3.5 border border-gray-100 hover:border-blue-200 rounded-xl hover:bg-blue-50/50 transition text-left group">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
            <svg id="copy-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
          </div>
          <div>
            <div id="copy-title" class="text-sm font-bold text-gray-800">Copy Email Address</div>
            <div id="copy-desc" class="text-xs text-gray-500">Copy to your system clipboard</div>
          </div>
        </button>
      </div>
    </div>
  `;

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'email-modal-overlay';
  modalOverlay.innerHTML = modalHTML;
  document.body.appendChild(modalOverlay);

  const closeBtn = document.getElementById('close-email-modal');
  const optGmail = document.getElementById('email-opt-gmail');
  const optCopy = document.getElementById('email-opt-copy');
  const copyTitle = document.getElementById('copy-title');
  const copyDesc = document.getElementById('copy-desc');

  function openEmailModal(emailAddr) {
    const encEmail = encodeURIComponent(emailAddr);
    // Directly pre-compose an email to your recipient with custom visual redirection
    optGmail.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encEmail}`;
    
    optCopy.onclick = function() {
      const tempInput = document.createElement('textarea');
      tempInput.value = emailAddr;
      tempInput.style.position = 'fixed';
      tempInput.style.top = '0';
      tempInput.style.left = '0';
      tempInput.style.opacity = '0';
      document.body.appendChild(tempInput);
      tempInput.select();
      
      try {
        document.execCommand('copy');
        copyTitle.textContent = 'Copied!';
        copyTitle.className = 'text-sm font-bold text-emerald-600';
        copyDesc.textContent = 'Ready to paste';
        setTimeout(() => {
          copyTitle.textContent = 'Copy Email Address';
          copyTitle.className = 'text-sm font-bold text-gray-800';
          copyDesc.textContent = 'Copy to your system clipboard';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
      document.body.removeChild(tempInput);
    };

    modalOverlay.classList.add('active');
  }

  function closeEmailModal() {
    modalOverlay.classList.remove('active');
  }

  closeBtn.addEventListener('click', closeEmailModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeEmailModal();
  });

  document.addEventListener('click', function (e) {
    const targetLink = e.target.closest('a[href^="mailto:"]');
    if (targetLink) {
      e.preventDefault();
      const mailAddress = targetLink.getAttribute('href').replace('mailto:', '');
      openEmailModal(mailAddress || RECIPIENT);
    }
  });


  /* ── STREAMING_CHUNK:Listening to form submit and packaging payload... ────────────────────────────────────────── */

  if (!form) return;

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const name    = form.querySelector('#name').value.trim();
    const email   = form.querySelector('#email').value.trim();
    const subject = form.querySelector('#subject').value.trim();
    const message = form.querySelector('#message').value.trim();

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

    // Packages distinct sender identity attributes for Google Apps Script
    const payload = {
      to: RECIPIENT,
      senderName: name,
      senderEmail: email,
      replyTo: `${name} <${email}>`,
      subject: subject
        ? `[Yacob Digital] ${subject}`
        : `[Yacob Digital] New enquiry from ${name}`,
      html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>New Enquiry</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          
          <tr>
            <td style="background-color:#1a73e8;padding:24px 30px;text-align:left;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Yacob Digital</span>
                    <h1 style="margin:6px 0 0 0;color:#ffffff;font-size:20px;font-weight:500;line-height:1.2;">New website enquiry</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:30px;background-color:#ffffff;">
              <p style="margin:0 0 20px 0;font-size:14px;color:#3c4043;line-height:1.5;">
                You have received a new contact submission from your website portfolio. Details of the message are provided below:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border:1px solid #dadce0;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" style="vertical-align:middle;">
                          <div style="width:38px;height:38px;border-radius:50%;background-color:#1a73e8;text-align:center;color:#ffffff;font-weight:bold;font-size:16px;line-height:38px;">
                            ${escHtml(name.charAt(0).toUpperCase())}
                          </div>
                        </td>
                        <td style="vertical-align:middle;padding-left:12px;">
                          <div style="font-size:14px;font-weight:700;color:#202124;margin-bottom:2px;">${escHtml(name)}</div>
                          <div style="font-size:13px;color:#1a73e8;">
                            <a href="mailto:${escHtml(email)}" style="color:#1a73e8;text-decoration:none;">${escHtml(email)}</a>
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:700;color:#70757a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Subject</div>
                    <div style="font-size:14px;font-weight:500;color:#202124;">${subject ? escHtml(subject) : 'No subject specified'}</div>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:700;color:#70757a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Message</div>
                    <div style="background-color:#f8f9fa;border-left:4px solid #1a73e8;padding:16px 18px;font-size:14px;line-height:1.6;color:#3c4043;white-space:pre-wrap;border-radius:0 4px 4px 0;">${escHtml(message)}</div>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <a href="mailto:${escHtml(email)}?subject=Re:%20${encodeURIComponent(subject || 'Your enquiry')}" style="display:inline-block;background-color:#1a73e8;color:#ffffff;font-size:13px;font-weight:500;text-decoration:none;padding:10px 24px;border-radius:4px;box-shadow:0 1px 2px 0 rgba(60,64,67,0.3);">Reply directly</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f8f9fa;border-top:1px solid #e0e0e0;padding:20px 30px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#70757a;line-height:1.5;">
                This automatic system email was generated by the contact handler at <strong>yacobdigital.com</strong>.<br/>
                &copy; ${new Date().getFullYear()} Yacob Digital · <a href="mailto:envizionupdates@gmail.com" style="color:#70757a;text-decoration:underline;">envizionupdates@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
      text: `Name: ${name}\nEmail: ${email}\n${subject ? 'Subject: ' + subject + '\n' : ''}\nMessage:\n${message}`,
    };

    try {
      fetch(APPS_SCRIPT_URL, {
        method:  'POST',
        mode:    'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        keepalive: true,
      });

      showStatus("Enquiry sent! We'll get back to you soon.", 'success');
      form.reset();

    } catch (err) {
      console.error('[contact-submit]', err);
      showStatus(
        'Could not send. Please email envizionupdates@gmail.com directly.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  });

  /* ── STREAMING_CHUNK:Defining status and text utility helpers... ───────────────────────────────────────── */

  function setLoading(on) {
    btn.disabled    = on;
    btn.textContent = on ? 'Sending…' : 'Send Enquiry';
    btn.style.opacity = on ? '0.7' : '';
    btn.style.cursor  = on ? 'not-allowed' : '';
  }

  function showStatus(msg, type) {
    status.textContent = msg;
    status.className   = 'mt-4 text-xs font-medium text-center';
    const colours = { success: 'text-emerald-600', error: 'text-red-500', info: 'text-gray-400' };
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