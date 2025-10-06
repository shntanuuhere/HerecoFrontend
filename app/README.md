# Stewie - AI Assistant Flutter App

A Flutter mobile application for the Hereco AI Chatbot, providing a native mobile experience with the same intelligent search capabilities as the web version.

## Features

✅ **Native Mobile Experience** - Optimized for mobile devices
✅ **Real-time Chat** - Instant messaging with AI assistant
✅ **Smart Search Integration** - Automatic live search for current information
✅ **Chat History** - Persistent conversation storage
✅ **Modern UI** - Material Design 3 with orange theme
✅ **Cross-platform** - Works on iOS, Android, and Web
✅ **Offline Support** - Cached conversations and graceful error handling

## Screenshots

- **Chat Interface**: Clean, modern chat UI with user and AI message bubbles
- **Typing Indicator**: Shows when AI is processing your message
- **Error Handling**: User-friendly error messages and retry options
- **Dark/Light Theme**: Automatic theme switching based on system preferences

## Getting Started

### Prerequisites

- Flutter SDK (3.9.2 or higher)
- Dart SDK
- Android Studio / VS Code with Flutter extensions
- iOS Simulator / Android Emulator (for testing)

### Installation

1. **Navigate to the app directory:**
   ```bash
   cd app
   ```

2. **Install dependencies:**
   ```bash
   flutter pub get
   ```

3. **Run the app:**
   ```bash
   flutter run
   ```

### Building for Production

**Android APK:**
```bash
flutter build apk --release
```

**iOS App:**
```bash
flutter build ios --release
```

**Web App:**
```bash
flutter build web --release
```

## Configuration

### Backend API

The app connects to your backend API at:
- **Base URL**: `https://hereco-backend.azurewebsites.net`
- **Chatbot Endpoint**: `/api/chatbot/ollama`
- **Chat History Endpoint**: `/api/chatbot/chats`

### Authentication

The app supports Firebase authentication:
- Stores user ID and token locally
- Sends authentication headers with API requests
- Maintains chat history per user

## App Structure

```
lib/
├── main.dart              # Main app entry point
├── models/                # Data models (if needed)
├── services/              # API services (if needed)
├── widgets/               # Custom widgets (if needed)
└── utils/                 # Utility functions (if needed)
```

## Key Features

### 1. Chat Interface
- **Message Bubbles**: User messages on right, AI messages on left
- **Timestamps**: Relative time display (e.g., "2m ago", "1h ago")
- **Typing Indicator**: Shows when AI is processing
- **Auto-scroll**: Automatically scrolls to latest message

### 2. Smart Search Integration
- **Automatic Detection**: AI decides when to search for current information
- **Google Search**: Live web search for current events
- **Wikipedia**: Comprehensive knowledge base
- **Intelligent Responses**: Combines your datasets with live search results

### 3. User Experience
- **Material Design 3**: Modern, accessible UI
- **Orange Theme**: Consistent with Hereco branding
- **Dark/Light Mode**: Automatic theme switching
- **Error Handling**: Graceful error messages and retry options
- **Offline Support**: Cached conversations when offline

### 4. Performance
- **Efficient Rendering**: Optimized list view for chat messages
- **Memory Management**: Proper disposal of controllers and resources
- **Network Optimization**: Efficient API calls with proper error handling

## API Integration

### Chatbot API
```dart
POST /api/chatbot/ollama
{
  "model": "gpt-oss:20b",
  "messages": [...],
  "max_tokens": 1000,
  "temperature": 0.7
}
```

### Chat History API
```dart
GET /api/chatbot/chats
Authorization: Bearer <token>
```

## Dependencies

- **http**: HTTP client for API calls
- **shared_preferences**: Local storage for user data
- **cupertino_icons**: iOS-style icons
- **flutter**: Flutter SDK

## Development

### Running Tests
```bash
flutter test
```

### Code Analysis
```bash
flutter analyze
```

### Formatting
```bash
flutter format .
```

## Deployment

### Android
1. Build release APK: `flutter build apk --release`
2. Upload to Google Play Store or distribute directly

### iOS
1. Build release iOS: `flutter build ios --release`
2. Upload to App Store Connect

### Web
1. Build web app: `flutter build web --release`
2. Deploy to web hosting (Firebase Hosting, Netlify, etc.)

## Troubleshooting

### Common Issues

1. **API Connection Issues**
   - Check backend URL configuration
   - Verify network connectivity
   - Check API endpoint availability

2. **Authentication Issues**
   - Ensure user is logged in
   - Check token validity
   - Verify Firebase configuration

3. **Build Issues**
   - Run `flutter clean` and `flutter pub get`
   - Check Flutter version compatibility
   - Verify platform-specific requirements

### Debug Mode
```bash
flutter run --debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Hereco AI Chatbot system and follows the same licensing terms.

## Support

For issues and questions:
- Check the main project documentation
- Review Flutter documentation
- Contact the development team