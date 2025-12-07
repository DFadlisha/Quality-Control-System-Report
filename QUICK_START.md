# 📱 Quick Start Guide - Mobile Development

## Initial Setup (One-time)

### 1. Install Mobile Development Tools

**For iOS (macOS only):**
- Install Xcode from Mac App Store
- Install CocoaPods: `sudo gem install cocoapods`

**For Android:**
- Install Android Studio
- Install Android SDK (API 22+)

## Daily Development Workflow

### 1. Make Code Changes
Edit your React code in `src/` as usual

### 2. Test in Browser
```bash
npm run dev
```

### 3. Build and Deploy to Mobile

**For Testing on iOS:**
```powershell
# Navigate to project
Set-Location "c:\Users\User\Documents\SEM 7\INDUSTRIAL THINGS\NES SOLUTION & NETWORK SDN BHD\SortMaster Mobile\sortmaster-mobile"

# Build and sync
node .\node_modules\vite\bin\vite.js build
node .\node_modules\@capacitor\cli\bin\capacitor sync ios

# Open in Xcode
node .\node_modules\@capacitor\cli\bin\capacitor open ios
```

**For Testing on Android:**
```powershell
# Navigate to project
Set-Location "c:\Users\User\Documents\SEM 7\INDUSTRIAL THINGS\NES SOLUTION & NETWORK SDN BHD\SortMaster Mobile\sortmaster-mobile"

# Build and sync
node .\node_modules\vite\bin\vite.js build
node .\node_modules\@capacitor\cli\bin\capacitor sync android

# Open in Android Studio
node .\node_modules\@capacitor\cli\bin\capacitor open android
```

## Running on Physical Devices

### iOS (iPhone/iPad)
1. Connect device via USB
2. Trust computer on device
3. In Xcode: Select your device from device list
4. Click Run (▶)
5. First time: Go to Settings → General → Device Management → Trust developer

### Android
1. Enable Developer Mode on device:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging
3. Connect via USB
4. In Android Studio: Select your device
5. Click Run (▶)

## Common Issues

### Path Issues (Windows)
Due to the "&" in your folder path, always use the full commands shown above instead of npm scripts.

### Camera Not Working
- iOS: Check `ios/App/App/Info.plist` has camera permission description
- Android: Check `android/app/src/main/AndroidManifest.xml` has camera permission

### App Won't Install
- iOS: Check signing certificate in Xcode
- Android: Uninstall old version first

## Key Files

- `capacitor.config.ts` - App configuration
- `ios/` - Native iOS project (commit the folder structure, ignore build artifacts)
- `android/` - Native Android project (commit the folder structure, ignore build artifacts)

## Pro Tips

1. **Live Reload on Device**: Use Capacitor's live reload feature for faster development
2. **Debug Console**: 
   - iOS: Safari → Develop → [Your Device]
   - Android: Chrome → chrome://inspect
3. **Keep Native Projects**: Commit the `ios/` and `android/` folders to version control
