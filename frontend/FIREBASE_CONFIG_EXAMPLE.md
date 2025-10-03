# Firebase Configuration Update

## What You Need to Change

In both `login.html` and `signup.html`, you need to replace the placeholder Firebase configuration with your actual project details.

## Current Placeholder Code (Lines 24-32):

```javascript
const firebaseConfig = {
    // Add your Firebase config here
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

## Replace With Your Actual Configuration:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "your-actual-project-id.firebaseapp.com",
    projectId: "your-actual-project-id",
    storageBucket: "your-actual-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};
```

## Files to Update:

1. **login.html** - Lines 24-32
2. **signup.html** - Lines 24-32

## How to Get Your Configuration:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon (⚙️) → Project settings
4. Scroll down to "Your apps"
5. Click "Add app" → Web app (</> icon)
6. Register your app
7. Copy the configuration object

## After Updating:

1. **Test email/password signup** on the signup page
2. **Test email/password login** on the login page
3. **Test Google sign-in** on both pages
4. **Check Firebase Console** → Authentication → Users to see created users

## Important Notes:

- ✅ **Keep the configuration secure** - don't commit sensitive keys to public repos
- ✅ **Enable Authentication methods** in Firebase Console first
- ✅ **Add your domain** to authorized domains for Google sign-in
- ✅ **Test thoroughly** before going to production

## Quick Test Checklist:

- [ ] Firebase project created
- [ ] Authentication enabled (Email/Password + Google)
- [ ] Configuration updated in both HTML files
- [ ] Email signup works
- [ ] Email login works
- [ ] Google sign-in works
- [ ] Users appear in Firebase Console
