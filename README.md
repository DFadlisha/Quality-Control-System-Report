# QCSR Mobile - Quality Control System Report

## 📱 About

A Flutter mobile application for quality control and sorting inspection. Track production, manage defects, generate reports, and monitor real-time statistics.

## 🚀 Quick Start

### Prerequisites
- Flutter SDK installed
- Android device or emulator
- Supabase account

### Setup (5 Minutes)

1. **Install Dependencies**
   ```bash
   flutter pub get
   ```

2. **Configure Supabase**
   - Create project at [supabase.com](https://supabase.com)
   - Copy `.env.example` to `.env`
   - Add your Supabase URL and Anon Key to `.env`

3. **Set Up Database**
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL from `supabase_schema.sql`

4. **Create Storage Buckets**
   - Go to Storage → Create buckets:
     - `rejected-parts` (public)
     - `reports` (public)

5. **Run the App**
   ```bash
   flutter run
   ```

## 📚 Documentation

- **`QUICK_START.md`** - Detailed setup guide
- **`SUPABASE_MIGRATION_GUIDE.md`** - Migration from Firebase
- **`USER_FLOW.md`** - App user flow
- **`supabase_schema.sql`** - Database schema

## ✨ Features

- ✅ **Quality Scanning** - Barcode/QR scanning for parts
- ✅ **Defect Tracking** - Photo documentation of NG items
- ✅ **PDF Reports** - Auto-generate inspection reports
- ✅ **Excel Export** - Export data to spreadsheet
- ✅ **Real-Time Dashboard** - Live production statistics
- ✅ **Multi-Operator** - Support multiple operators per shift
- ✅ **Admin Utilities** - Data management tools

## 🛠️ Tech Stack

- **Frontend**: Flutter (Dart)
- **Backend**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Charts**: FL Chart
- **PDF**: pdf & printing packages
- **Excel**: excel package

## 📦 Build APK

```bash
flutter build apk --release
```

APK location: `build/app/outputs/flutter-apk/app-release.apk`

## 🔐 Environment Variables

Create a `.env` file with:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**Never commit `.env` to version control!**

## 🗄️ Database

### Tables:
- `parts_master` - Part catalog
- `sorting_logs` - Inspection records
- `ng_details` - Defect details

### Storage Buckets:
- `rejected-parts` - Defect images
- `reports` - PDF reports

## 🔄 Real-Time Updates

The app uses Supabase Realtime for live updates:
- Dashboard statistics update automatically
- Multi-device synchronization
- No manual refresh needed

## 👥 User Roles

- **Operator** - Create quality reports, scan parts
- **Admin** - Access utilities, delete data (password: `admin123`)

## 📊 Reports

### PDF Reports Include:
- Part information
- Operator details
- Quantity sorted/NG
- Defect photos
- Timestamp and location

### Excel Exports Include:
- All inspection logs
- Filterable by date, part, operator
- Shareable via any app

## 🐛 Troubleshooting

### App won't build
```bash
flutter clean
flutter pub get
flutter build apk --release
```

### Database connection issues
- Check `.env` file has correct credentials
- Verify Supabase project is active
- Check internet connection

### Real-time not working
- Go to Supabase Dashboard → Database → Replication
- Enable replication for all tables

## 📝 License

Proprietary - NES Solution and Network SDN BHD

## 🤝 Support

For issues or questions, contact the development team.

---

**Version**: 2.0.0 (Supabase)  
**Last Updated**: February 2026
