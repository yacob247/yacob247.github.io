(function(){
  const FIREBASE_APP_URL = 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js';
  const FIREBASE_AUTH_URL = 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js';
  const FIREBASE_FIRESTORE_URL = 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore-compat.js';
  const REQUIRED_FIREBASE_KEYS = ['apiKey','authDomain','projectId','appId'];

  function getLS(key, fallback = '') {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  }

  function isEnabled(key, fallback = false) {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value === 'true';
  }

  function normalizeFirebaseConfigInput(input) {
    if(input && typeof input === 'object') {
      REQUIRED_FIREBASE_KEYS.forEach(key => {
        if(!input[key]) throw new Error('Firebase config is missing "' + key + '".');
      });
      return input;
    }
    let text = String(input || '').trim();
    if(!text) throw new Error('Paste your Firebase web app config first.');
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if(firstBrace >= 0 && lastBrace > firstBrace) text = text.slice(firstBrace, lastBrace + 1);
    text = text
      .replace(/^\s*(const|let|var)\s+firebaseConfig\s*=\s*/i, '')
      .replace(/;\s*$/, '')
      .replace(/([{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, '$1');
    const parsed = JSON.parse(text);
    REQUIRED_FIREBASE_KEYS.forEach(key => {
      if(!parsed[key]) throw new Error('Firebase config is missing "' + key + '".');
    });
    return parsed;
  }

  function getFirebaseConfig() {
    const raw = getLS('Electroni_firebase_config');
    if(raw) {
      try { return normalizeFirebaseConfigInput(raw); }
      catch(e) { return null; }
    }
    if(window.ENVIZION_FIREBASE_CONFIG) {
      try { return normalizeFirebaseConfigInput(window.ENVIZION_FIREBASE_CONFIG); }
      catch(e) { return null; }
    }
    return null;
  }

  function hasFirebaseConfig() {
    return !!getFirebaseConfig();
  }

  function firebaseEnabled() {
    return isEnabled('Electroni_firebase_enabled', hasFirebaseConfig());
  }

  function emailEnabled() {
    return isEnabled('Electroni_firebase_email_enabled', hasFirebaseConfig());
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src="' + src + '"]');
      if(existing) {
        if(existing.dataset.loaded === 'true') resolve();
        else existing.addEventListener('load', resolve, {once:true});
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.dataset.loaded = 'false';
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = () => reject(new Error('Could not load Firebase scripts. Check your internet connection.'));
      document.head.appendChild(script);
    });
  }

  async function ensureFirebase() {
    if(!firebaseEnabled()) {
      throw new Error('Firebase Auth is not enabled in the admin panel.');
    }
    const config = getFirebaseConfig();
    if(!config) {
      throw new Error('Firebase config is missing or invalid. Update the owner login settings.');
    }
    await loadScript(FIREBASE_APP_URL);
    await loadScript(FIREBASE_AUTH_URL);
    if(!window.firebase) throw new Error('Firebase did not initialise correctly.');
    if(!firebase.apps.length) firebase.initializeApp(config);
    return firebase.auth();
  }

  async function ensureFirestore() {
    await ensureFirebase();
    await loadScript(FIREBASE_FIRESTORE_URL);
    if(!firebase.firestore) throw new Error('Firebase Firestore did not initialise correctly.');
    return firebase.firestore();
  }

  function providerReady(provider) {
    const hasConfig = !!getFirebaseConfig();
    if(provider === 'google') return hasConfig && firebaseEnabled() && isEnabled('Electroni_oauth_google_enabled', true);
    if(provider === 'microsoft') return hasConfig && firebaseEnabled() && isEnabled('Electroni_oauth_ms_enabled', false);
    return false;
  }

  function providerLabel(provider, fallback) {
    return getLS(provider === 'google' ? 'Electroni_oauth_google_label' : 'Electroni_oauth_ms_label', fallback);
  }

  function makeProvider(providerName) {
    if(providerName === 'google') {
      const provider = new firebase.auth.GoogleAuthProvider();
      getLS('Electroni_oauth_google_scopes', 'email profile').split(/\s+/).filter(Boolean).forEach(scope => {
        if(!['openid','email','profile'].includes(scope)) provider.addScope(scope);
      });
      provider.setCustomParameters({prompt:'select_account'});
      return provider;
    }
    if(providerName === 'microsoft') {
      const provider = new firebase.auth.OAuthProvider('microsoft.com');
      getLS('Electroni_oauth_ms_scopes', 'User.Read').split(/\s+/).filter(Boolean).forEach(scope => provider.addScope(scope));
      const tenant = getLS('Electroni_oauth_ms_tenant', '').trim();
      const params = {prompt:'select_account'};
      if(tenant) params.tenant = tenant;
      provider.setCustomParameters(params);
      return provider;
    }
    throw new Error('Unknown provider: ' + providerName);
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function mergeProfile(user, profile = {}, existing = {}) {
    const merged = {
      displayName: hasOwn(profile, 'displayName') ? profile.displayName : existing.displayName,
      firstName: hasOwn(profile, 'firstName') ? profile.firstName : existing.firstName,
      lastName: hasOwn(profile, 'lastName') ? profile.lastName : existing.lastName,
      role: hasOwn(profile, 'role') ? profile.role : existing.role,
      schoolCode: hasOwn(profile, 'schoolCode') ? profile.schoolCode : existing.schoolCode,
      state: hasOwn(profile, 'state') ? profile.state : existing.state,
      year: hasOwn(profile, 'year') ? profile.year : existing.year,
      subjects: hasOwn(profile, 'subjects') ? profile.subjects : existing.subjects,
      selectedSubjects: hasOwn(profile, 'selectedSubjects') ? profile.selectedSubjects : existing.selectedSubjects,
      paidSubjects: hasOwn(profile, 'paidSubjects') ? profile.paidSubjects : existing.paidSubjects,
      paymentStatus: hasOwn(profile, 'paymentStatus') ? profile.paymentStatus : existing.paymentStatus,
      subscriptionStatus: hasOwn(profile, 'subscriptionStatus') ? profile.subscriptionStatus : existing.subscriptionStatus,
      status: hasOwn(profile, 'status') ? profile.status : existing.status,
      approvalStatus: hasOwn(profile, 'approvalStatus') ? profile.approvalStatus : existing.approvalStatus
    };
    merged.displayName = merged.displayName || user.displayName || '';
    merged.firstName = merged.firstName || '';
    merged.lastName = merged.lastName || '';
    merged.role = merged.role || '';
    merged.schoolCode = merged.schoolCode || '';
    merged.state = merged.state || '';
    merged.year = merged.year || '';
    merged.selectedSubjects = Array.isArray(merged.selectedSubjects) && merged.selectedSubjects.length
      ? merged.selectedSubjects
      : (Array.isArray(merged.subjects) ? merged.subjects : []);
    merged.paidSubjects = Array.isArray(merged.paidSubjects) ? merged.paidSubjects : [];
    merged.subjects = Array.isArray(merged.subjects) && merged.subjects.length ? merged.subjects : merged.selectedSubjects;
    merged.paymentStatus = merged.paymentStatus || 'unpaid';
    merged.subscriptionStatus = merged.subscriptionStatus || 'pending_payment';
    merged.status = merged.status || merged.approvalStatus || 'pending';
    merged.approvalStatus = merged.approvalStatus || merged.status || 'pending';
    return merged;
  }

  function saveUser(user, providerName, mode, profile = {}) {
    const safeUser = {
      uid: user.uid,
      email: user.email || '',
      name: profile.displayName || user.displayName || '',
      photoURL: user.photoURL || '',
      provider: providerName,
      mode: mode || 'login',
      role: profile.role || '',
      schoolCode: profile.schoolCode || '',
      state: profile.state || '',
      year: profile.year || '',
      subjects: Array.isArray(profile.subjects) ? profile.subjects : [],
      selectedSubjects: Array.isArray(profile.selectedSubjects) ? profile.selectedSubjects : (Array.isArray(profile.subjects) ? profile.subjects : []),
      paidSubjects: Array.isArray(profile.paidSubjects) ? profile.paidSubjects : [],
      paymentStatus: profile.paymentStatus || 'unpaid',
      subscriptionStatus: profile.subscriptionStatus || 'pending_payment',
      status: profile.status || profile.approvalStatus || 'pending',
      approvalStatus: profile.approvalStatus || profile.status || 'pending',
      signedInAt: new Date().toISOString()
    };
    localStorage.setItem('Electroni_auth_user', JSON.stringify(safeUser));
  }

  function applicationIdFor(value) {
    return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  }

  function saveLocalApplication(payload) {
    try {
      const apps = JSON.parse(localStorage.getItem('electroni_applications') || '[]');
      const id = payload.id || applicationIdFor(payload.email || payload.uid || Date.now());
      const next = {
        ...payload,
        id,
        status: payload.status || 'pending',
        createdAtLocal: payload.createdAtLocal || new Date().toISOString(),
        updatedAtLocal: new Date().toISOString()
      };
      const index = apps.findIndex(item => item.id === id || (item.email && item.email === next.email));
      if(index >= 0) apps[index] = {...apps[index], ...next};
      else apps.unshift(next);
      localStorage.setItem('electroni_applications', JSON.stringify(apps));
    } catch(error) {
      console.warn('Electroni local application save skipped:', error);
    }
  }

  async function saveProfile(user, providerName, mode, profile = {}, options = {}) {
    let db = null;
    let existing = {};
    try { existing = JSON.parse(localStorage.getItem('Electroni_auth_user') || '{}') || {}; }
    catch(error) { existing = {}; }
    try {
      db = await ensureFirestore();
      if(options.preserveExisting) {
        const snap = await db.collection('Electroni_users').doc(user.uid).get();
        if(snap.exists) existing = snap.data() || {};
      }
    } catch(error) {
      console.warn('Electroni profile read skipped:', error);
    }

    const mergedProfile = mergeProfile(user, profile, existing);
    saveUser(user, providerName, mode, mergedProfile);
    if(mode === 'signup') {
      saveLocalApplication({
        id: applicationIdFor(user.email || user.uid),
        uid: user.uid || '',
        email: (user.email || '').toLowerCase(),
        displayName: mergedProfile.displayName,
        firstName: mergedProfile.firstName,
        lastName: mergedProfile.lastName,
        role: mergedProfile.role,
        schoolCode: mergedProfile.schoolCode,
        state: mergedProfile.state,
        year: mergedProfile.year,
        selectedSubjects: mergedProfile.selectedSubjects,
        paidSubjects: mergedProfile.paidSubjects,
        paymentStatus: mergedProfile.paymentStatus,
        subscriptionStatus: mergedProfile.subscriptionStatus,
        status: mergedProfile.status || 'pending',
        approvalStatus: mergedProfile.approvalStatus || mergedProfile.status || 'pending',
        provider: providerName
      });
    }

    try {
      if(!db) db = await ensureFirestore();
      const payload = {
        uid: user.uid,
        email: (user.email || '').toLowerCase(),
        displayName: mergedProfile.displayName,
        firstName: mergedProfile.firstName,
        lastName: mergedProfile.lastName,
        role: mergedProfile.role,
        schoolCode: mergedProfile.schoolCode,
        state: mergedProfile.state,
        year: mergedProfile.year,
        subjects: mergedProfile.subjects,
        selectedSubjects: mergedProfile.selectedSubjects,
        paidSubjects: mergedProfile.paidSubjects,
        paymentStatus: mergedProfile.paymentStatus,
        subscriptionStatus: mergedProfile.subscriptionStatus,
        status: mergedProfile.status || (mode === 'signup' ? 'pending' : ''),
        approvalStatus: mergedProfile.approvalStatus || mergedProfile.status || (mode === 'signup' ? 'pending' : ''),
        provider: providerName,
        sourcePage: location.pathname.split('/').pop() || 'Electroni',
        updatedAtLocal: new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('Electroni_users').doc(user.uid).set(payload, {merge:true});
      if(payload.email) {
        await db.collection('Electroni_users_by_email').doc(payload.email.replace(/[^a-z0-9._-]/g, '_')).set(payload, {merge:true});
      }
      if(mode === 'signup' && payload.email) {
        await db.collection('Electroni_applications').doc(applicationIdFor(payload.email)).set({
          ...payload,
          id: applicationIdFor(payload.email),
          status: payload.status || 'pending',
          approvalStatus: payload.approvalStatus || payload.status || 'pending',
          createdAtLocal: new Date().toISOString(),
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, {merge:true});
      }
    } catch(error) {
      console.warn('Electroni profile save skipped:', error);
    }
  }

  function redirectAfterAuth() {
    const redirect = getLS('Electroni_auth_success_redirect', 'electroni.html').trim() || 'electroni.html';
    window.location.href = redirect;
  }

  async function signInWithProvider(providerName, options = {}) {
    if(!providerReady(providerName)) {
      throw new Error(providerLabel(providerName, providerName) + ' login is not configured yet.');
    }
    const auth = await ensureFirebase();
    const result = await auth.signInWithPopup(makeProvider(providerName));
    const mode = options.mode || 'login';
    await saveProfile(result.user, providerName, mode, options.profile || {}, {preserveExisting: mode === 'login'});
    redirectAfterAuth();
    return result;
  }

  async function signInWithEmail(email, password) {
    if(!emailEnabled()) throw new Error('Firebase email/password auth is disabled.');
    const auth = await ensureFirebase();
    const result = await auth.signInWithEmailAndPassword(email, password);
    await saveProfile(result.user, 'password', 'login', {}, {preserveExisting:true});
    redirectAfterAuth();
    return result;
  }

  async function createAccountWithEmail(email, password, profile = {}) {
    if(!emailEnabled()) throw new Error('Firebase email/password auth is disabled.');
    const auth = await ensureFirebase();
    const result = await auth.createUserWithEmailAndPassword(email, password);
    if(profile.displayName && result.user && result.user.updateProfile) {
      await result.user.updateProfile({displayName: profile.displayName});
    }
    await saveProfile(result.user, 'password', 'signup', profile);
    redirectAfterAuth();
    return result;
  }

  async function signOutUser() {
    try {
      if(window.firebase && firebase.apps.length) await firebase.auth().signOut();
    } catch(error) {
      console.warn('Firebase sign-out skipped:', error);
    }
    localStorage.removeItem('Electroni_auth_user');
  }

  function applyAuthUI() {
    const socialWrap = document.querySelector('.social-btns');
    const socialButtons = Array.from(document.querySelectorAll('.social-btns .social-btn'));
    const googleBtn = document.querySelector('[data-provider="google"]') || document.querySelector('.social-btn[onclick*="Google"], .social-btn[onclick*="google"]') || socialButtons[0];
    const microsoftBtn = document.querySelector('[data-provider="microsoft"]') || document.querySelector('.social-btn[onclick*="Microsoft"], .social-btn[onclick*="microsoft"]') || socialButtons[1];
    const divider = document.querySelector('.divider');

    [
      {btn: googleBtn, provider:'google', fallback:'Continue with Google'},
      {btn: microsoftBtn, provider:'microsoft', fallback:'Continue with Microsoft'}
    ].forEach(item => {
      if(!item.btn) return;
      const ready = providerReady(item.provider);
      item.btn.hidden = !ready;
      item.btn.disabled = !ready;
      item.btn.title = ready ? item.fallback : 'Enable this provider in the admin panel';
      item.btn.onclick = () => window.socialLogin ? window.socialLogin(item.provider) : signInWithProvider(item.provider);
      const label = item.btn.querySelector('[data-editable]');
      if(label) label.textContent = providerLabel(item.provider, item.fallback);
    });

    const hasVisibleProvider = providerReady('google') || providerReady('microsoft');
    if(socialWrap) socialWrap.hidden = !hasVisibleProvider;
    if(divider && socialWrap) divider.hidden = !hasVisibleProvider;
  }

  window.ElectroniAuth = {
    normalizeFirebaseConfigInput,
    getFirebaseConfig,
    providerReady,
    signInWithProvider,
    signInWithEmail,
    createAccountWithEmail,
    signOut: signOutUser,
    applyAuthUI,
    isFirebaseEmailEnabled: () => emailEnabled() && firebaseEnabled() && !!getFirebaseConfig(),
    hasFirebaseConfig,
    saveProfile
  };
})();
