# Quick Start Guide - Supabase Setup

## 🚀 5-Minute Setup

### Step 1: Create Supabase Project (2 minutes)
1. Visit: https://supabase.com
2. Click "Start your project" → Sign in with GitHub
3. Click "New Project"
4. Fill in:
   - **Name**: QCSR Mobile
   - **Database Password**: (create a strong password and save it!)
   - **Region**: Southeast Asia (Singapore) - closest to Malaysia
5. Click "Create new project"
6. Wait ~2 minutes for project creation

### Step 2: Get Your Credentials (30 seconds)
1. In your Supabase project, click **Settings** (gear icon) → **API**
2. Copy these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`

### Step 3: Update .env File (30 seconds)
Open `.env` file and replace with your values:
```env
SUPABASE_URL=https://your-actual-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here
```

### Step 4: Create Database Tables (1 minute)
1. In Supabase Dashboard, click **SQL Editor** (left sidebar)
2. Click "New query"
3. Open `supabase_schema.sql` from your project
4. Copy ALL the SQL code
5. Paste into Supabase SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

### Step 5: Create Storage Buckets (1 minute)
1. In Supabase Dashboard, click **Storage** (left sidebar)
2. Click "Create a new bucket"
3. Create first bucket:
   - **Name**: `rejected-parts`
   - **Public bucket**: ✅ ON
   - Click "Create bucket"
4. Click "Create a new bucket" again
5. Create second bucket:
   - **Name**: `reports`
   - **Public bucket**: ✅ ON
   - Click "Create bucket"

### Step 6: Run Your App! (30 seconds)
```bash
flutter run
```

## ✅ Verification

### Check Database Tables
1. Go to **Table Editor** in Supabase Dashboard
2. You should see:
   - `parts_master`
   - `sorting_logs`
   - `ng_details`

### Check Storage Buckets
1. Go to **Storage** in Supabase Dashboard
2. You should see:
   - `rejected-parts`
   - `reports`

### Test the App
1. Open the app
2. Create a quality report
3. Go to Supabase Dashboard → **Table Editor** → `sorting_logs`
4. You should see your new record!

## 🎯 Common Issues

### Issue: "Invalid API key"
**Solution**: Double-check your `SUPABASE_ANON_KEY` in `.env` - make sure you copied the entire key

### Issue: "Relation does not exist"
**Solution**: Run the SQL schema again in SQL Editor

### Issue: "Storage bucket not found"
**Solution**: Create the storage buckets as described in Step 5

### Issue: App won't build
**Solution**: Run `flutter clean` then `flutter pub get`

## 📱 Test Checklist

- [ ] App launches without errors
- [ ] Can create a new quality report
- [ ] Images upload successfully
- [ ] PDF generates and can be shared
- [ ] Dashboard shows data
- [ ] Real-time updates work

## 🎉 You're Done!

Your app is now running on Supabase! 

**Next**: Read `SUPABASE_MIGRATION_GUIDE.md` for advanced configuration and security settings.

## 🆘 Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Discord**: https://discord.supabase.com
- **GitHub Issues**: https://github.com/supabase/supabase/issues
