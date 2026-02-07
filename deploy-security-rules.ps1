# Firebase Security Rules Deployment Script
# This script deploys both Firestore and Storage security rules to Firebase

Write-Host "🔐 Firebase Security Rules Deployment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "Checking Firebase CLI installation..." -ForegroundColor Yellow
$firebaseInstalled = Get-Command firebase -ErrorAction SilentlyContinue

if (-not $firebaseInstalled) {
    Write-Host "❌ Firebase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Firebase CLI first:" -ForegroundColor Yellow
    Write-Host "  npm install -g firebase-tools" -ForegroundColor White
    Write-Host ""
    Write-Host "Or deploy manually via Firebase Console:" -ForegroundColor Yellow
    Write-Host "  https://console.firebase.google.com/project/sortmaster-app-5821" -ForegroundColor White
    exit 1
}

Write-Host "✅ Firebase CLI found" -ForegroundColor Green
Write-Host ""

# Check if user is logged in
Write-Host "Checking Firebase login status..." -ForegroundColor Yellow
$loginCheck = firebase login:list 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Not logged in to Firebase" -ForegroundColor Yellow
    Write-Host "Attempting to login..." -ForegroundColor Yellow
    firebase login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Logged in to Firebase" -ForegroundColor Green
Write-Host ""

# Display current project
Write-Host "Current Firebase project:" -ForegroundColor Yellow
firebase use

Write-Host ""
Write-Host "📋 Files to deploy:" -ForegroundColor Cyan
Write-Host "  - firestore.rules (Firestore Security Rules)" -ForegroundColor White
Write-Host "  - storage.rules (Storage Security Rules)" -ForegroundColor White
Write-Host ""

# Confirm deployment
$confirmation = Read-Host "Deploy security rules to Firebase? (y/N)"

if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🚀 Deploying security rules..." -ForegroundColor Cyan
Write-Host ""

# Deploy Firestore rules
Write-Host "Deploying Firestore rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Firestore rules deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Firestore rules deployment failed!" -ForegroundColor Red
    Write-Host "Please check the error above and try again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Deploy Storage rules
Write-Host "Deploying Storage rules..." -ForegroundColor Yellow
firebase deploy --only storage

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Storage rules deployed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Storage rules deployment failed!" -ForegroundColor Yellow
    Write-Host "This might be because storage.rules is not configured in firebase.json" -ForegroundColor Yellow
    Write-Host "You can deploy storage rules manually via Firebase Console." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Set up admin users (see FIREBASE_SECURITY_GUIDE.md)" -ForegroundColor White
Write-Host "  2. Test the rules with your app" -ForegroundColor White
Write-Host "  3. Verify in Firebase Console:" -ForegroundColor White
Write-Host "     https://console.firebase.google.com/project/sortmaster-app-5821" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Make sure to set up admin users!" -ForegroundColor Yellow
Write-Host "   Without admin setup, the 'Delete All Logs' feature won't work." -ForegroundColor Yellow
Write-Host ""
