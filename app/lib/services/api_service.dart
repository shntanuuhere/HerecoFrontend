import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import '../config.dart';

/// Custom exception for quota exceeded errors
class QuotaExceededException implements Exception {
  final String message;
  final int retryAfter;
  
  QuotaExceededException(this.message, {required this.retryAfter});
  
  @override
  String toString() => 'QuotaExceededException: $message (retry after ${retryAfter}s)';
}

/// API Service for Flutter app backend communication
/// Handles all HTTP requests to the backend API with retry logic and error handling
class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  // Configuration
  final String baseUrl = AppConfig.baseUrl;
  final int timeout = 10000; // 10 seconds
  final int retryAttempts = 3;
  final int retryDelay = 1000; // 1 second
  final int minRequestInterval = 1000; // 1 second between requests

  // State management
  bool _connectionTested = false;
  bool _connectionValid = false;
  int _errorCount = 0;
  DateTime? _lastRequestTime;

  // Cache for performance
  final Map<String, dynamic> _cache = {};

  /// Get Firebase authentication token
  Future<String?> _getAuthToken() async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        return await user.getIdToken();
      }
    } catch (e) {
      if (kDebugMode) print('Error getting Firebase token: $e');
    }
    return null;
  }

  /// Throttle requests to avoid rate limiting
  Future<void> _throttleRequest() async {
    if (_lastRequestTime != null) {
      final timeSinceLastRequest = DateTime.now().difference(_lastRequestTime!);
      if (timeSinceLastRequest.inMilliseconds < minRequestInterval) {
        final waitTime = minRequestInterval - timeSinceLastRequest.inMilliseconds;
        await Future.delayed(Duration(milliseconds: waitTime));
      }
    }
    _lastRequestTime = DateTime.now();
  }

  /// Check if error should trigger a retry
  bool _shouldRetry(dynamic error) {
    if (error is SocketException) return true;
    if (error is HttpException) return true;
    if (error.toString().contains('Connection refused')) return true;
    if (error.toString().contains('Network is unreachable')) return true;
    return false;
  }

  /// Handle API errors with proper error messages
  String _handleError(dynamic error) {
    _errorCount++;
    
    if (error is SocketException) {
      return 'Network error. Please check your internet connection.';
    } else if (error is HttpException) {
      return 'Server error. Please try again later.';
    } else if (error.toString().contains('401')) {
      return 'Authentication required. Please log in again.';
    } else if (error.toString().contains('403')) {
      return 'Access denied. Please check your permissions.';
    } else if (error.toString().contains('404')) {
      return 'Service not found. Please try again later.';
    } else if (error.toString().contains('500')) {
      return 'Server error. Please try again later.';
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }

  /// Make HTTP request with retry logic
  Future<http.Response> _makeRequest(
    String endpoint, {
    Map<String, String>? headers,
    Object? body,
    int attempt = 1,
  }) async {
    await _throttleRequest();

    try {
      final url = Uri.parse('$baseUrl$endpoint');
      final authToken = await _getAuthToken();

      // Prepare headers
      final requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        ...?headers,
      };

      if (authToken != null) {
        requestHeaders['Authorization'] = 'Bearer $authToken';
      }

      // Make request with timeout
      final response = await http
          .post(
            url,
            headers: requestHeaders,
            body: body != null ? json.encode(body) : null,
          )
          .timeout(Duration(milliseconds: timeout));

      // Mark connection as valid on successful request
      if (!_connectionValid) {
        _connectionValid = true;
        _connectionTested = true;
      }

      return response;

    } catch (error) {
      if (kDebugMode) print('Request error for $endpoint: $error');

      // Retry logic
      if (attempt < retryAttempts && _shouldRetry(error)) {
        final delayTime = retryDelay * (attempt * attempt); // Exponential backoff
        if (kDebugMode) print('Request failed, retrying in ${delayTime}ms... (attempt ${attempt + 1})');
        await Future.delayed(Duration(milliseconds: delayTime));
        return _makeRequest(endpoint, headers: headers, body: body, attempt: attempt + 1);
      }

      throw _handleError(error);
    }
  }

  /// Test backend connection
  Future<bool> testConnection() async {
    try {
      final response = await _makeRequest('/api/health');
      _connectionValid = response.statusCode == 200;
      _connectionTested = true;
      return _connectionValid;
    } catch (e) {
      if (kDebugMode) print('Connection test failed: $e');
      _connectionValid = false;
      _connectionTested = true;
      return false;
    }
  }

  /// Send message to AI chatbot
  Future<Map<String, dynamic>> sendToAI({
    required List<Map<String, dynamic>> messages,
    String model = 'gemini-1.5-flash',
    int maxTokens = 1000,
    double temperature = 0.7,
  }) async {
    try {
      // Validate conversation history
      final validatedHistory = _validateConversationHistory(messages);
      
      final payload = {
        'model': model,
        'messages': validatedHistory,
        'max_tokens': maxTokens,
        'temperature': temperature,
      };

      if (kDebugMode) print('Sending payload to backend: $payload');

      final response = await _makeRequest(
        AppConfig.chatbotEndpoint,
        body: payload,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data;
      } else if (response.statusCode == 429) {
        // Handle quota exceeded error
        final data = json.decode(response.body);
        throw QuotaExceededException(
          data['error'] ?? 'API quota exceeded',
          retryAfter: data['retryAfter'] ?? 8,
        );
      } else {
        final errorText = response.body;
        throw Exception('HTTP ${response.statusCode}: $errorText');
      }
    } catch (e) {
      if (kDebugMode) print('Error sending message to AI: $e');
      rethrow;
    }
  }

  /// Validate conversation history format
  List<Map<String, dynamic>> _validateConversationHistory(List<Map<String, dynamic>> messages) {
    return messages
        .where((msg) => 
            msg.containsKey('role') && 
            msg.containsKey('content') && 
            msg['content'].toString().trim().isNotEmpty)
        .map((msg) => {
          'role': msg['role'],
          'content': msg['content'].toString().trim(),
        })
        .toList();
  }

  /// Get chat history from backend
  Future<List<Map<String, dynamic>>> getChatHistory() async {
    try {
      final response = await _makeRequest(AppConfig.chatHistoryEndpoint);
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<Map<String, dynamic>>.from(data['chats'] ?? []);
      } else {
        throw Exception('Failed to load chat history: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) print('Error loading chat history: $e');
      return [];
    }
  }

  /// Save chat history to backend
  Future<bool> saveChatHistory(List<Map<String, dynamic>> chats) async {
    try {
      final payload = {
        'chats': chats,
      };

      final response = await _makeRequest(
        AppConfig.chatHistoryEndpoint,
        body: payload,
      );

      return response.statusCode == 200;
    } catch (e) {
      if (kDebugMode) print('Error saving chat history: $e');
      return false;
    }
  }

  /// Get available AI models
  Future<List<String>> getAvailableModels() async {
    try {
      final response = await _makeRequest('/api/chatbot/models');
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return List<String>.from(data['models'] ?? []);
      } else {
        throw Exception('Failed to load models: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) print('Error loading models: $e');
      return ['gemini-1.5-flash']; // Default fallback
    }
  }

  /// Search status check
  Future<Map<String, dynamic>> getSearchStatus() async {
    try {
      final response = await _makeRequest('/api/search/status');
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to get search status: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) print('Error getting search status: $e');
      return {'enabled': false, 'error': e.toString()};
    }
  }

  /// Comprehensive search
  Future<Map<String, dynamic>> performSearch(String query) async {
    try {
      final payload = {
        'query': query,
        'sources': ['google', 'wikipedia'],
      };

      final response = await _makeRequest(
        '/api/search/comprehensive',
        body: payload,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Search failed: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) print('Error performing search: $e');
      return {'results': [], 'error': e.toString()};
    }
  }

  /// Clear cache and reset connection
  void clearCache() {
    _cache.clear();
    _connectionValid = false;
    _connectionTested = false;
    _errorCount = 0;
  }

  /// Get AI service status
  Future<Map<String, dynamic>> getAIServiceStatus() async {
    try {
      final response = await _makeRequest('/api/chatbot/status');
      
      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        throw Exception('Failed to get AI service status: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) print('Error getting AI service status: $e');
      return {
        'success': false,
        'services': {
          'gemini': {'available': false},
          'cohere': {'available': false}
        }
      };
    }
  }

  /// Get connection status
  bool get isConnected => _connectionValid;
  bool get isConnectionTested => _connectionTested;
  int get errorCount => _errorCount;
}
