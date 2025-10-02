# Firebase Integration Setup Guide

## Current Status

Your login and signup pages are already configured with Firebase SDK, but you need to replace the placeholder configuration with your actual Firebase project details.

## Step 1: Create a Firebase Project

1. **Go to Firebase Console**: https://console.firebase.google.com/
2. **Click "Create a project"**
3. **Enter project name**: e.g., "Hereco App"
4. **Enable Google Analytics** (optional but recommended)
5. **Click "Create project"**

## Step 2: Enable Authentication

1. **In Firebase Console**, go to **Authentication**
2. **Click "Get started"**
3. **Go to "Sign-in method" tab**
4. **Enable the following providers**:

### Email/Password Authentication:
- Click on **"Email/Password"**
- Toggle **"Enable"**
- Click **"Save"**

### Google Authentication:
- Click on **"Google"**
- Toggle **"Enable"**
- Enter your **Project support email**
- Click **"Save"**

## Step 3: Get Your Firebase Configuration

1. **In Firebase Console**, click the **gear icon** (⚙️) → **Project settings**
2. **Scroll down to "Your apps"**
3. **Click "Add app"** → **Web app** (</> icon)
4. **Enter app nickname**: e.g., "Hereco Web App"
5. **Check "Also set up Firebase Hosting"** (optional)
6. **Click "Register app"**
7. **Copy the Firebase configuration object**

You'll get something like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890abcdef"
};
```

## Step 4: Update Your Code

### Update login.html:
Replace the placeholder configuration in `login.html` (around line 18-26):

```javascript
// Replace this placeholder configuration:
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// With your actual Firebase configuration:
const firebaseConfig = {
    apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef"
};
```

### Update signup.html:
Make the same changes in `signup.html` (around line 18-26).

## Step 5: Configure Google OAuth (Optional)

If you want Google sign-in to work:

1. **In Firebase Console** → **Authentication** → **Sign-in method** → **Google**
2. **Add your domain** to authorized domains:
   - For local testing: `localhost`
   - For production: `yourdomain.com`
3. **Download the OAuth client configuration** if needed

## Step 6: Test Your Integration

### Test Email/Password Authentication:
1. **Open your login page**
2. **Click "Continue via Email"**
3. **Try creating an account** with email/password
4. **Check Firebase Console** → **Authentication** → **Users** to see if user was created

### Test Google Authentication:
1. **Click "Continue with Google"**
2. **Complete Google OAuth flow**
3. **Verify user appears in Firebase Console**

## Step 7: Security Rules (Important!)

### Set up Firestore Security Rules (if using Firestore):
```javascript
// In Firebase Console → Firestore Database → Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Set up Storage Security Rules (if using Storage):
```javascript
// In Firebase Console → Storage → Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 8: Environment Variables (Production)

For production, consider using environment variables instead of hardcoding:

```javascript
const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};
```

## Troubleshooting

### Common Issues:

1. **"Firebase: Error (auth/invalid-api-key)"**
   - Check that your API key is correct
   - Ensure you copied the entire configuration object

2. **"Firebase: Error (auth/domain-not-authorized)"**
   - Add your domain to authorized domains in Firebase Console
   - For local testing, add `localhost`

3. **Google Sign-in not working**
   - Check that Google provider is enabled
   - Verify OAuth consent screen is configured
   - Add your domain to authorized domains

4. **"Firebase: Error (auth/network-request-failed)"**
   - Check your internet connection
   - Verify Firebase project is active
   - Check browser console for CORS errors

### Debug Mode:
Add this to see detailed Firebase logs:
```javascript
// Add this after Firebase initialization
if (window.location.hostname === 'localhost') {
    firebase.auth().useEmulator('http://localhost:9099');
}
```

## Next Steps

After Firebase is configured:

1. **Test all authentication flows**
2. **Set up user data storage** (Firestore)
3. **Implement user profile management**
4. **Add role-based access control**
5. **Set up email verification**
6. **Configure password reset functionality**

## Security Best Practices

1. **Never expose sensitive API keys** in client-side code
2. **Use Firebase Security Rules** to protect data
3. **Enable App Check** for additional security
4. **Monitor authentication logs** in Firebase Console
5. **Set up proper CORS policies** for your domain

## Support

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firebase Auth Guide**: https://firebase.google.com/docs/auth
- **Firebase Console**: https://console.firebase.google.com/
