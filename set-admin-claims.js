/**
 * Set Admin Custom Claims for Firebase Users
 * 
 * This script allows you to grant admin privileges to specific users
 * by setting custom claims on their Firebase Auth account.
 * 
 * Prerequisites:
 * 1. Install Firebase Admin SDK: npm install firebase-admin
 * 2. Download service account key from Firebase Console:
 *    Project Settings → Service Accounts → Generate New Private Key
 * 3. Save the key as 'serviceAccountKey.json' in this directory
 * 
 * Usage:
 *   node set-admin-claims.js <email>
 * 
 * Example:
 *   node set-admin-claims.js admin@example.com
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Check if service account key exists
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: serviceAccountKey.json not found!');
    console.log('');
    console.log('📋 To get your service account key:');
    console.log('1. Go to Firebase Console:');
    console.log('   https://console.firebase.google.com/project/sortmaster-app-5821/settings/serviceaccounts/adminsdk');
    console.log('2. Click "Generate New Private Key"');
    console.log('3. Save the file as "serviceAccountKey.json" in this directory');
    console.log('');
    console.log('⚠️  WARNING: Never commit this file to version control!');
    process.exit(1);
}

// Initialize Firebase Admin
try {
    const serviceAccount = require('./serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('✅ Firebase Admin initialized');
} catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    process.exit(1);
}

/**
 * Set admin custom claim for a user
 */
async function setAdminClaim(email, isAdmin = true) {
    try {
        console.log(`\n🔍 Looking up user: ${email}`);

        // Get user by email
        const user = await admin.auth().getUserByEmail(email);
        console.log(`✅ User found: ${user.uid}`);

        // Set custom claims
        await admin.auth().setCustomUserClaims(user.uid, { admin: isAdmin });

        if (isAdmin) {
            console.log(`✅ Admin privileges GRANTED to ${email}`);
        } else {
            console.log(`✅ Admin privileges REVOKED from ${email}`);
        }

        console.log('');
        console.log('⚠️  IMPORTANT: User must sign out and sign in again for changes to take effect!');
        console.log('');

        return true;
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.error(`❌ Error: User with email "${email}" not found!`);
            console.log('');
            console.log('Make sure the user has signed up in your app first.');
        } else {
            console.error('❌ Error:', error.message);
        }
        return false;
    }
}

/**
 * List all users with admin claims
 */
async function listAdmins() {
    try {
        console.log('\n👥 Listing all admin users...\n');

        const listUsersResult = await admin.auth().listUsers();
        const admins = [];

        for (const user of listUsersResult.users) {
            if (user.customClaims && user.customClaims.admin === true) {
                admins.push({
                    email: user.email,
                    uid: user.uid,
                    displayName: user.displayName || 'N/A'
                });
            }
        }

        if (admins.length === 0) {
            console.log('No admin users found.');
        } else {
            console.log(`Found ${admins.length} admin user(s):\n`);
            admins.forEach((admin, index) => {
                console.log(`${index + 1}. ${admin.email}`);
                console.log(`   UID: ${admin.uid}`);
                console.log(`   Name: ${admin.displayName}`);
                console.log('');
            });
        }

        return admins;
    } catch (error) {
        console.error('❌ Error listing users:', error.message);
        return [];
    }
}

/**
 * Main function
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('');
        console.log('🔐 Firebase Admin Claims Manager');
        console.log('=================================');
        console.log('');
        console.log('Usage:');
        console.log('  node set-admin-claims.js <email>           - Grant admin privileges');
        console.log('  node set-admin-claims.js <email> revoke    - Revoke admin privileges');
        console.log('  node set-admin-claims.js list              - List all admin users');
        console.log('');
        console.log('Examples:');
        console.log('  node set-admin-claims.js admin@example.com');
        console.log('  node set-admin-claims.js user@example.com revoke');
        console.log('  node set-admin-claims.js list');
        console.log('');
        process.exit(0);
    }

    const command = args[0].toLowerCase();

    if (command === 'list') {
        await listAdmins();
    } else {
        const email = args[0];
        const action = args[1] ? args[1].toLowerCase() : 'grant';
        const isAdmin = action !== 'revoke';

        await setAdminClaim(email, isAdmin);
    }

    process.exit(0);
}

// Run the script
main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
});
