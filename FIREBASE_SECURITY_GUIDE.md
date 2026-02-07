# Firebase Security Rules Deployment Guide

## 🎯 Overview

Your Firestore security rules have been updated to production-ready standards. This guide will help you deploy them and configure admin access.

## 📋 What Changed

### Before (INSECURE):
- ❌ Anyone could read/write all data
- ❌ Rules expired on Feb 9, 2026
- ❌ No authentication required
- ❌ No data validation

### After (SECURE):
- ✅ Authentication required for all operations
- ✅ Role-based access control (admin vs regular users)
- ✅ Data validation for sorting logs
- ✅ Collection-specific permissions
- ✅ No expiration date

## 🔐 Security Features

### 1. **Authentication Required**
All users must be authenticated via Firebase Auth to access any data.

### 2. **Role-Based Access Control**

**Regular Users Can:**
- ✅ Read all sorting logs
- ✅ Create new sorting logs
- ✅ Read parts master data
- ✅ Read/update their own user profile

**Admin Users Can:**
- ✅ Everything regular users can do
- ✅ Update existing sorting logs
- ✅ Delete sorting logs (including bulk delete)
- ✅ Manage parts master data
- ✅ Manage user profiles
- ✅ Manage attendance records

### 3. **Data Validation**
Sorting logs are validated to ensure they contain all required fields with correct data types.

## 🚀 Deployment Steps

### Step 1: Deploy Rules to Firebase

You have **two options** to deploy these rules:

#### Option A: Using Firebase Console (Easiest)

1. Open Firebase Console: https://console.firebase.google.com/project/sortmaster-app-5821/firestore/databases/-default-/security/rules

2. Copy the entire contents of `firestore.rules` file

3. Paste into the Firebase Console rules editor

4. Click **"Publish"** button

5. Confirm the deployment

#### Option B: Using Firebase CLI (Recommended for CI/CD)

```powershell
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project (if not done)
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

### Step 2: Set Up Admin Users

You need to grant admin privileges to specific users. There are **two approaches**:

#### Approach 1: Custom Claims (RECOMMENDED - More Secure)

This requires setting custom claims via Firebase Admin SDK or Cloud Functions.

**Option 1A: Using Firebase Admin SDK (Node.js)**

Create a script `set-admin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdminClaim(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Admin claim set for ${email}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

// Replace with your admin email
setAdminClaim('your-admin@example.com');
```

Run it:
```bash
node set-admin.js
```

**Option 1B: Using Cloud Functions**

Deploy a Cloud Function that you can call to set admin claims:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // Only allow if caller is already an admin or use a secret key
  const SECRET_KEY = 'your-secret-key-here';
  
  if (data.secretKey !== SECRET_KEY) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid secret key');
  }

  try {
    await admin.auth().setCustomUserClaims(data.uid, { admin: true });
    return { success: true, message: `Admin role granted to ${data.uid}` };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

#### Approach 2: Email Whitelist (SIMPLER - Less Secure)

If you prefer a simpler approach, modify the `isAdmin()` function in `firestore.rules`:

1. Open `firestore.rules`

2. Comment out the current `isAdmin()` function (lines 16-19)

3. Uncomment the email-based version (lines 21-28)

4. Replace the example emails with your actual admin emails:

```javascript
function isAdmin() {
  return isAuthenticated() && 
         request.auth.token.email in [
           'admin@nesolution.com',
           'manager@nesolution.com',
           'fadlisha@nesolution.com'
         ];
}
```

5. Redeploy the rules (see Step 1)

### Step 3: Test the Rules

#### Test 1: Verify Authentication Requirement

1. Sign out of your app
2. Try to access Firestore data
3. **Expected:** Permission denied error

#### Test 2: Verify Regular User Access

1. Sign in as a regular user
2. Try to create a sorting log
3. **Expected:** Success ✅
4. Try to delete a sorting log
5. **Expected:** Permission denied ❌

#### Test 3: Verify Admin Access

1. Sign in as an admin user
2. Try to delete a sorting log
3. **Expected:** Success ✅
4. Try to use the "Delete All Logs" feature in Admin Utilities
5. **Expected:** Success ✅

## 🔧 Troubleshooting

### Issue: "Permission Denied" for Regular Operations

**Cause:** User is not authenticated or rules not deployed

**Solution:**
1. Verify user is signed in: Check Firebase Auth in console
2. Verify rules are deployed: Check Firebase Console → Firestore → Rules tab
3. Check browser console for detailed error messages

### Issue: Admin Operations Not Working

**Cause:** Admin claims not set or email not in whitelist

**Solution:**
1. If using custom claims: Verify claims are set using Firebase Console → Authentication → Users → Click user → Custom claims
2. If using email whitelist: Verify email exactly matches (case-sensitive)
3. User may need to sign out and sign in again for claims to take effect

### Issue: Data Validation Errors

**Cause:** Sorting log missing required fields

**Solution:**
1. Check the error message for which field is missing
2. Verify your app is sending all required fields:
   - `part_no`, `part_name`, `quantity_sorted`, `quantity_ng`
   - `supplier`, `factory_location`, `operators`, `ng_details`
   - `remarks`, `timestamp`

## 📊 Firebase Storage Rules

Don't forget to also secure your Firebase Storage! The rules should be in `storage.rules`:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Rejected parts images
    match /rejected_parts/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // PDF reports
    match /reports/{reportId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow delete: if request.auth != null && 
                       request.auth.token.get('admin', false) == true;
    }
    
    // Deny all other paths
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

Deploy storage rules:
```bash
firebase deploy --only storage
```

## 🎓 Best Practices

1. **Never commit service account keys** to version control
2. **Use environment variables** for sensitive data
3. **Test rules in Firebase Console** using the Rules Playground
4. **Monitor security rules usage** in Firebase Console → Firestore → Usage tab
5. **Set up alerts** for unusual access patterns
6. **Regularly review** who has admin access
7. **Use custom claims** instead of email whitelists for production

## 📚 Additional Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Custom Claims Documentation](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Security Rules Testing](https://firebase.google.com/docs/rules/unit-tests)

## ✅ Checklist

- [ ] Deploy Firestore security rules to Firebase
- [ ] Set up admin users (custom claims or email whitelist)
- [ ] Deploy Firebase Storage security rules
- [ ] Test authentication requirement
- [ ] Test regular user permissions
- [ ] Test admin user permissions
- [ ] Remove any test/debug users
- [ ] Document which users have admin access
- [ ] Set up monitoring/alerts

---

**Need Help?** Check the Firebase Console logs for detailed error messages, or test your rules using the Rules Playground in the Firebase Console.
