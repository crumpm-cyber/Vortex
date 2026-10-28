# Vortex

A simple Discord-style chat app with user accounts, DMs, and group chats.  
Frontend is static (perfect for **GitHub Pages**). Backend uses free **Firebase**.

---

## Features (v1)

- Email/password user accounts
- Unique usernames
- Direct Messages (1-on-1)
- Group chats
- Real-time messaging
- Discord-inspired dark theme

---

## Setup Instructions

### 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** → name it anything (e.g. `vortex-chat`)
3. Disable Google Analytics if you want (optional)
4. Once created, go to **Build → Authentication**
   - Click **Get started**
   - Enable **Email/Password**
5. Go to **Build → Firestore Database**
   - Click **Create database**
   - Start in **test mode** (for now)
   - Choose any location

### 2. Get your Firebase config

1. In Firebase Console go to **Project Settings** (gear icon)
2. Scroll to **Your apps** → click the **</>** (Web) icon
3. Register the app (nickname: `vortex`)
4. Copy the `firebaseConfig` object

### 3. Add the config to the code

Open `js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 4. (Recommended) Secure Firestore later

While in test mode everything works. Later you should add rules.  
Example rules (paste in Firestore → Rules):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /usernames/{username} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    match /chats/{chatId} {
      allow read, write: if request.auth != null && request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      
      match /messages/{messageId} {
        allow read, write: if request.auth != null && request.auth.uid in get(/databases/$(database)/documents/chats/$(chatId)).data.members;
      }
    }
  }
}
```

### 5. Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `vortex`)
2. Upload all files from this folder (or push via git)
3. Go to the repo → **Settings → Pages**
4. Under **Source** choose **Deploy from a branch**
5. Select `main` (or `master`) and `/ (root)`
6. Click Save

Your site will be live at:  
`https://YOUR_USERNAME.github.io/vortex/`

> **Important:** Make sure `index.html` is in the root of the repo.

---

## File Structure

```
vortex/
├── index.html          # Login / Signup
├── app.html            # Main chat app
├── css/
│   └── style.css
├── js/
│   ├── firebase-config.js
│   ├── auth.js
│   └── app.js
└── README.md
```

---

## How to use

1. Open the site → Sign up with email + username
2. Start a DM by clicking the **+** next to Direct Messages
3. Create a group by clicking the **+** next to Group Chats
4. Chat in real time

---

## Notes

- This is a first version. Voice, reactions, file uploads, etc. can be added later.
- Because it runs on a normal domain (your GitHub Pages URL), many school filters treat it more leniently than Discord itself.
- Keep your Firebase config private if the repo is public (or use environment tricks later). For a school project it’s usually fine.
