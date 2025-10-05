import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import '../models/chat_models.dart';
import '../config.dart';

/// Chat Service for managing chat operations
/// Handles chat history, saving, loading, and synchronization with backend
class ChatService {
  static final ChatService _instance = ChatService._internal();
  factory ChatService() => _instance;
  ChatService._internal();

  final String baseUrl = AppConfig.baseUrl;
  final int timeout = 10000;

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

  /// Get chat history from backend
  Future<List<Chat>> getChatHistory() async {
    try {
      final token = await _getAuthToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }

      final response = await http.get(
        Uri.parse('$baseUrl/api/chatbot/chats'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(Duration(milliseconds: timeout));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final chatResponse = ChatHistoryResponse.fromJson(data);
        
        if (chatResponse.success) {
          return chatResponse.chats;
        } else {
          throw Exception('Failed to load chat history');
        }
      } else {
        throw Exception('Failed to load chat history: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) print('Error loading chat history: $e');
      return [];
    }
  }

  /// Save chat history to backend
  Future<bool> saveChatHistory(List<Chat> chats) async {
    try {
      final token = await _getAuthToken();
      if (token == null) {
        throw Exception('User not authenticated');
      }

      final payload = {
        'chats': chats.map((chat) => chat.toJson()).toList(),
      };

      final response = await http.post(
        Uri.parse('$baseUrl/api/chatbot/chats'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(payload),
      ).timeout(Duration(milliseconds: timeout));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['success'] == true;
      } else {
        throw Exception('Failed to save chat history: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) print('Error saving chat history: $e');
      return false;
    }
  }

  /// Save a single chat
  Future<bool> saveChat(Chat chat) async {
    try {
      // Get current chat history
      final currentChats = await getChatHistory();
      
      // Update or add the chat
      final existingIndex = currentChats.indexWhere((c) => c.id == chat.id);
      if (existingIndex >= 0) {
        currentChats[existingIndex] = chat;
      } else {
        currentChats.insert(0, chat); // Add to beginning
      }

      // Keep only last 50 chats
      if (currentChats.length > 50) {
        currentChats.removeRange(50, currentChats.length);
      }

      return await saveChatHistory(currentChats);
    } catch (e) {
      if (kDebugMode) print('Error saving chat: $e');
      return false;
    }
  }

  /// Delete a chat
  Future<bool> deleteChat(String chatId) async {
    try {
      final currentChats = await getChatHistory();
      currentChats.removeWhere((chat) => chat.id == chatId);
      return await saveChatHistory(currentChats);
    } catch (e) {
      if (kDebugMode) print('Error deleting chat: $e');
      return false;
    }
  }

  /// Get a specific chat by ID
  Future<Chat?> getChatById(String chatId) async {
    try {
      final chats = await getChatHistory();
      return chats.firstWhere(
        (chat) => chat.id == chatId,
        orElse: () => throw Exception('Chat not found'),
      );
    } catch (e) {
      if (kDebugMode) print('Error getting chat by ID: $e');
      return null;
    }
  }

  /// Create a new chat
  Chat createNewChat() {
    final now = DateTime.now();
    return Chat(
      id: now.millisecondsSinceEpoch.toString(),
      title: 'New Chat',
      messages: [],
      createdAt: now,
      updatedAt: now,
    );
  }

  /// Add a message to a chat
  Chat addMessageToChat(Chat chat, ChatMessage message) {
    final updatedMessages = List<ChatMessage>.from(chat.messages)..add(message);
    
    // Generate title from first user message if it's still "New Chat"
    String title = chat.title;
    if (title == 'New Chat' && message.role == 'user') {
      title = chat.generateTitle();
    }

    return chat.copyWith(
      messages: updatedMessages,
      title: title,
      updatedAt: DateTime.now(),
    );
  }

  /// Format date for display
  String formatChatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays == 0) {
      return 'Today';
    } else if (difference.inDays == 1) {
      return 'Yesterday';
    } else if (difference.inDays < 7) {
      return '${difference.inDays} days ago';
    } else {
      return '${date.day}/${date.month}/${date.year}';
    }
  }
}
