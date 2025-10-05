class AppConfig {
  // Backend API Configuration
  static const String baseUrl = 'https://hereco-backend.azurewebsites.net';
  static const String chatbotEndpoint = '/api/chatbot/gemini';
  static const String chatHistoryEndpoint = '/api/chatbot/chats';
  
  // App Configuration
  static const String appName = 'Stewie';
  static const String appVersion = '1.0.0';
  
  // Chat Configuration
  static const int maxTokens = 1000;
  static const double temperature = 0.7;
  static const String defaultModel = 'gemini-1.5-flash';
  
  // UI Configuration
  static const int animationDuration = 300;
  static const int typingIndicatorDelay = 1000;
  static const int maxMessageLength = 4000;
  
  // Storage Keys
  static const String userIdKey = 'userId';
  static const String userTokenKey = 'userToken';
  static const String chatHistoryKey = 'chatHistory';
  
  // Error Messages
  static const String networkError = 'Network error. Please check your connection.';
  static const String apiError = 'API error. Please try again.';
  static const String unknownError = 'An unknown error occurred.';
  static const String authError = 'Authentication required. Please log in.';
  
  // Success Messages
  static const String messageSent = 'Message sent successfully';
  static const String chatCleared = 'Chat cleared successfully';
}
