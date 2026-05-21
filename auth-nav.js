import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const app = getApps().length
  ? getApps()[0]
  : initializeApp(window.ENVIZION_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

function subscriberId(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
}

function parseName(displayName) {
  const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ')
  };
}

function readLocalProfile(email) {
  const keys = ['envizion_signup', 'envizion_signup_pending', 'envizion_profile'];
  for (const key of keys) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      if (!value || !value.email || value.email.toLowerCase() !== email.toLowerCase()) continue;
      return {
        firstName: value.firstName || '',
        lastName: value.lastName || '',
        displayName: value.displayName || ''
      };
    } catch (error) {
      // Ignore malformed local data.
    }
  }
  return {};
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

async function getProfile(user) {
  const email = user.email || '';
  const authName = parseName(user.displayName);
  const local = readLocalProfile(email);
  const profile = {
    email,
    firstName: local.firstName || authName.firstName,
    lastName: local.lastName || authName.lastName,
    displayName: local.displayName || user.displayName || ''
  };

  if (profile.firstName || profile.lastName || !email) return profile;

  try {
    const snap = await getDoc(doc(db, 'newsletter_subscribers', subscriberId(email)));
    if (snap.exists()) {
      const data = snap.data();
      const storedName = parseName(data.displayName);
      profile.firstName = data.firstName || storedName.firstName || '';
      profile.lastName = data.lastName || storedName.lastName || '';
      profile.displayName = data.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(' ');
    }
  } catch (error) {
    console.warn('Envizion profile lookup skipped:', error);
  }

  return profile;
}

function ensureStyles() {
  if (document.getElementById('envizion-account-styles')) return;
  const style = document.createElement('style');
  style.id = 'envizion-account-styles';
  style.textContent = `
    .envizion-account { position: relative; display: inline-flex; align-items: center; }
    .envizion-account-button {
      display: inline-flex; align-items: center; gap: 0.55rem;
      min-height: 38px; border: 1px solid rgba(15,23,42,0.08);
      border-radius: 999px; padding: 0.42rem 0.85rem;
      background: linear-gradient(135deg, #4285F4, #9b51e0);
      color: #fff; font: inherit; font-size: 0.86rem; font-weight: 800;
      cursor: pointer; box-shadow: 0 4px 14px rgba(66,133,244,0.22);
      white-space: nowrap;
    }
    .envizion-account-button.is-guest {
      background: rgba(0,0,0,0.03); color: #475569;
      border-color: rgba(0,0,0,0.06); box-shadow: none;
      text-decoration: none;
    }
    .envizion-account-caret { font-size: 0.72rem; line-height: 1; opacity: 0.9; }
    .envizion-account-menu {
      position: absolute; top: calc(100% + 10px); right: 0; z-index: 1000;
      width: min(280px, calc(100vw - 24px));
      background: #fff; border: 1px solid rgba(15,23,42,0.1);
      border-radius: 12px; box-shadow: 0 18px 50px rgba(15,23,42,0.14);
      padding: 0.55rem; opacity: 0; transform: translateY(-4px);
      pointer-events: none; transition: all 0.18s ease;
    }
    .envizion-account.open .envizion-account-menu {
      opacity: 1; transform: translateY(0); pointer-events: auto;
    }
    .envizion-account-name {
      padding: 0.7rem 0.75rem 0.6rem; color: #0f172a;
      font-size: 0.92rem; font-weight: 900; line-height: 1.25;
    }
    .envizion-account-email {
      display: block; margin-top: 0.18rem; color: #64748b;
      font-size: 0.76rem; font-weight: 700; word-break: break-word;
    }
    .envizion-account-link {
      display: flex; align-items: center; justify-content: space-between; gap: 0.7rem;
      width: 100%; border: 0; border-radius: 8px; padding: 0.7rem 0.75rem;
      background: transparent; color: #334155; font: inherit; font-size: 0.86rem;
      font-weight: 800; text-decoration: none; cursor: pointer; text-align: left;
    }
    .envizion-account-link:hover { background: #f8fafc; color: #0f172a; }
    .envizion-account-link.danger { color: #b91c1c; }
    @media (max-width: 768px) {
      .envizion-account-button { max-width: 42vw; overflow: hidden; text-overflow: ellipsis; }
      .envizion-account-menu { right: -4px; }
    }
  `;
  document.head.appendChild(style);
}

function getNavTarget() {
  const nav = document.querySelector('body > nav, nav');
  if (!nav) return null;
  return nav.querySelector('.nav-actions') || document.getElementById('nav-stats')?.parentElement || nav;
}

function getOrCreateAccount() {
  ensureStyles();
  let account = document.getElementById('envizion-account');
  if (account) return account;

  const target = getNavTarget();
  if (!target) return null;

  account = document.createElement('div');
  account.id = 'envizion-account';
  account.className = 'envizion-account';
  target.appendChild(account);
  return account;
}

function fullName(profile) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ').trim();
}

function renderGuest(account) {
  account.className = 'envizion-account';
  account.innerHTML = `
    <button class="envizion-account-button is-guest" type="button" aria-expanded="false" aria-haspopup="true">
      <span>Account</span>
      <span class="envizion-account-caret">v</span>
    </button>
    <div class="envizion-account-menu" role="menu">
      <a class="envizion-account-link" href="login.html" role="menuitem">Sign in <span>--></span></a>
      <a class="envizion-account-link" href="unsubscribe.html" role="menuitem">Unsubscribe <span>--></span></a>
    </div>
  `;

  const button = account.querySelector('.envizion-account-button');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const isOpen = account.classList.toggle('open');
    button.setAttribute('aria-expanded', String(isOpen));
  });
}

function renderUser(account, profile) {
  const name = fullName(profile) || profile.displayName || 'Envizion member';
  const shortName = profile.firstName || name.split(/\s+/)[0] || 'Member';
  const unsubscribeHref = profile.email
    ? `unsubscribe.html?id=${encodeURIComponent(subscriberId(profile.email))}`
    : 'unsubscribe.html';

  account.className = 'envizion-account';
  account.innerHTML = `
    <button class="envizion-account-button" type="button" aria-expanded="false" aria-haspopup="true">
      <span>Hi, ${escapeHtml(shortName)}</span>
      <span class="envizion-account-caret">v</span>
    </button>
    <div class="envizion-account-menu" role="menu">
      <div class="envizion-account-name">
        ${escapeHtml(name)}
        ${profile.email ? `<span class="envizion-account-email">${escapeHtml(profile.email)}</span>` : ''}
      </div>
      <a class="envizion-account-link" href="${unsubscribeHref}" role="menuitem">Unsubscribe <span>--></span></a>
      <button class="envizion-account-link danger" type="button" role="menuitem" data-sign-out>Sign out <span>--></span></button>
    </div>
  `;

  const button = account.querySelector('.envizion-account-button');
  button.addEventListener('click', (event) => {
    event.preventDefault();
    const isOpen = account.classList.toggle('open');
    button.setAttribute('aria-expanded', String(isOpen));
  });

  account.querySelector('[data-sign-out]').addEventListener('click', async () => {
    await signOut(auth);
    window.location.reload();
  });
}

document.addEventListener('click', (event) => {
  const account = document.getElementById('envizion-account');
  if (!account || account.contains(event.target)) return;
  account.classList.remove('open');
  account.querySelector('.envizion-account-button')?.setAttribute('aria-expanded', 'false');
});

onAuthStateChanged(auth, async (user) => {
  const account = getOrCreateAccount();
  if (!account) return;

  if (!user) {
    renderGuest(account);
    return;
  }

  const profile = await getProfile(user);
  renderUser(account, profile);
});
