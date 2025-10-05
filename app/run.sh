#!/bin/bash

# Hereco AI Chatbot - Flutter App Launcher
# This script helps you run the Flutter app with different configurations

echo "🚀 Hereco AI Chatbot - Flutter App"
echo "=================================="

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    echo "❌ Flutter is not installed or not in PATH"
    echo "Please install Flutter: https://docs.flutter.dev/get-started/install"
    exit 1
fi

# Check Flutter version
echo "📱 Flutter version:"
flutter --version

echo ""
echo "🔧 Available commands:"
echo "1. Run in debug mode (default)"
echo "2. Run in release mode"
echo "3. Build APK for Android"
echo "4. Build for iOS"
echo "5. Build for Web"
echo "6. Run tests"
echo "7. Clean and get dependencies"
echo ""

# Function to run the app
run_app() {
    echo "🏃 Running Flutter app..."
    flutter run
}

# Function to run in release mode
run_release() {
    echo "🏃 Running Flutter app in release mode..."
    flutter run --release
}

# Function to build APK
build_apk() {
    echo "📦 Building Android APK..."
    flutter build apk --release
    echo "✅ APK built successfully!"
    echo "📁 APK location: build/app/outputs/flutter-apk/app-release.apk"
}

# Function to build for iOS
build_ios() {
    echo "📦 Building for iOS..."
    flutter build ios --release
    echo "✅ iOS build completed!"
}

# Function to build for Web
build_web() {
    echo "📦 Building for Web..."
    flutter build web --release
    echo "✅ Web build completed!"
    echo "📁 Web files location: build/web/"
}

# Function to run tests
run_tests() {
    echo "🧪 Running tests..."
    flutter test
}

# Function to clean and get dependencies
clean_get() {
    echo "🧹 Cleaning and getting dependencies..."
    flutter clean
    flutter pub get
    echo "✅ Clean and get completed!"
}

# Main menu
if [ $# -eq 0 ]; then
    echo "Choose an option (1-7) or press Enter for default (1):"
    read -r choice
    case $choice in
        1|"")
            run_app
            ;;
        2)
            run_release
            ;;
        3)
            build_apk
            ;;
        4)
            build_ios
            ;;
        5)
            build_web
            ;;
        6)
            run_tests
            ;;
        7)
            clean_get
            ;;
        *)
            echo "❌ Invalid option. Running default..."
            run_app
            ;;
    esac
else
    case $1 in
        "debug"|"run")
            run_app
            ;;
        "release")
            run_release
            ;;
        "apk"|"android")
            build_apk
            ;;
        "ios")
            build_ios
            ;;
        "web")
            build_web
            ;;
        "test")
            run_tests
            ;;
        "clean")
            clean_get
            ;;
        *)
            echo "❌ Unknown command: $1"
            echo "Available commands: debug, release, apk, ios, web, test, clean"
            exit 1
            ;;
    esac
fi
