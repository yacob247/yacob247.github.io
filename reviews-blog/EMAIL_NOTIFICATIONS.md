# Envizion Email Notifications

This site saves subscribers in Firestore and sends notification emails through a Google Apps Script MailApp web app when an admin publishes a new blog post or a new game review.

## Firestore Collections

- `newsletter_subscribers`
  - One document per subscriber.
  - Uses normalized email as the document ID.
  - Important fields: `email`, `topics`, `provider`, `status`.
  - `topics` contains `blogs`, `reviews`, or both.

- `notification_events`
  - One document per published content event.
  - Prevents duplicate emails when an existing post or review is edited.

- `notification_deliveries`
  - One document per subscriber/content pair.
  - Useful for auditing what was queued.

## Required Sender Setup

Deploy a Google Apps Script web app that uses `MailApp` in `doPost(e)`. The current deployment is configured in `notifications.js`:

```text
https://script.google.com/macros/s/AKfycbzAW6uVNde6I0DGnnrWqncLNX78Auyfnji9mXoIQp2HREOntBz2dnVJeIM3PDqGLhzD_g/exec
```

Each request body is JSON sent as `text/plain` for browser compatibility with Apps Script:

```json
{
  "to": "subscriber@example.com",
  "recipient": "subscriber@example.com",
  "email": "subscriber@example.com",
  "subject": "New blog post: Example",
  "text": "Plain-text email body",
  "body": "Plain-text email body",
  "html": "<div>HTML email body</div>",
  "message": {
    "subject": "New blog post: Example",
    "text": "Plain-text email body",
    "html": "<div>HTML email body</div>"
  },
  "site": "Envizion",
  "eventId": "blog_example",
  "deliveryId": "blog_example_subscriber_example.com",
  "topic": "blogs",
  "contentType": "blog",
  "contentTitle": "Example",
  "contentUrl": "https://example.com/blog-post.html?id=example"
}
```

The Apps Script deployment must allow the site to call it, usually by deploying the web app with access set to anyone or anyone with the link. Firestore still records delivery audit documents in `notification_deliveries`.

Each notification email includes an unsubscribe link:

```text
https://your-site.example/unsubscribe.html?id=subscriber_document_id
```

That page updates the matching `newsletter_subscribers` document to `status: "unsubscribed"`. The notification sender skips subscribers with that status.

## Firestore Rules

The admin notification sender still needs Firestore permission to read subscribers and write audit records. The admin page must be signed in to Firebase as an admin user before publishing notifications.

Paste rules like this in Firebase Console > Firestore Database > Rules, replacing `PASTE_ADMIN_UID_HERE` with your Firebase Auth user UID:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
        && request.auth.uid in ['PASTE_ADMIN_UID_HERE'];
    }

    match /newsletter_subscribers/{subscriberId} {
      allow read, delete: if isAdmin();
      allow create, update: if isAdmin()
        || (
          request.resource.data.email is string
          && request.resource.data.topics is list
          && request.resource.data.topics.hasOnly(['blogs', 'reviews'])
          && request.resource.data.status in ['active', 'unsubscribed']
        );
    }

    match /notification_events/{eventId} {
      allow read, write: if isAdmin();
    }

    match /notification_deliveries/{deliveryId} {
      allow read, write: if isAdmin();
    }
  }
}
```

If you see `Missing or insufficient permissions`, the current browser session is not allowed by these rules. Sign in with the Firebase account whose UID is listed as admin, then reload the admin page.
