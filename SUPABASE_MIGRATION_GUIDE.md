# Supabase Migration Guide

## Overview
This guide will help you migrate your Quality Control System Report (QCSR) app from Firebase to Supabase.

## Why Supabase?
- **Open Source**: Full control over your data
- **PostgreSQL**: Powerful relational database with better querying capabilities
- **Real-time subscriptions**: Built-in real-time functionality
- **Storage**: Integrated file storage similar to Firebase Storage
- **Row Level Security (RLS)**: Fine-grained access control
- **Cost-effective**: More generous free tier and predictable pricing

## Migration Steps

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Project Name**: QCSR Mobile
   - **Database Password**: (save this securely!)
   - **Region**: Choose closest to your users
5. Wait for project to be created (~2 minutes)

### 2. Get Your Supabase Credentials

After project creation, go to **Settings** → **API**:
- **Project URL**: `https://ktxdakxspxfqjpxptyhd.supabase.co
- **Anon/Public Key**: `eyJhbGc...` (starts with eyJ)

Save these for the `.env` file.

### 3. Set Up Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste the schema from `supabase_schema.sql`
3. Click **Run** to create tables

### 4. Set Up Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Create two buckets:
   - **Name**: `rejected-parts` (for NG images)
     - Public: ✅ Yes
   - **Name**: `reports` (for PDF reports)
     - Public: ✅ Yes

### 5. Configure Environment Variables

Create/update `.env` file in project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Update Dependencies

Run in terminal:
```bash
flutter pub add supabase_flutter
flutter pub remove firebase_core cloud_firestore firebase_storage firebase_database
flutter pub get
```

### 7. Update Code Files

The following files have been updated for Supabase:
- ✅ `lib/services/supabase_service.dart` (NEW - replaces firestore_service.dart)
- ✅ `lib/models/sorting_log.dart` (updated for Supabase)
- ✅ `lib/main.dart` (Supabase initialization)
- ✅ `lib/features/scan/quality_scan_page.dart` (updated to use Supabase)

### 8. Remove Firebase Files

After migration is complete and tested, you can remove:
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- `.firebaserc`
- `google-services.json` (Android)
- `GoogleService-Info.plist` (iOS)
- `lib/firebase_options.dart`
- `FIREBASE_SECURITY_GUIDE.md`
- `SECURITY_RULES_SUMMARY.md`
- `deploy-security-rules.ps1`
- `set-admin-claims.js`

### 9. Test the Migration

1. **Test Data Creation**:
   - Create a new quality report
   - Verify it appears in Supabase dashboard under **Table Editor** → `sorting_logs`

2. **Test Image Upload**:
   - Add NG entries with images
   - Check **Storage** → `rejected-parts` for uploaded images

3. **Test PDF Generation**:
   - Submit a report
   - Check **Storage** → `reports` for PDF files

4. **Test Real-time Updates**:
   - Open the app on two devices
   - Create a report on one device
   - Verify it appears on the other device in real-time

### 10. Data Migration (Optional)

If you have existing Firebase data to migrate:

1. **Export from Firebase**:
   - Go to Firebase Console → Firestore Database
   - Use Firebase Admin SDK to export data
   - Or manually export via Firebase CLI

2. **Import to Supabase**:
   - Use the provided `migrate_firebase_to_supabase.js` script
   - Or manually insert via SQL Editor

## Key Differences

| Feature | Firebase | Supabase |
|---------|----------|----------|
| Database | NoSQL (Firestore) | PostgreSQL (SQL) |
| Queries | Limited | Full SQL power |
| Relationships | Manual | Foreign keys |
| Real-time | `.snapshots()` | `.stream()` |
| Storage | Firebase Storage | Supabase Storage |
| Auth | Firebase Auth | Supabase Auth |
| Timestamps | `Timestamp` | `DateTime` |

## Code Changes Summary

### Before (Firebase):
```dart
final FirebaseFirestore _db = FirebaseFirestore.instance;
await _db.collection('sorting_logs').add(log.toFirestore());
```

### After (Supabase):
```dart
final supabase = Supabase.instance.client;
await supabase.from('sorting_logs').insert(log.toJson());
```

## Troubleshooting

### Issue: "Invalid API key"
- **Solution**: Double-check your `SUPABASE_ANON_KEY` in `.env`

### Issue: "Row Level Security policy violation"
- **Solution**: Ensure RLS policies are set up correctly (see `supabase_schema.sql`)

### Issue: "Storage bucket not found"
- **Solution**: Create the storage buckets as described in Step 4

### Issue: "Connection timeout"
- **Solution**: Check your internet connection and Supabase project status

## Benefits After Migration

✅ **Better Performance**: PostgreSQL is faster for complex queries
✅ **Lower Costs**: Supabase free tier is more generous
✅ **More Control**: Self-hosting option available
✅ **Better Developer Experience**: SQL is more powerful than Firestore queries
✅ **Real-time**: Built-in real-time subscriptions
✅ **Type Safety**: Better integration with Dart/Flutter

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Flutter Package**: https://pub.dev/packages/supabase_flutter

## Next Steps

After successful migration:
1. Monitor your Supabase dashboard for usage
2. Set up backups (automatic in Supabase Pro)
3. Configure Row Level Security for production
4. Set up authentication if needed
5. Optimize queries based on usage patterns
