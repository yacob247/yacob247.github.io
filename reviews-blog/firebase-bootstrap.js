/* Firebase loader shared by the review signup and sign-in pages. */
(function () {
  "use strict";
  const VERSION = "10.13.0";
  const BASE = `https://www.gstatic.com/firebasejs/${VERSION}`;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load Firebase: ${src}`));
      document.head.appendChild(script);
    });
  }

  function compatApi() {
    const app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(window.ENVIZION_FIREBASE_CONFIG);
    const auth = window.firebase.auth();
    const db = window.firebase.firestore();
    const authMod = {
      getAuth: () => auth,
      GoogleAuthProvider: window.firebase.auth.GoogleAuthProvider,
      OAuthProvider: window.firebase.auth.OAuthProvider,
      isSignInWithEmailLink: (instance, url) => instance.isSignInWithEmailLink(url),
      signInWithPopup: (instance, provider) => instance.signInWithPopup(provider),
      signInWithEmailAndPassword: (instance, email, password) => instance.signInWithEmailAndPassword(email, password),
      signInWithEmailLink: (instance, email, url) => instance.signInWithEmailLink(email, url),
      sendSignInLinkToEmail: (instance, email, settings) => instance.sendSignInLinkToEmail(email, settings),
      sendPasswordResetEmail: (instance, email) => instance.sendPasswordResetEmail(email),
      updateProfile: (user, profile) => user.updateProfile(profile)
    };
    const firestore = {
      doc: (instance, collection, id) => instance.collection(collection).doc(id),
      setDoc: (reference, data, options) => reference.set(data, options),
      serverTimestamp: () => window.firebase.firestore.FieldValue.serverTimestamp()
    };
    return { app, auth, authMod, db, firestore };
  }

  window.envizionFirebase = (async function () {
    try {
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`${BASE}/firebase-app.js`),
        import(`${BASE}/firebase-auth.js`),
        import(`${BASE}/firebase-firestore.js`)
      ]);
      let app;
      try { app = appMod.initializeApp(window.ENVIZION_FIREBASE_CONFIG); }
      catch { app = appMod.getApps()[0]; }
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      return { app, auth, authMod, db, firestore: fsMod };
    } catch (moduleError) {
      await loadScript(`${BASE}/firebase-app-compat.js`);
      await loadScript(`${BASE}/firebase-auth-compat.js`);
      await loadScript(`${BASE}/firebase-firestore-compat.js`);
      return compatApi();
    }
  }());
}());
