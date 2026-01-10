---
description: Build iOS App Without a Mac (Cloud CI/CD)
---

# Building iOS App Without a Mac

Since Apple requires macOS to build iOS apps (`.ipa` files), and you are on Windows, the best solution is to use a **Cloud Build Service**. These services verify your code and build the app on their remote Mac servers.

## Option 1: Codemagic (Recommended for Flutter)

Codemagic is designed specifically for Flutter and is very easy to set up.

1.  **Push your code** to a Git repository (GitHub, GitLab, or Bitbucket).
2.  **Sign up** at [codemagic.io](https://codemagic.io/) (Free tier includes 500 build minutes/month).
3.  **Add Application**: Connect your repository.
4.  **Configure Build**:
    *   Select "iOS" as the build platform.
    *   Choose "Release" mode.
    *   You will need an **Apple Developer Account** ($99/year) to generate the necessary Signing Certificates and Provisioning Profiles. Codemagic can handle the signing automatically if you connect your Apple Developer account.
5.  **Start Build**: Click "Start new build".
6.  **Download**: Once finished, Codemagic will provide a link to download the `.ipa` file.

## Option 2: GitHub Actions

If you already use GitHub, you can use their Actions to build on a macOS runner.

1.  Create a file in your repo: `.github/workflows/ios-build.yml`.
2.  Paste a standard Flutter iOS build configuration (example below).
3.  **Note**: Managing Apple Signing Certificates (p12 files and heavy provisioning profiles) manually in GitHub Secrets is more complex than Codemagic's automated approach.

### Example GitHub Actions Workflow (Simplified)

```yaml
name: iOS Build
on: [push]
jobs:
  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: subosito/flutter-action@v2
        with:
          channel: 'stable'
      - run: flutter pub get
      - run: flutter build ios --release --no-codesign
      # Note: Use --no-codesign only to verify build. 
      # For a real .ipa, you MUST set up signing certificates.
```

## Summary

*   **Easiest**: Use **Codemagic**. It handles the complex Apple signing process automatically.
*   **Requirement**: For *any* method (Mac, Cloud, or VM), you need a paid **Apple Developer Program** membership ($99/year) to sign the app and install it on real iPhones (via TestFlight or App Store). Without this, you cannot validly sign the `.ipa` for distribution.
