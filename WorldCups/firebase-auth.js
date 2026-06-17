// ============================================================================
// FIREBASE AUTH + GLOBAL LEADERBOARD (FULLY REAL-TIME)
// ============================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDLeM4MrsA1Q8zq7_QcQfTJKk049vOVOO4",
  authDomain: "envizionwork.firebaseapp.com",
  databaseURL: "https://envizionwork-default-rtdb.firebaseio.com",
  projectId: "envizionwork",
  storageBucket: "envizionwork.firebasestorage.app",
  messagingSenderId: "706251024837",
  appId: "1:706251024837:web:4c931733d3a9f430a703ac",
  measurementId: "G-9CL929H67Z"
};

const FIREBASE_IS_CONFIGURED = !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY_PLACEHOLDER");

// Use a fixed app-level ID consistent with your Firestore collection paths
const appId = (typeof __app_id !== 'undefined' && __app_id) ? __app_id : 'envizionwork';

let fbApp = null, fbAuth = null, fbDb = null, fbUser = null;
let _fbInitialised = false;
let leaderboardSnapshotUnsubscribe = null;

async function initFirebase() {
  // Guard: only run once per page load
  if (_fbInitialised) return;
  _fbInitialised = true;

  if (!FIREBASE_IS_CONFIGURED) {
    console.warn("[WorldCupHub] Firebase not configured — sign-in and global leaderboard disabled.");
    renderAuthUI();
    return;
  }

  try {
    const appMod  = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
    const authMod = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
    const fsMod   = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");

    // Prevent "already initialized" error when hot-reloading in dev
    const existingApps = appMod.getApps ? appMod.getApps() : [];
    fbApp  = existingApps.length ? existingApps[0] : appMod.initializeApp(FIREBASE_CONFIG);
    fbAuth = authMod.getAuth(fbApp);
    fbDb   = fsMod.getFirestore(fbApp);

    window.__fb = { authMod, fsMod };

    authMod.onAuthStateChanged(fbAuth, (user) => {
      fbUser = user;
      renderAuthUI();
      document.dispatchEvent(new CustomEvent("wc-auth-changed", { detail: { user } }));
    });

    // Real-time leaderboard stream
    const colRef = fsMod.collection(fbDb, "artifacts", appId, "public", "data", "leaderboard");
    leaderboardSnapshotUnsubscribe = fsMod.onSnapshot(colRef, (snap) => {
      const data = snap.docs.map(d => d.data());
      data.sort((a, b) => {
        if (b.best !== a.best) return b.best - a.best;
        return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
      });
      window.__cachedLeaderboard = data;
      document.dispatchEvent(new CustomEvent("wc-auth-changed", { detail: { user: fbUser } }));
    }, (err) => {
      console.error("[WorldCupHub] Real-time leaderboard stream error:", err);
    });

    renderAuthUI();
  } catch (err) {
    console.error("[WorldCupHub] Firebase failed to initialize:", err);
    renderAuthUI(true);
  }
}

async function signInWithGoogle() {
  if (!FIREBASE_IS_CONFIGURED || !window.__fb) { alert("Sign-in is not available yet."); return; }
  const { authMod } = window.__fb;
  const provider = new authMod.GoogleAuthProvider();
  try {
    await authMod.signInWithPopup(fbAuth, provider);
  } catch (err) {
    console.error("Sign-in failed:", err);
    alert("Sign-in failed: " + err.message);
  }
}

async function signOutUser() {
  if (!fbAuth || !window.__fb) return;
  const { authMod } = window.__fb;
  await authMod.signOut(fbAuth);
}

function renderAuthUI(errored = false) {
  const slot = document.getElementById("auth-slot");
  const chip = document.getElementById("user-chip");
  if (!slot) return;

  if (!FIREBASE_IS_CONFIGURED || errored) {
    slot.innerHTML = `<button class="btn" id="setup-needed-btn" title="Authentication Error">Connection Issue</button>`;
    document.getElementById("setup-needed-btn")?.addEventListener("click", () => {
      alert("Firebase initialisation failed. Check your network and console for details.");
    });
    return;
  }

  if (fbUser) {
    slot.innerHTML = "";
    if (chip) {
      chip.style.display = "flex";
      chip.innerHTML = `<img src="${fbUser.photoURL || ''}" alt="" style="width:24px;height:24px;border-radius:50%;margin-right:8px;"><span>${fbUser.displayName?.split(" ")[0] || "Player"}</span>`;
    }
    let signOutBtn = document.getElementById("sign-out-btn");
    if (!signOutBtn) {
      signOutBtn = document.createElement("button");
      signOutBtn.id = "sign-out-btn";
      signOutBtn.className = "btn";
      signOutBtn.textContent = "Sign out";
      signOutBtn.style.marginLeft = "8px";
      chip?.after(signOutBtn);
      signOutBtn.addEventListener("click", signOutUser);
    }
  } else {
    if (chip) chip.style.display = "none";
    document.getElementById("sign-out-btn")?.remove();
    slot.innerHTML = `<button class="btn btn-google" id="google-signin-btn" style="display:flex;align-items:center;gap:8px;">
      <svg width="16" height="16" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.4 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.9z"/>
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.5 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.4 5.1 29.5 3 24 3 16.3 3 9.7 7.4 6.3 14.7z"/>
        <path fill="#4CAF50" d="M24 45c5.4 0 10.2-1.9 14-5.4l-6.4-5.3C29.5 36.1 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 40.5 16.3 45 24 45z"/>
        <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.4 5.3C41.6 35.6 45 30.3 45 24c0-1.4-.1-2.7-.4-3.9z"/>
      </svg>
      Sign in with Google
    </button>`;
    document.getElementById("google-signin-btn")?.addEventListener("click", signInWithGoogle);
  }
}

// ---- Score submission -------------------------------------------------------

async function submitTriviaScore(score, total) {
  if (!FIREBASE_IS_CONFIGURED || !fbUser || !fbDb) return { ok: false, reason: "not-signed-in-or-configured" };
  const { fsMod } = window.__fb;
  try {
    const ref = fsMod.doc(fbDb, "artifacts", appId, "public", "data", "leaderboard", fbUser.uid);
    const existing = await fsMod.getDoc(ref);
    const prevBest = existing.exists() ? (existing.data().best || 0) : 0;
    await fsMod.setDoc(ref, {
      uid: fbUser.uid,
      name: fbUser.displayName || "Anonymous",
      photo: fbUser.photoURL || "",
      lastScore: score,
      total,
      best: Math.max(prevBest, score),
      updatedAt: fsMod.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  } catch (err) {
    console.error("Failed to submit score:", err);
    return { ok: false, reason: err.message };
  }
}

async function fetchLeaderboard(limitCount = 20) {
  if (window.__cachedLeaderboard) return window.__cachedLeaderboard.slice(0, limitCount);
  if (!FIREBASE_IS_CONFIGURED || !fbDb) return [];
  const { fsMod } = window.__fb;
  try {
    const colRef = fsMod.collection(fbDb, "artifacts", appId, "public", "data", "leaderboard");
    const snap = await fsMod.getDocs(colRef);
    const data = snap.docs.map(d => d.data());
    data.sort((a, b) => {
      if (b.best !== a.best) return b.best - a.best;
      return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
    });
    return data.slice(0, limitCount);
  } catch (err) {
    console.error("Failed to fetch leaderboard:", err);
    return [];
  }
}

// Public API
window.WCAuth = {
  initFirebase,
  signInWithGoogle,
  signOutUser,
  submitTriviaScore,
  fetchLeaderboard,
  get currentUser() { return fbUser; },
  get isConfigured() { return FIREBASE_IS_CONFIGURED; }
};

// Auto-init: single call, guarded against re-entry above
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFirebase);
} else {
  initFirebase();
}