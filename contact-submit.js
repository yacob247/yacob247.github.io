/**
 * contact-submit.js
 * Yacob Digital contact form — Firebase Google Auth verification + Apps Script submission.
 * Users must verify with a real Google account before sending. No sign-in wall —
 * just a one-click Google popup that confirms identity, then the form submits.
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

const firebaseConfig = {
  apiKey:            "AIzaSyDLeM4MrsA1Q8zq7_QcQfTJKk049vOVOO4",
  authDomain:        "envizionwork.firebaseapp.com",
  databaseURL:       "https://envizionwork-default-rtdb.firebaseio.com",
  projectId:         "envizionwork",
  storageBucket:     "envizionwork.firebasestorage.app",
  messagingSenderId: "706251024837",
  appId:             "1:706251024837:web:4c931733d3a9f430a703ac",
  measurementId:     "G-9CL929H67Z"
};

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxKxmcEkwjl4GkNnvrEC1ee_hzkD06WyigpO1Ab1jIpgjUqVrDadscTh1bnrec1hSO3/exec';
const RECIPIENT       = 'envizionupdates@gmail.com';

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const provider = new GoogleAuthProvider();

// ── DOM refs ────────────────────────────────────────────────────────────────
const form   = document.getElementById('contact-form');
const btn    = document.getElementById('submit-btn');
const status = document.getElementById('form-status');

// ── Email modal (for mailto: links on the page) ──────────────────────────────
const style = document.createElement('style');
style.textContent = `
  .email-modal-overlay {
    position:fixed;inset:0;background:rgba(15,23,42,0.6);
    backdrop-filter:blur(4px);z-index:9999;display:flex;
    align-items:center;justify-content:center;opacity:0;
    transition:opacity 0.25s ease;pointer-events:none;
  }
  .email-modal-overlay.active{opacity:1;pointer-events:auto;}
  .email-modal{
    background:white;border-radius:16px;width:90%;max-width:440px;
    padding:28px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1),0 10px 10px -5px rgba(0,0,0,0.04);
    transform:scale(0.95);transition:transform 0.25s ease;
  }
  .email-modal-overlay.active .email-modal{transform:scale(1);}

  /* Google verify banner */
  #google-verify-banner {
    display:flex;align-items:center;gap:12px;
    background:#f0f7ff;border:1px solid #bfdbfe;border-radius:10px;
    padding:14px 16px;margin-bottom:20px;
  }
  #google-verify-banner.verified {
    background:#f0fdf4;border-color:#bbf7d0;
  }
  #verify-avatar {
    width:36px;height:36px;border-radius:50%;object-fit:cover;display:none;
  }
  #verify-icon {
    width:36px;height:36px;border-radius:50%;background:#e0e7ff;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
  }
  #google-verify-btn {
    margin-left:auto;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;
    background:#2563eb;color:white;border:none;cursor:pointer;transition:background 0.15s;
    white-space:nowrap;
  }
  #google-verify-btn:hover{background:#1d4ed8;}
  #google-verify-btn.verified{background:#16a34a;cursor:default;}
`;
document.head.appendChild(style);

// ── Inject Google verify banner into the form ────────────────────────────────
if (form) {
  const banner = document.createElement('div');
  banner.id = 'google-verify-banner';
  banner.innerHTML = `
    <div id="verify-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    </div>
    <img id="verify-avatar" src="" alt=""/>
    <div id="verify-text">
      <div style="font-size:13px;font-weight:700;color:#1e3a5f;">Verify with Google</div>
      <div style="font-size:11px;color:#64748b;margin-top:1px;">Confirm you're a real person</div>
    </div>
    <button id="google-verify-btn" type="button">Verify</button>
  `;
  form.insertBefore(banner, form.firstChild);
}

// ── Mailto intercept modal ───────────────────────────────────────────────────
const modalOverlay = document.createElement('div');
modalOverlay.className = 'email-modal-overlay';
modalOverlay.innerHTML = `
  <div class="email-modal" role="dialog" aria-modal="true">
    <div class="flex justify-between items-start mb-4">
      <h3 class="text-lg font-bold text-gray-900 font-heading">How would you like to email us?</h3>
      <button id="close-email-modal" class="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <p class="text-sm text-gray-500 mb-6 leading-relaxed">
      Get in touch at <span class="font-semibold text-gray-800">${RECIPIENT}</span>:
    </p>
    <div class="space-y-3">
      <a id="email-opt-gmail" href="#" target="_blank" class="flex items-center gap-3 w-full p-3.5 border border-gray-100 hover:border-blue-200 rounded-xl hover:bg-blue-50/50 transition text-left group">
        <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-105 transition">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
        </div>
        <div>
          <div class="text-sm font-bold text-gray-800">Open in Gmail</div>
          <div class="text-xs text-gray-500">Opens Gmail compose in browser</div>
        </div>
      </a>
      <button id="email-opt-copy" class="flex items-center gap-3 w-full p-3.5 border border-gray-100 hover:border-blue-200 rounded-xl hover:bg-blue-50/50 transition text-left group">
        <div class="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
        </div>
        <div>
          <div id="copy-title" class="text-sm font-bold text-gray-800">Copy Email Address</div>
          <div id="copy-desc" class="text-xs text-gray-500">Copy to clipboard</div>
        </div>
      </button>
    </div>
  </div>
`;
document.body.appendChild(modalOverlay);

const closeBtn  = document.getElementById('close-email-modal');
const optGmail  = document.getElementById('email-opt-gmail');
const optCopy   = document.getElementById('email-opt-copy');
const copyTitle = document.getElementById('copy-title');
const copyDesc  = document.getElementById('copy-desc');

function openEmailModal(addr) {
  optGmail.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(addr)}`;
  optCopy.onclick = function () {
    navigator.clipboard.writeText(addr).catch(() => {
      const t = document.createElement('textarea');
      t.value = addr; t.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(t); t.select();
      document.execCommand('copy'); document.body.removeChild(t);
    });
    copyTitle.textContent = 'Copied!';
    copyTitle.className = 'text-sm font-bold text-emerald-600';
    copyDesc.textContent = 'Ready to paste';
    setTimeout(() => {
      copyTitle.textContent = 'Copy Email Address';
      copyTitle.className = 'text-sm font-bold text-gray-800';
      copyDesc.textContent = 'Copy to clipboard';
    }, 2000);
  };
  modalOverlay.classList.add('active');
}

closeBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });
document.addEventListener('click', e => {
  const link = e.target.closest('a[href^="mailto:"]');
  if (link) { e.preventDefault(); openEmailModal(link.getAttribute('href').replace('mailto:', '') || RECIPIENT); }
});

// ── Google verification logic ────────────────────────────────────────────────
if (!form) throw new Error('contact-form not found');

let verifiedUser = null; // { name, email, photoURL }

const verifyBtn    = document.getElementById('google-verify-btn');
const verifyBanner = document.getElementById('google-verify-banner');
const verifyText   = document.getElementById('verify-text');
const verifyAvatar = document.getElementById('verify-avatar');
const verifyIcon   = document.getElementById('verify-icon');

verifyBtn.addEventListener('click', async () => {
  if (verifiedUser) return; // already verified
  verifyBtn.textContent = 'Opening…';
  verifyBtn.disabled = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const user   = result.user;
    verifiedUser = { name: user.displayName, email: user.email, photoURL: user.photoURL };

    // Update banner to verified state
    verifyBanner.classList.add('verified');
    if (user.photoURL) {
      verifyAvatar.src = user.photoURL;
      verifyAvatar.style.display = 'block';
      verifyIcon.style.display   = 'none';
    }
    verifyText.innerHTML = `
      <div style="font-size:13px;font-weight:700;color:#15803d;">✓ Verified — ${escHtml(user.displayName)}</div>
      <div style="font-size:11px;color:#64748b;margin-top:1px;">${escHtml(user.email)}</div>
    `;
    verifyBtn.textContent = '✓ Done';
    verifyBtn.classList.add('verified');

    // Auto-fill name + email if fields are empty
    const nameField  = form.querySelector('#name');
    const emailField = form.querySelector('#email');
    if (!nameField.value.trim())  nameField.value  = user.displayName || '';
    if (!emailField.value.trim()) emailField.value = user.email || '';

  } catch (err) {
    verifyBtn.textContent = 'Verify';
    verifyBtn.disabled = false;
    if (err.code !== 'auth/popup-closed-by-user') {
      showStatus('Google verification failed. Please try again.', 'error');
    }
  }
});

// ── Form submission ──────────────────────────────────────────────────────────
form.addEventListener('submit', function (e) {
  e.preventDefault();

  const honeypot = form.querySelector('#honeypot')?.value;
  if (honeypot) return; // bot trap

  if (!verifiedUser) {
    showStatus('Please verify with Google first.', 'error');
    verifyBanner.style.outline = '2px solid #ef4444';
    setTimeout(() => verifyBanner.style.outline = '', 2000);
    return;
  }

  const name    = form.querySelector('#name').value.trim();
  const email   = form.querySelector('#email').value.trim();
  const subject = form.querySelector('#subject').value.trim();
  const message = form.querySelector('#message').value.trim();

  if (!name || !message) {
    showStatus('Please fill in your name and message.', 'error');
    return;
  }

  setLoading(true);
  showStatus('Sending…', 'info');

  const payload = {
    to:          RECIPIENT,
    senderName:  verifiedUser.name,
    senderEmail: verifiedUser.email,
    replyTo:     verifiedUser.email,
    subject:     subject ? `[Yacob Digital] ${subject}` : `[Yacob Digital] New enquiry from ${verifiedUser.name}`,
    text:        `Name: ${verifiedUser.name}\nEmail: ${verifiedUser.email}\n${subject ? 'Subject: ' + subject + '\n' : ''}\nMessage:\n${message}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>New Enquiry</title></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:30px 0;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background-color:#ffffff;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr>
          <td style="background-color:#1a73e8;padding:24px 30px;">
            <span style="color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Yacob Digital</span>
            <h1 style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:500;">New website enquiry</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:30px;background:#fff;">
            <p style="margin:0 0 20px;font-size:14px;color:#3c4043;line-height:1.5;">
              You received a new verified contact submission. The sender authenticated via Google.
            </p>
            <!-- Sender card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fa;border:1px solid #dadce0;border-radius:6px;margin-bottom:24px;">
              <tr><td style="padding:16px 20px;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="48" style="vertical-align:middle;">
                      ${verifiedUser.photoURL
                        ? `<img src="${escHtml(verifiedUser.photoURL)}" width="38" height="38" style="border-radius:50%;display:block;" alt=""/>`
                        : `<div style="width:38px;height:38px;border-radius:50%;background:#1a73e8;text-align:center;color:#fff;font-weight:bold;font-size:16px;line-height:38px;">${escHtml(verifiedUser.name.charAt(0).toUpperCase())}</div>`
                      }
                    </td>
                    <td style="vertical-align:middle;padding-left:12px;">
                      <div style="font-size:14px;font-weight:700;color:#202124;">
                        ${escHtml(verifiedUser.name)}
                        <span style="font-size:11px;font-weight:500;color:#34a853;margin-left:6px;">✓ Google Verified</span>
                      </div>
                      <div style="font-size:13px;margin-top:2px;">
                        <a href="https://mail.google.com/mail/?view=cm&amp;to=${encodeURIComponent(verifiedUser.email)}" style="color:#1a73e8;text-decoration:none;">${escHtml(verifiedUser.email)}</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <!-- Subject -->
            <div style="font-size:11px;font-weight:700;color:#70757a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Subject</div>
            <div style="font-size:14px;font-weight:500;color:#202124;margin-bottom:20px;">${subject ? escHtml(subject) : 'No subject specified'}</div>
            <!-- Message -->
            <div style="font-size:11px;font-weight:700;color:#70757a;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;">Message</div>
            <div style="background:#f8f9fa;border-left:4px solid #1a73e8;padding:16px 18px;font-size:14px;line-height:1.6;color:#3c4043;white-space:pre-wrap;border-radius:0 4px 4px 0;margin-bottom:28px;">${escHtml(message)}</div>
            <!-- Reply button -->
            <a href="https://mail.google.com/mail/?view=cm&amp;to=${encodeURIComponent(verifiedUser.email)}&amp;su=Re:%20${encodeURIComponent(subject || 'Your enquiry')}"
               style="display:inline-block;background:#1a73e8;color:#fff;font-size:13px;font-weight:500;text-decoration:none;padding:10px 24px;border-radius:4px;">Reply directly</a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  };

  // Encode as URL params — Apps Script reads these via e.parameter
  // This avoids CORS preflight while still delivering all fields
  const formData = new URLSearchParams();
  formData.append('to',          payload.to);
  formData.append('senderName',  payload.senderName);
  formData.append('senderEmail', payload.senderEmail);
  formData.append('replyTo',     payload.replyTo);
  formData.append('subject',     payload.subject);
  formData.append('text',        payload.text);
  formData.append('html',        payload.html);

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode:   'no-cors',
    body:   formData
  });

  showStatus("Enquiry sent! We'll get back to you soon.", 'success');
  form.reset();
  setLoading(false);

  // Reset verification state
  verifiedUser = null;
  verifyBanner.classList.remove('verified');
  verifyAvatar.style.display = 'none';
  verifyIcon.style.display   = '';
  verifyText.innerHTML = `
    <div style="font-size:13px;font-weight:700;color:#1e3a5f;">Verify with Google</div>
    <div style="font-size:11px;color:#64748b;margin-top:1px;">Confirm you're a real person</div>
  `;
  verifyBtn.textContent = 'Verify';
  verifyBtn.classList.remove('verified');
  verifyBtn.disabled = false;
});

// ── Helpers ──────────────────────────────────────────────────────────────────
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

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}