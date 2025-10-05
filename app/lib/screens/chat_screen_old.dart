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

  Future<void> _loadChatHistory() async {
    try {
      // First try to load from backend
      final apiService = ApiService();
      final backendHistory = await apiService.getChatHistory();
      
      if (backendHistory.isNotEmpty) {
        // Use backend history if available
        setState(() {
          _messages.clear();
          for (var chat in backendHistory) {
            final messages = chat['messages'] as List<dynamic>? ?? [];
            for (var msg in messages) {
              _messages.add(ChatMessage(
                content: msg['content'] ?? '',
                isUser: msg['isUser'] ?? false,
                timestamp: msg['timestamp'] ?? '',
              ));
            }
          }
        });
      } else {
        // Fallback to local storage
        final prefs = await SharedPreferences.getInstance();
        final chatHistory = prefs.getString('chatHistory');
        
        if (chatHistory != null) {
          final List<dynamic> history = json.decode(chatHistory);
          setState(() {
            _messages.clear();
            for (var msg in history) {
              _messages.add(ChatMessage(
                content: msg['content'] ?? '',
                isUser: msg['isUser'] ?? false,
                timestamp: msg['timestamp'] ?? '',
              ));
            }
          });
        }
      }
    } catch (e) {
      debugPrint('Error loading chat history: $e');
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
      ),
    );
  }


  Future<void> _saveChatHistory() async {
    try {
      // Save to local storage first
      final prefs = await SharedPreferences.getInstance();
      final history = _messages.map((msg) => {
        'content': msg.content,
        'isUser': msg.isUser,
        'timestamp': msg.timestamp,
      }).toList();
      await prefs.setString('chatHistory', json.encode(history));

      // Also save to backend
      final apiService = ApiService();
      final chatData = [{
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'title': _messages.isNotEmpty ? _messages.first.content.substring(0, _messages.first.content.length > 50 ? 50 : _messages.first.content.length) : 'New Chat',
        'messages': history,
        'timestamp': DateTime.now().toIso8601String(),
      }];
      
      await apiService.saveChatHistory(chatData);
    } catch (e) {
      debugPrint('Error saving chat history: $e');
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
                                color: Colors.white.withValues(alpha: 0.2),
                                width: 1,
                              ),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.2),
                                  ),
                                ),
                                child: const Icon(
                                  Icons.dataset,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ),
                              const Spacer(),
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.2),
                                  ),
                                ),
                                child: const Icon(
                                  Icons.add,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                        
                        // New Chat Button
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Container(
                            width: double.infinity,
                            height: 40,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: Colors.white.withValues(alpha: 0.2),
                              ),
                            ),
                            child: const Center(
                              child: Text(
                                'New chat',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                        ),
                        
                        // Recent Chats
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Text(
                              'RECENT',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                letterSpacing: 1,
                              ),
                            ),
                          ),
                        ),
                        
                        const SizedBox(height: 8),
                        
                        // Chat History
                        Expanded(
                          child: ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: 5, // Mock chat history
                            itemBuilder: (context, index) {
                              final chatTitles = ['HWY', 'WHO IS NIKHIL KAMATH', 'HOLAA', 'HEY', 'QUANTUM COMPUTING'];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: Colors.white.withValues(alpha: 0.2),
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      chatTitles[index],
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Invalid Date',
                                      style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.6),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                        
                        // User Profile
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            border: Border(
                              top: BorderSide(
                                color: Colors.white.withValues(alpha: 0.2),
                                width: 1,
                              ),
                            ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: const Color(0xFFf97316),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Icon(
                                  Icons.person,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ),
                              const SizedBox(width: 12),
                              const Expanded(
                                child: Text(
                                  'taleshereco',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              PopupMenuButton<String>(
                                onSelected: (value) {
                                  if (value == 'logout') {
                                    _logout();
                                  }
                                },
                                itemBuilder: (BuildContext context) => [
                                  const PopupMenuItem<String>(
                                    value: 'logout',
                                    child: Row(
                                      children: [
                                        Icon(Icons.logout),
                                        SizedBox(width: 8),
                                        Text('Logout'),
                                      ],
                                    ),
                                  ),
                                ],
                                child: const Icon(
                                  Icons.more_vert,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
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
                        const Text(
                          'Stewie',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Chat Messages or Welcome Screen
                  Expanded(
                    child: _messages.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  'How can I help you today?',
                                  style: TextStyle(
                                    fontSize: 32,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 24),
                                
                                // Suggested Actions
                                Wrap(
                                  spacing: 16,
                                  runSpacing: 16,
                                  children: [
                                    _buildSuggestionCard('Explain quantum computing'),
                                    _buildSuggestionCard('Write a creative story'),
                                    _buildSuggestionCard('Help me plan a trip'),
                                    _buildSuggestionCard('Solve a math problem'),
                                  ],
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            controller: _scrollController,
                            padding: const EdgeInsets.all(16.0),
                            itemCount: _messages.length + (_isLoading ? 1 : 0),
                            itemBuilder: (context, index) {
                              if (index == _messages.length && _isLoading) {
                                return const _TypingIndicator();
                              }
                              return _ChatBubble(message: _messages[index]);
                            },
                          ),
                  ),
                  
                  // Message Input
                  Container(
                    padding: const EdgeInsets.all(16),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.2),
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _messageController,
                                  style: const TextStyle(color: Colors.white),
                                  decoration: const InputDecoration(
                                    hintText: 'Ask anything...',
                                    hintStyle: TextStyle(
                                      color: Colors.white54,
                                    ),
                                    border: InputBorder.none,
                                    contentPadding: EdgeInsets.symmetric(
                                      horizontal: 16,
                                      vertical: 12,
                                    ),
                                  ),
                                  maxLines: null,
                                  onSubmitted: (_) => _sendMessage(),
                                ),
                              ),
                              IconButton(
                                onPressed: _isLoading ? null : _sendMessage,
                                icon: _isLoading
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      )
                                    : const Icon(
                                        Icons.send,
                                        color: Colors.white,
                                      ),
                              ),
                            ],
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
    );
  }
  
  Widget _buildSuggestionCard(String text) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.2),
            ),
          ),
          child: Text(
            text,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

class ChatMessage {
  final String content;
  final bool isUser;
  final String timestamp;

  ChatMessage({
    required this.content,
    required this.isUser,
    required this.timestamp,
  });
}

class _ChatBubble extends StatelessWidget {
  final ChatMessage message;

  const _ChatBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        mainAxisAlignment: message.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!message.isUser) ...[
            CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFF3B82F6),
              child: const Icon(
                Icons.smart_toy,
                size: 16,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: message.isUser 
                        ? const Color(0xFF3B82F6).withValues(alpha: 0.8)
                        : Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        message.content,
                        style: TextStyle(
                          color: message.isUser ? Colors.white : Colors.white,
                          fontSize: 16,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _formatTimestamp(message.timestamp),
                        style: TextStyle(
                          color: message.isUser 
                              ? Colors.white.withValues(alpha: 0.7)
                              : Colors.white.withValues(alpha: 0.6),
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (message.isUser) ...[
            const SizedBox(width: 8),
            CircleAvatar(
              radius: 16,
              backgroundColor: const Color(0xFFf97316),
              child: const Icon(
                Icons.person,
                size: 16,
                color: Colors.white,
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _formatTimestamp(String timestamp) {
    try {
      final dateTime = DateTime.parse(timestamp);
      final now = DateTime.now();
      final difference = now.difference(dateTime);
      
      if (difference.inMinutes < 1) {
        return 'Just now';
      } else if (difference.inHours < 1) {
        return '${difference.inMinutes}m ago';
      } else if (difference.inDays < 1) {
        return '${difference.inHours}h ago';
      } else {
        return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
      }
    } catch (e) {
      return 'Unknown';
    }
  }
}

class _TypingIndicator extends StatelessWidget {
  const _TypingIndicator();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: const Color(0xFF3B82F6),
            child: const Icon(
              Icons.smart_toy,
              size: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.2),
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(
                          Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Stewie is thinking...',
                      style: TextStyle(
                        color: Colors.white,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}