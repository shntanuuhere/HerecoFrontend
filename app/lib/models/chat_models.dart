/// Chat models for Flutter app
/// Matches the backend MongoDB schema structure

class ChatMessage {
  final String id;
  final String role; // 'user', 'assistant', 'system'
  final String content;
  final DateTime timestamp;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['id'] ?? '',
      role: json['role'] ?? 'user',
      content: json['content'] ?? '',
      timestamp: DateTime.tryParse(json['timestamp'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'role': role,
      'content': content,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  ChatMessage copyWith({
    String? id,
    String? role,
    String? content,
    DateTime? timestamp,
  }) {
    return ChatMessage(
      id: id ?? this.id,
      role: role ?? this.role,
      content: content ?? this.content,
      timestamp: timestamp ?? this.timestamp,
    );
  }
}

class Chat {
  final String id;
  final String title;
  final List<ChatMessage> messages;
  final DateTime createdAt;
  final DateTime updatedAt;

  Chat({
    required this.id,
    required this.title,
    required this.messages,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Chat.fromJson(Map<String, dynamic> json) {
    return Chat(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Untitled Chat',
      messages: (json['messages'] as List<dynamic>?)
          ?.map((msg) => ChatMessage.fromJson(msg))
          .toList() ?? [],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'messages': messages.map((msg) => msg.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  Chat copyWith({
    String? id,
    String? title,
    List<ChatMessage>? messages,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Chat(
      id: id ?? this.id,
      title: title ?? this.title,
      messages: messages ?? this.messages,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Get the last user message for title generation
  String get lastUserMessage {
    for (int i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role == 'user') {
        return messages[i].content;
      }
    }
    return 'New Chat';
  }

  /// Generate a title from the first user message
  String generateTitle() {
    final firstUserMessage = messages.firstWhere(
      (msg) => msg.role == 'user',
      orElse: () => ChatMessage(
        id: '',
        role: 'user',
        content: 'New Chat',
        timestamp: DateTime.now(),
      ),
    );
    
    if (firstUserMessage.content.length > 30) {
      return '${firstUserMessage.content.substring(0, 30)}...';
    }
    return firstUserMessage.content;
  }
}

class ChatHistoryResponse {
  final bool success;
  final List<Chat> chats;
  final String userId;
  final String database;
  final String collection;
  final String timestamp;

  ChatHistoryResponse({
    required this.success,
    required this.chats,
    required this.userId,
    required this.database,
    required this.collection,
    required this.timestamp,
  });

  factory ChatHistoryResponse.fromJson(Map<String, dynamic> json) {
    return ChatHistoryResponse(
      success: json['success'] ?? false,
      chats: (json['chats'] as List<dynamic>?)
          ?.map((chat) => Chat.fromJson(chat))
          .toList() ?? [],
      userId: json['userId'] ?? '',
      database: json['database'] ?? '',
      collection: json['collection'] ?? '',
      timestamp: json['timestamp'] ?? '',
    );
  }
}
