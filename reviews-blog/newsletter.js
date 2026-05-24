(function () {
  const FIREBASE_VERSION = '12.7.0';
  let firebaseReady;

  const css = `
    .signup-card {
      max-width: 1200px;
      margin: 2rem auto;
      width: calc(100% - 4rem);
      background: #fff;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 16px;
      padding: 1.25rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
    }
    .signup-inner {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
      gap: 1.25rem;
      align-items: center;
    }
    .signup-copy span {
      display: block;
      color: #1d4ed8;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      margin-bottom: 0.35rem;
    }
    .signup-copy h2 {
      color: #0f172a;
      font-size: 1.25rem;
      line-height: 1.25;
      margin: 0 0 0.35rem;
      letter-spacing: -0.4px;
    }
    .signup-copy p {
      color: #475569;
      font-size: 0.9rem;
      line-height: 1.55;
      margin: 0;
      font-weight: 500;
    }
    .signup-form { display: grid; gap: 0.75rem; }
    .signup-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.65rem;
    }
    .signup-name-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .signup-form input[type="email"],
    .signup-form input[type="text"] {
      width: 100%;
      border: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 10px;
      padding: 0.8rem 0.95rem;
      font: inherit;
      color: #0f172a;
      outline: none;
      background: #f8fafc;
    }
    .signup-form input[type="email"]:focus,
    .signup-form input[type="text"]:focus {
      border-color: #4285F4;
      box-shadow: 0 0 0 4px rgba(66, 133, 244, 0.14);
      background: #fff;
    }
    .signup-form button {
      border: 0;
      border-radius: 10px;
      padding: 0.8rem 1rem;
      background: linear-gradient(135deg, #4285F4, #9b51e0);
      color: #fff;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
      white-space: nowrap;
    }
    .signup-options {
      display: flex;
      flex-wrap: wrap;
      gap: 0.55rem;
    }
    .signup-options label {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: #334155;
      font-size: 0.82rem;
      font-weight: 700;
      background: #f8fafc;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 999px;
      padding: 0.42rem 0.72rem;
      cursor: pointer;
    }
    .signup-status {
      min-height: 1.2rem;
      color: #10a37f;
      font-size: 0.82rem;
      font-weight: 700;
    }
    @media (max-width: 768px) {
      .signup-card { width: calc(100% - 2.5rem); margin: 1.5rem auto; }
      .signup-inner, .signup-row, .signup-name-row { grid-template-columns: 1fr; }
      .signup-form button { width: 100%; }
    }
  `;

  function hasFirebaseConfig() {
    const config = window.ENVIZION_FIREBASE_CONFIG || {};
    return Boolean(config.apiKey && config.projectId && !String(config.apiKey).includes('PASTE_'));
  }

  async function getFirebase() {
    if (!firebaseReady) {
      firebaseReady = Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`)
      ]).then(([appModule, firestoreModule]) => {
        const app = appModule.getApps().length
          ? appModule.getApps()[0]
          : appModule.initializeApp(window.ENVIZION_FIREBASE_CONFIG);
        const db = firestoreModule.getFirestore(app);
        return { db, firestoreModule };
      });
    }
    return firebaseReady;
  }

  function normalizedEmail(email) {
    return email.trim().toLowerCase();
  }

  function subscriberId(email) {
    return normalizedEmail(email).replace(/[^a-z0-9._-]/g, '_');
  }

  function ensureStyles() {
    if (document.getElementById('newsletter-styles')) return;
    const style = document.createElement('style');
    style.id = 'newsletter-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function renderSignup(slot) {
    if (slot.dataset.newsletterReady === 'true') return;
    slot.dataset.newsletterReady = 'true';

    const saved = (() => {
      try { return JSON.parse(localStorage.getItem('envizion_signup') || '{}'); }
      catch (e) { return {}; }
    })();

    const context = slot.dataset.context || 'updates';
    const title = context === 'reviews'
      ? 'Get new review alerts'
      : context === 'blog'
        ? 'Get new blog and news alerts'
        : 'Get new gaming updates';

    slot.innerHTML = `
      <section class="signup-card" aria-label="Email signup">
        <div class="signup-inner">
          <div class="signup-copy">
            <span>Optional signup</span>
            <h2>${title}</h2>
            <p>Choose what you want to hear about. Blog posts, game reviews, or both.</p>
          </div>
          <form class="signup-form" data-signup-form>
            <div class="signup-name-row">
              <input type="text" name="firstName" autocomplete="given-name" placeholder="First name" value="${saved.firstName || ''}">
              <input type="text" name="lastName" autocomplete="family-name" placeholder="Last name" value="${saved.lastName || ''}">
            </div>
            <div class="signup-row">
              <input type="email" name="email" autocomplete="email" placeholder="Email address" value="${saved.email || ''}" required>
              <button type="submit">Sign up</button>
            </div>
            <div class="signup-options">
              <label><input type="checkbox" name="topics" value="blogs" ${(saved.topics || []).includes('blogs') ? 'checked' : ''}> Blogs</label>
              <label><input type="checkbox" name="topics" value="reviews" ${(saved.topics || []).includes('reviews') ? 'checked' : ''}> Game reviews</label>
            </div>
            <div class="signup-status" aria-live="polite"></div>
          </form>
        </div>
      </section>
    `;
  }

  function initNewsletter() {
    const slots = document.querySelectorAll('[data-newsletter-signup]');
    if (!slots.length) return;
    ensureStyles();
    slots.forEach(renderSignup);
  }

  document.addEventListener('submit', async (event) => {
    const form = event.target.closest('[data-signup-form]');
    if (!form) return;
    event.preventDefault();

    const email = normalizedEmail(form.email.value);
    const firstName = form.firstName?.value.trim() || '';
    const lastName = form.lastName?.value.trim() || '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ');
    const topics = Array.from(form.querySelectorAll('input[name="topics"]:checked')).map((input) => input.value);
    const status = form.querySelector('.signup-status');
    const button = form.querySelector('button[type="submit"]');

    if (!topics.length) {
      status.style.color = '#dc2626';
      status.textContent = 'Choose blogs, game reviews, or both.';
      return;
    }

    const payload = {
      email,
      firstName,
      lastName,
      displayName,
      topics,
      sourcePage: window.location.pathname.split('/').pop() || 'reviews-blog/index.html',
      sourceUrl: window.location.href,
      updatedAtLocal: new Date().toISOString()
    };

    localStorage.setItem('envizion_signup', JSON.stringify(payload));

    if (!hasFirebaseConfig()) {
      status.style.color = '#d97706';
      status.textContent = 'Saved locally. Add your Firebase config to save signups online.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Saving...';

    try {
      if (window.EnvizionNotifications) {
        await window.EnvizionNotifications.upsertSubscriber({
          email,
          firstName,
          lastName,
          displayName,
          topics,
          provider: 'inline-email',
          sourcePage: payload.sourcePage
        });
      } else {
        const { db, firestoreModule } = await getFirebase();
        const { doc, setDoc, serverTimestamp } = firestoreModule;
        await setDoc(doc(db, 'newsletter_subscribers', subscriberId(email)), {
          ...payload,
          status: 'active',
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      status.style.color = '#10a37f';
      status.textContent = `Saved. You selected ${topics.join(' and ')} updates.`;
    } catch (error) {
      status.style.color = '#dc2626';
      status.textContent = 'Firebase could not save this yet. Check config and Firestore rules.';
      console.error(error);
    } finally {
      button.disabled = false;
      button.textContent = 'Sign up';
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsletter);
  } else {
    initNewsletter();
  }

  window.initNewsletterSignup = initNewsletter;
})();
