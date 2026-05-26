// firebase-app.js — Firestore integration (no localStorage anywhere)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore, collection, getDocs, addDoc, setDoc, doc,
  query, orderBy, limit, where, serverTimestamp, onSnapshot
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js';

const cfg = {
  apiKey: "AIzaSyDLeM4MrsA1Q8zq7_QcQfTJKk049vOVOO4",
  authDomain: "envizionwork.firebaseapp.com",
  projectId: "envizionwork",
  storageBucket: "envizionwork.firebasestorage.app",
  messagingSenderId: "706251024837",
  appId: "1:706251024837:web:4c931733d3a9f430a703ac",
  measurementId: "G-9CL929H67Z"
};

const app = initializeApp(cfg);
const db  = getFirestore(app);
try { getAnalytics(app); } catch(e) {}

/* ── helpers ─────────────────────────────────────────── */

// Save news items to Firestore (batch-safe: use source+guid as doc id)
export async function saveNewsItems(items) {
  const col = collection(db, 'news_cache');
  const ops = items.map(item => {
    const id = btoa((item.source + item.link).slice(0, 60)).replace(/[^a-zA-Z0-9]/g,'').slice(0,20);
    return setDoc(doc(col, id), { ...item, savedAt: serverTimestamp() }, { merge: true });
  });
  await Promise.allSettled(ops);
}

// Get cached news from Firestore
export async function getCachedNews(limitN = 60) {
  const q = query(collection(db, 'news_cache'), orderBy('pubDate', 'desc'), limit(limitN));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// Save a profile view / page view stat
export async function logPageView(profileId) {
  const ref = doc(db, 'profile_views', profileId);
  await setDoc(ref, { profileId, views: 1, updatedAt: serverTimestamp() }, { merge: true });
}

// Save newsletter subscription
export async function saveSubscription(email, name = '') {
  const id = btoa(email).replace(/[^a-zA-Z0-9]/g,'').slice(0,24);
  await setDoc(doc(db, 'subscribers', id), {
    email, name, subscribedAt: serverTimestamp(), active: true
  }, { merge: true });
}

// Get subscriptions (for admin)
export async function getSubscribers() {
  const snap = await getDocs(collection(db, 'subscribers'));
  return snap.docs.map(d => d.data());
}

// Save search query for trending calculation
export async function logSearch(query) {
  await addDoc(collection(db, 'searches'), { query, ts: serverTimestamp() });
}

// Get trending searches from last 24h
export async function getTrendingSearches(limitN = 20) {
  try {
    const since = new Date(Date.now() - 86400000);
    const q = query(collection(db, 'searches'), orderBy('ts', 'desc'), limit(200));
    const snap = await getDocs(q);
    const counts = {};
    snap.docs.forEach(d => {
      const { query: qry } = d.data();
      counts[qry] = (counts[qry] || 0) + 1;
    });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,limitN).map(([q,c])=>({query:q,count:c}));
  } catch { return []; }
}

// Save AI research result
export async function saveResearch(topic, content) {
  const id = btoa(topic).replace(/[^a-zA-Z0-9]/g,'').slice(0,24);
  await setDoc(doc(db, 'research_cache', id), {
    topic, content, createdAt: serverTimestamp()
  }, { merge: true });
}

// Get research from cache
export async function getResearch(topic) {
  try {
    const id = btoa(topic).replace(/[^a-zA-Z0-9]/g,'').slice(0,24);
    const snap = await getDocs(query(collection(db, 'research_cache'), where('topic','==',topic), limit(1)));
    if (!snap.empty) return snap.docs[0].data();
  } catch { return null; }
  return null;
}

// Watch live news stream
export function watchNews(callback, limitN = 40) {
  const q = query(collection(db, 'news_cache'), orderBy('pubDate', 'desc'), limit(limitN));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

export { db, app };