---
description: Build Android APK and iOS App
---

# Build Release Versions

## Android (APK)

To build a standalone APK file that can be installed on Android devices:

1.  Run the build command:
    ```bash
    flutter build apk --release
    ```

2.  The output file will be located at:
    `build/app/outputs/flutter-apk/app-release.apk`

3.  You can transfer this file to an Android device and install it.

## Android (App Bundle)

To build an App Bundle (.aab) for publishing to the Google Play Store:

1.  Run the build command:
    ```bash
    flutter build appbundle --release
    ```

2.  The output file will be located at:
    `build/app/outputs/bundle/release/app-release.aab`

## iOS (IPA)

**Requirement:** You must be using a Mac with Xcode installed to build iOS apps.

1.  Run the build command:
    ```bash
    flutter build ipa --release
    ```

2.  The output file will be located at:
    `build/ios/ipa/`

3.  To install on a device during development/testing without the App Store, you typically use TestFlight or install via Xcode.
