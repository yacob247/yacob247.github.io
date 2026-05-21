(function () {
  const FIREBASE_VERSION = '10.13.0';
  const BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const DEFAULT_MAIL_APP_URL = 'https://script.google.com/macros/s/AKfycbyYsr03oyOeBTaI2wImBWVjbsVwR0LHYT_6o0R6-vUuZVb9VmjtWiYFZgSduppvPhpj/exec';
  const SUBSCRIBERS_COLLECTION = 'newsletter_subscribers';
  const EVENTS_COLLECTION = 'notification_events';
  const DELIVERY_COLLECTION = 'notification_deliveries';

  let firebaseReady;

  function getFirebase() {
    if (!firebaseReady) {
      firebaseReady = Promise.all([
        import(`${BASE}/firebase-app.js`),
        import(`${BASE}/firebase-firestore.js`),
        import(`${BASE}/firebase-auth.js`)
      ]).then(async ([appMod, fsMod, authMod]) => {
        let app;
        try {
          app = appMod.initializeApp(window.ENVIZION_FIREBASE_CONFIG);
        } catch (error) {
          app = appMod.getApps()[0];
        }
        const auth = authMod.getAuth(app);
        if (typeof auth.authStateReady === 'function') {
          await auth.authStateReady();
        }
        return { db: fsMod.getFirestore(app), firestore: fsMod, auth };
      });
    }
    return firebaseReady;
  }

  function subscriberId(email) {
    return String(email || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '_');
  }

  function normalizeTopics(topics) {
    if (!Array.isArray(topics) || !topics.length) return ['blogs', 'reviews'];
    if (topics.includes('both')) return ['blogs', 'reviews'];
    return [...new Set(topics.filter((topic) => ['blogs', 'reviews'].includes(topic)))];
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

  function absoluteUrl(path) {
    return new URL(path, window.location.origin).href;
  }

  function getContentUrl(content) {
    if (content.type === 'blog') {
      const id = content.id || content.slug;
      return absoluteUrl(`blog-post.html?id=${encodeURIComponent(id)}`);
    }
    if (content.url) return absoluteUrl(content.url);
    return absoluteUrl(`game.html?id=${encodeURIComponent(content.id)}`);
  }

  function getUnsubscribeUrl(subscriber) {
    const id = subscriberId(subscriber.email);
    return absoluteUrl(`unsubscribe.html?id=${encodeURIComponent(id)}`);
  }

  function getTopicForContent(content) {
    return content.type === 'blog' ? 'blogs' : 'reviews';
  }

  function getEventId(content) {
    const key = content.type === 'blog' ? content.slug : content.id;
    return `${content.type}_${key}`;
  }

  function getMailAppUrl() {
    return window.ENVIZION_MAIL_APP_URL || DEFAULT_MAIL_APP_URL;
  }

  function isPermissionError(error) {
    return error && (
      error.code === 'permission-denied' ||
      /missing or insufficient permissions/i.test(error.message || '')
    );
  }

  function withPermissionContext(error, action) {
    if (!isPermissionError(error)) return error;
    return new Error(`${action} was blocked by Firestore rules. Firebase says: ${error.message}`);
  }

  function makeEmail(content, subscriber) {
    const isBlog = content.type === 'blog';
    const title = content.title || (isBlog ? 'New Envizion blog post' : 'New Envizion game review');
    const url = getContentUrl(content);
    const unsubscribeUrl = subscriber ? getUnsubscribeUrl(subscriber) : absoluteUrl('unsubscribe.html');
    const label = isBlog ? 'New blog post' : 'New game review';
    const subject = `${label}: ${title}`;
    const excerpt = content.excerpt || content.tagline || 'A new Envizion update is ready for you.';

    const text = `${subject}\n\n${excerpt}\n\nRead it here: ${url}\n\nYou are receiving this because you subscribed to ${isBlog ? 'blog posts' : 'game reviews'} from Envizion.\n\nUnsubscribe: ${unsubscribeUrl}`;
    const html = `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:640px;margin:0 auto;padding:24px">
        <p style="margin:0 0 12px;color:#1d4ed8;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">${escapeHtml(label)}</p>
        <h1 style="font-size:28px;line-height:1.15;margin:0 0 14px">${escapeHtml(title)}</h1>
        <p style="font-size:16px;color:#475569;margin:0 0 22px">${escapeHtml(excerpt)}</p>
        <a href="${escapeHtml(url)}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;font-weight:800;border-radius:10px;padding:12px 18px">Read on Envizion</a>
        <p style="margin-top:28px;color:#64748b;font-size:13px">You are receiving this because you subscribed to ${isBlog ? 'blog posts' : 'game reviews'} from Envizion.</p>
        <p style="margin-top:10px;color:#64748b;font-size:13px"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#64748b">Unsubscribe from Envizion emails</a></p>
      </div>`;

    return { subject, text, html };
  }

  function makeMailAppPayload({ content, subscriber, emailMessage, eventId, deliveryId, topic }) {
    return {
      to: [subscriber.email],
      recipient: subscriber.email,
      email: subscriber.email,
      subject: emailMessage.subject,
      text: emailMessage.text,
      body: emailMessage.text,
      html: emailMessage.html,
      message: emailMessage,
      site: 'Envizion',
      eventId,
      deliveryId,
      topic,
      contentType: content.type,
      contentTitle: content.title || '',
      contentUrl: getContentUrl(content)
    };
  }

  async function sendViaMailApp(payload) {
    const url = getMailAppUrl();
    if (!url) throw new Error('MailApp web app URL is missing.');

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });
  }

  function splitDisplayName(displayName) {
    const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
  }

  async function upsertSubscriber({ email, displayName = '', firstName = '', lastName = '', topics = ['blogs', 'reviews'], provider = 'email', sourcePage = window.location.pathname }) {
    if (!email) throw new Error('Email is required.');
    const normalizedEmail = email.trim().toLowerCase();
    const parsedName = splitDisplayName(displayName);
    const cleanFirstName = String(firstName || parsedName.firstName || '').trim();
    const cleanLastName = String(lastName || parsedName.lastName || '').trim();
    const cleanDisplayName = String(displayName || [cleanFirstName, cleanLastName].filter(Boolean).join(' ')).trim();
    const { db, firestore } = await getFirebase();
    const ref = firestore.doc(db, SUBSCRIBERS_COLLECTION, subscriberId(normalizedEmail));
    try {
      await firestore.setDoc(ref, {
        email: normalizedEmail,
        displayName: cleanDisplayName,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        topics: normalizeTopics(topics),
        provider,
        status: 'active',
        sourcePage,
        sourceUrl: window.location.href,
        updatedAtLocal: new Date().toISOString(),
        updatedAt: firestore.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      throw withPermissionContext(error, 'Saving the newsletter subscriber');
    }
  }

  async function unsubscribeSubscriber({ id, email, sourcePage = window.location.pathname }) {
    const subscriberDocId = id || subscriberId(email);
    if (!subscriberDocId) throw new Error('Subscriber id is required.');
    const { db, firestore } = await getFirebase();
    const ref = firestore.doc(db, SUBSCRIBERS_COLLECTION, subscriberDocId);

    try {
      await firestore.updateDoc(ref, {
        status: 'unsubscribed',
        unsubscribeSourcePage: sourcePage,
        unsubscribeSourceUrl: window.location.href,
        unsubscribedAtLocal: new Date().toISOString(),
        unsubscribedAt: firestore.serverTimestamp(),
        updatedAtLocal: new Date().toISOString(),
        updatedAt: firestore.serverTimestamp()
      });
    } catch (error) {
      throw withPermissionContext(error, 'Unsubscribing from newsletter emails');
    }
  }

  async function queueContentNotification(content) {
    const topic = getTopicForContent(content);
    const eventId = getEventId(content);
    const { db, firestore } = await getFirebase();
    const eventRef = firestore.doc(db, EVENTS_COLLECTION, eventId);
    let eventSnap;

    try {
      eventSnap = await firestore.getDoc(eventRef);
    } catch (error) {
      throw withPermissionContext(error, 'Checking the notification event');
    }

    if (eventSnap.exists() && eventSnap.data().completedAt) {
      return { queued: 0, skipped: true, reason: 'already-queued' };
    }

    try {
      await firestore.setDoc(eventRef, {
        type: content.type,
        contentId: content.id || content.slug,
        title: content.title || '',
        topic,
        url: getContentUrl(content),
        queuedAtLocal: new Date().toISOString(),
        queuedAt: firestore.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      throw withPermissionContext(error, 'Saving the notification event');
    }

    const subscribersQuery = firestore.query(
      firestore.collection(db, SUBSCRIBERS_COLLECTION),
      firestore.where('topics', 'array-contains', topic)
    );
    let subscribersSnap;

    try {
      subscribersSnap = await firestore.getDocs(subscribersQuery);
    } catch (error) {
      throw withPermissionContext(error, 'Reading newsletter subscribers');
    }
    let batch = firestore.writeBatch(db);
    let batchCount = 0;
    let queued = 0;
    let submitted = 0;
    let failed = 0;
    const deliveries = [];

    async function commitIfNeeded(force = false) {
      if (batchCount && (force || batchCount >= 400)) {
        try {
          await batch.commit();
        } catch (error) {
          throw withPermissionContext(error, 'Saving notification delivery audit records');
        }
        batch = firestore.writeBatch(db);
        batchCount = 0;
      }
    }

    const subscriberDocs = subscribersSnap.docs || [];
    for (const subscriberDoc of subscriberDocs) {
      const subscriber = subscriberDoc.data();
      if (!subscriber.email || subscriber.status === 'unsubscribed') continue;

      const deliveryId = `${eventId}_${subscriberId(subscriber.email)}`;
      const deliveryRef = firestore.doc(db, DELIVERY_COLLECTION, deliveryId);
      const emailMessage = makeEmail(content, subscriber);
      const payload = makeMailAppPayload({
        content,
        subscriber,
        emailMessage,
        eventId,
        deliveryId,
        topic
      });

      batch.set(deliveryRef, {
        eventId,
        subscriberId: subscriberDoc.id,
        email: subscriber.email,
        status: 'queued',
        sender: 'google-apps-script-mailapp',
        queuedAtLocal: new Date().toISOString(),
        queuedAt: firestore.serverTimestamp()
      }, { merge: true });
      deliveries.push({ deliveryRef, payload });
      batchCount += 1;
      queued += 1;
      await commitIfNeeded();
    }

    await commitIfNeeded(true);

    for (const delivery of deliveries) {
      try {
        await sendViaMailApp(delivery.payload);
        submitted += 1;
        try {
          await firestore.setDoc(delivery.deliveryRef, {
            status: 'submitted',
            submittedAtLocal: new Date().toISOString(),
            submittedAt: firestore.serverTimestamp()
          }, { merge: true });
        } catch (error) {
          throw withPermissionContext(error, 'Updating the notification delivery status');
        }
      } catch (error) {
        failed += 1;
        try {
          await firestore.setDoc(delivery.deliveryRef, {
            status: 'failed',
            error: error.message || String(error),
            failedAtLocal: new Date().toISOString(),
            failedAt: firestore.serverTimestamp()
          }, { merge: true });
        } catch (statusError) {
          throw withPermissionContext(statusError, 'Updating the failed notification delivery status');
        }
      }
    }

    try {
      await firestore.setDoc(eventRef, {
        queuedCount: queued,
        submittedCount: submitted,
        failedCount: failed,
        sender: 'google-apps-script-mailapp',
        completedAtLocal: new Date().toISOString(),
        completedAt: firestore.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      throw withPermissionContext(error, 'Completing the notification event');
    }

    return { queued, submitted, failed, skipped: false };
  }

  window.EnvizionNotifications = {
    upsertSubscriber,
    unsubscribeSubscriber,
    queueContentNotification,
    normalizeTopics,
    subscriberId
  };
})();
