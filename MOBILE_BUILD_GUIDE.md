# SortMaster Mobile - iOS & Android App

This React application has been successfully converted to a native mobile app for iOS and Android using Capacitor.

## 🚀 What's Been Done

### ✅ Installed Dependencies
- **@capacitor/core** - Core Capacitor functionality
- **@capacitor/cli** - Capacitor command-line tools
- **@capacitor/ios** - iOS platform support
- **@capacitor/android** - Android platform support
- **@capacitor/camera** - Native camera access
- **@capacitor/status-bar** - Status bar customization
- **@capacitor/splash-screen** - Splash screen management

### ✅ Configuration Files Created
- **capacitor.config.ts** - Main Capacitor configuration
- Mobile-optimized **index.html** with proper viewport settings
- Updated **App.tsx** with Capacitor initialization
- Enhanced **index.css** with mobile-specific styles (safe areas, touch optimizations)

### ✅ Native Projects Generated
- **ios/** - Native Xcode project for iOS
- **android/** - Native Android Studio project

## 📱 Building and Running

### Prerequisites

#### For iOS Development:
- macOS computer (required)
- Xcode 14+ installed from Mac App Store
- Xcode Command Line Tools: `xcode-select --install`
- CocoaPods: `sudo gem install cocoapods`

#### For Android Development:
- Android Studio installed
- Android SDK (API level 22+)
- Java Development Kit (JDK) 17+

### Build Commands

#### Web Development (with hot reload)
```bash
npm run dev
```

#### Build for Production
```bash
npm run build
```

#### Build and Sync to Mobile Platforms
```bash
# Sync to both platforms
npm run build:mobile

# Or sync individually
npm run build:ios
npm run build:android
```

### Opening in Native IDEs

#### iOS (macOS only)
```bash
npm run cap:open:ios
```
Then in Xcode:
1. Select your development team in Signing & Capabilities
2. Choose a simulator or connected device
3. Click Run (▶) button

#### Android
```bash
npm run cap:open:android
```
Then in Android Studio:
1. Wait for Gradle sync to complete
2. Select an emulator or connected device
3. Click Run (▶) button

### Syncing Code Changes

After making changes to your web code:
```bash
# Build and sync to all platforms
npm run build:mobile

# Or sync to specific platform
npm run cap:sync:ios
npm run cap:sync:android
```

## 📝 Important Notes

### Camera Permissions
The BarcodeScanner component uses HTML5 camera access. For better performance, you can integrate the Capacitor Camera API directly.

### Path Issues
Due to special characters in your project path ("NES SOLUTION & NETWORK SDN BHD"), use these commands instead:
```powershell
# Set location first
Set-Location "c:\Users\User\Documents\SEM 7\INDUSTRIAL THINGS\NES SOLUTION & NETWORK SDN BHD\SortMaster Mobile\sortmaster-mobile"

# Then run build
node .\node_modules\vite\bin\vite.js build

# Then sync
node .\node_modules\@capacitor\cli\bin\capacitor sync
```

### App Identifier
The app is configured with ID: `com.sortmaster.mobile`
- Change this in `capacitor.config.ts` if needed
- Must match your Apple Developer account bundle ID (iOS)
- Must match your Google Play package name (Android)

## 🔧 Mobile-Specific Features

### Status Bar
- Automatically configured to light style
- Can be customized in `App.tsx`

### Splash Screen
- Shows for 2 seconds on app launch
- Configure in `capacitor.config.ts`

### Safe Areas
- Automatically handles iPhone notches and Android navigation bars
- Defined in `index.css` using `env(safe-area-inset-*)`

### Touch Optimizations
- Text selection disabled for better mobile UX
- Input font size set to 16px to prevent iOS zoom
- Overscroll behavior optimized

## 📦 Building for Production

### iOS App Store
1. Open project: `npm run cap:open:ios`
2. In Xcode, select "Any iOS Device"
3. Product → Archive
4. Follow App Store submission process

### Android Play Store
1. Open project: `npm run cap:open:android`
2. Build → Generate Signed Bundle/APK
3. Follow Google Play submission process

## 🆘 Troubleshooting

### "CocoaPods not installed" (iOS)
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

### "Gradle sync failed" (Android)
1. Open Android Studio
2. File → Invalidate Caches / Restart
3. Let Gradle sync complete

### Camera not working
- Check permissions in Info.plist (iOS) and AndroidManifest.xml (Android)
- Ensure HTTPS or localhost (camera requires secure context)

## 📚 Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS Development Guide](https://capacitorjs.com/docs/ios)
- [Android Development Guide](https://capacitorjs.com/docs/android)
