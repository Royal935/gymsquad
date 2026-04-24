# GymSquad 🏋️

A social gym habit tracker. Set your workout split, check off the day, and see your squad's progress in real time.

---

## Setup (one time)

### 1. Install Node.js
Download from https://nodejs.org — pick the LTS version. This gives you `node` and `npm`.

### 2. Install Git
Download from https://git-scm.com and install.

### 3. Set up Firebase (your backend + database)

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `gymsquad` → create
3. In the left sidebar: **Build → Authentication → Get started**
   - Enable **Email/Password**
4. In the left sidebar: **Build → Firestore Database → Create database**
   - Choose **Start in test mode** → pick a region → enable
5. In **Project Settings** (gear icon) → **General** → scroll to **Your apps** → click the web icon `</>`
   - Register app as `gymsquad`
   - Copy the `firebaseConfig` object

6. Open `src/lib/firebase.js` and paste your config values

### 4. Install dependencies & run locally

Open this folder in VS Code, open the terminal (Ctrl+` or View → Terminal), then run:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser. The app is running!

---

## Deploy (shareable link)

### 1. Create a GitHub account at https://github.com

### 2. Push your code
In VS Code terminal:
```bash
git init
git add .
git commit -m "initial commit"
```

Then on GitHub, create a new repo called `gymsquad` and follow the push instructions.

### 3. Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New Project** → import your `gymsquad` repo
3. Click **Deploy** — done!

Vercel gives you a live URL like `gymsquad-xyz.vercel.app` that you can share.

---

## Firestore Security Rules (before going public)

In Firebase Console → Firestore → Rules, replace the default with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

This lets logged-in users read each other's data (for the squad feed) but only write their own.

---

## Features
- Email/password auth
- Weekly workout split (editable per day)
- Daily exercise checklist
- 7-day streak tracker
- Squad feed — real-time friend check-ins
- Add friends by email
- Profile with stats
