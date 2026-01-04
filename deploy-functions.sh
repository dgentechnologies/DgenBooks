#!/bin/bash
# Deployment script for DgenBooks Cloud Functions
# This script ensures push notifications work properly

set -e  # Exit on error

echo "🚀 DgenBooks Cloud Functions Deployment Script"
echo "=============================================="
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found!"
    echo "📦 Install it with: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI found"
echo ""

# Check if logged in to Firebase
echo "🔐 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase"
    echo "🔑 Run: firebase login"
    exit 1
fi

echo "✅ Authenticated with Firebase"
echo ""

# Navigate to functions directory
cd "$(dirname "$0")/functions"

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building Cloud Functions..."
npm run build

echo ""
echo "🚀 Deploying to Firebase..."
cd ..
firebase deploy --only functions

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📋 Deployed Functions:"
echo "  - onPurchaseCreated (new expense notifications)"
echo "  - onPurchaseUpdated (expense update notifications)"
echo "  - onPurchaseDeleted (expense delete notifications)"
echo "  - onPurchaseRequestCreated (urgent request notifications)"
echo "  - onSettlementCreated (new settlement notifications)"
echo "  - onSettlementUpdated (settlement update notifications)"
echo "  - onSettlementDeleted (settlement delete notifications)"
echo ""
echo "🎉 Push notifications are now active!"
echo "💡 Users will receive notifications for all expense and settlement changes."
echo ""
echo "🔍 To view logs: firebase functions:log"
echo "📊 To check status: firebase functions:list"
