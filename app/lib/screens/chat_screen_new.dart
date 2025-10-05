import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:convert';
import 'dart:ui';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../services/chat_service.dart';
import '../models/chat_models.dart';
import '../widgets/chat_sidebar.dart';
import 'login_screen.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<ChatMessage> _messages = [];
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;
  bool _isSidebarOpen = false;
  
  // New chat system
  final ChatService _chatService = ChatService();
  Chat? _currentChat;
  String? _currentChatId;

  @override
  void initState() {
    super.initState();
    _initializeChatSystem();
    _testConnection();
  }

  Future<void> _initializeChatSystem() async {
    // Start with a new chat
    await _startNewChat();
  }

  Future<void> _testConnection() async {
    try {
      final apiService = ApiService();
      final isConnected = await apiService.testConnection();
      if (!isConnected) {
        _showError('Unable to connect to server. Some features may not work.');
      }
    } catch (e) {
      debugPrint('Connection test failed: $e');
    }
  }

  // New chat system methods
  Future<void> _startNewChat() async {
    setState(() {
      _currentChat = _chatService.createNewChat();
      _currentChatId = _currentChat!.id;
      _messages.clear();
    });
  }

  Future<void> _loadChat(String chatId) async {
    try {
      final chat = await _chatService.getChatById(chatId);
      if (chat != null) {
        setState(() {
          _currentChat = chat;
          _currentChatId = chatId;
          _messages.clear();
          _messages.addAll(chat.messages);
        });
        _scrollToBottom();
      }
    } catch (e) {
      _showError('Failed to load chat: $e');
    }
  }

  Future<void> _saveCurrentChat() async {
    if (_currentChat != null && _messages.isNotEmpty) {
      try {
        // Update current chat with messages
        final updatedChat = _currentChat!.copyWith(
          messages: _messages,
          updatedAt: DateTime.now(),
        );
        
        await _chatService.saveChat(updatedChat);
        setState(() {
          _currentChat = updatedChat;
        });
      } catch (e) {
        debugPrint('Error saving chat: $e');
      }
    }
  }

  Future<void> _deleteChat(String chatId) async {
    try {
      final success = await _chatService.deleteChat(chatId);
      if (success) {
        if (chatId == _currentChatId) {
          await _startNewChat();
        }
      } else {
        _showError('Failed to delete chat');
      }
    } catch (e) {
      _showError('Error deleting chat: $e');
    }
  }

  Future<void> _sendMessage() async {
    if (_messageController.text.trim().isEmpty || _isLoading) return;

    final userMessage = _messageController.text.trim();
    _messageController.clear();

    // Create user message
    final userChatMessage = ChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      role: 'user',
      content: userMessage,
      timestamp: DateTime.now(),
    );

    setState(() {
      _messages.add(userChatMessage);
      _isLoading = true;
    });

    _scrollToBottom();

    try {
      // Prepare conversation history for API
      final conversationHistory = _messages.map((msg) => {
        'role': msg.role,
        'content': msg.content,
        'timestamp': msg.timestamp.toIso8601String(),
      }).toList();

      // Use API service to send message
      final apiService = ApiService();
      final response = await apiService.sendToAI(
        messages: conversationHistory,
        model: 'gemini-1.5-flash',
        maxTokens: 1000,
        temperature: 0.7,
      );

      if (response['success'] == true) {
        // Create assistant message
        final assistantMessage = ChatMessage(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          role: 'assistant',
          content: response['response'] ?? 'No response received',
          timestamp: DateTime.now(),
        );

        setState(() {
          _messages.add(assistantMessage);
        });

        // Save chat with new messages
        await _saveCurrentChat();
      } else {
        _showError('Error: ${response['error'] ?? 'Unknown error'}');
      }
    } catch (e) {
      if (e.toString().contains('QuotaExceededException')) {
        _showError('API quota exceeded. Please try again in a few minutes.');
      } else {
        _showError('Network error: $e');
      }
    } finally {
      setState(() {
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _logout() async {
    try {
      await FirebaseAuth.instance.signOut();
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const LoginScreen()),
        );
      }
    } catch (e) {
      debugPrint('Logout error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          image: DecorationImage(
            image: NetworkImage('https://i.ibb.co/tp4YJ8ZJ/podcast-background.jpg'),
            fit: BoxFit.cover,
            opacity: 0.1,
          ),
        ),
        child: Row(
          children: [
            // Chat Sidebar (conditionally shown)
            if (_isSidebarOpen) ...[
              ChatSidebar(
                currentChatId: _currentChatId,
                onChatSelected: _loadChat,
                onNewChat: _startNewChat,
                onChatDeleted: _deleteChat,
              ),
            ],
            
            // Main Chat Area
            Expanded(
              child: Column(
                children: [
                  // Top Bar with Hamburger Menu
                  Container(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        // Hamburger Menu Button
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                            child: Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.2),
                                ),
                              ),
                              child: IconButton(
                                onPressed: () {
                                  setState(() {
                                    _isSidebarOpen = !_isSidebarOpen;
                                  });
                                },
                                icon: Icon(
                                  _isSidebarOpen ? Icons.close : Icons.menu,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                          ),
                        ),
                        
                        const SizedBox(width: 16),
                        
                        // Chat Title
                        Expanded(
                          child: Text(
                            _currentChat?.title ?? 'New Chat',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        
                        // User Profile & Logout
                        Row(
                          children: [
                            // User Profile
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.2),
                                ),
                              ),
                              child: const Icon(
                                Icons.person,
                                color: Colors.white,
                                size: 20,
                              ),
                            ),
                            
                            const SizedBox(width: 8),
                            
                            // Logout Button
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: BackdropFilter(
                                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                                child: Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: Colors.white.withValues(alpha: 0.2),
                                    ),
                                  ),
                                  child: IconButton(
                                    onPressed: _logout,
                                    icon: const Icon(
                                      Icons.logout,
                                      color: Colors.white,
                                      size: 20,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  
                  // Chat Messages
                  Expanded(
                    child: _messages.isEmpty
                        ? const Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.chat_bubble_outline,
                                  size: 64,
                                  color: Colors.white54,
                                ),
                                SizedBox(height: 16),
                                Text(
                                  'How can I help you today?',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 24,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                SizedBox(height: 8),
                                Text(
                                  'Start a conversation with me',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 16,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(16),
                            itemCount: _messages.length,
                            itemBuilder: (context, index) {
                              final message = _messages[index];
                              return _buildMessageBubble(message);
                            },
                          ),
                  ),
                  
                  // Loading indicator
                  if (_isLoading)
                    Container(
                      padding: const EdgeInsets.all(16),
                      child: const Row(
                        children: [
                          SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          ),
                          SizedBox(width: 12),
                          Text(
                            'AI is thinking...',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  
                  // Message Input
                  Container(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(24),
                            child: BackdropFilter(
                              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(24),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.2),
                                  ),
                                ),
                                child: TextField(
                                  controller: _messageController,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: const InputDecoration(
                                    hintText: 'Type your message...',
                                    hintStyle: TextStyle(color: Colors.white54),
                                    border: InputBorder.none,
                                    contentPadding: EdgeInsets.symmetric(
                                      horizontal: 20,
                                      vertical: 16,
                                    ),
                                  ),
                                  maxLines: null,
                                  onSubmitted: (_) => _sendMessage(),
                                ),
                              ),
                            ),
                          ),
                        ),
                        
                        const SizedBox(width: 12),
                        
                        // Send Button
                        ClipRRect(
                          borderRadius: BorderRadius.circular(24),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                            child: Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: Colors.blue.withValues(alpha: 0.8),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.2),
                                ),
                              ),
                              child: IconButton(
                                onPressed: _isLoading ? null : _sendMessage,
                                icon: const Icon(
                                  Icons.send,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage message) {
    final isUser = message.role == 'user';
    
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.blue.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.smart_toy,
                color: Colors.white,
                size: 16,
              ),
            ),
            const SizedBox(width: 8),
          ],
          
          Flexible(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isUser 
                        ? Colors.blue.withValues(alpha: 0.8)
                        : Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Text(
                    message.content,
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      height: 1.4,
                    ),
                  ),
                ),
              ),
            ),
          ),
          
          if (isUser) ...[
            const SizedBox(width: 8),
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(
                Icons.person,
                color: Colors.white,
                size: 16,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
