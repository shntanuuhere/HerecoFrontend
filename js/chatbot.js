/**
 * Chatbot Service for Gemini 1.5 8B Integration
 * Handles chat functionality, message management, and AI communication
 */

class ChatbotService {
    constructor() {
        this.messages = [];
        this.isTyping = false;
        this.currentModel = 'gemini-1.5-8b'; // Always use free model
        this.maxMessageLength = 4000;
        this.conversationHistory = [];
        this.isConnected = false;
        this.currentChatId = null;
        
        // Initialize chatbot
        this.init();
    }

    /**
     * Initialize the chatbot
     */
    async init() {
        // Wait a bit for Firebase to load, then check authentication
        setTimeout(async () => {
            if (!this.checkAuthentication()) {
                return;
            }
            
            this.setupEventListeners();
            await this.initializeChatFromURL();
            await this.updateChatHistory();
            this.testConnection();
            this.updateCharCount();
            this.autoResizeTextarea();
            
            // Set up authentication monitoring
            this.setupAuthCheck();
            
            // Set up browser history support
            this.setupHistorySupport();
        }, 1000);
    }

    /**
     * Check if user is authenticated
     */
    checkAuthentication() {
        console.log('Checking authentication...');
        
        // Check Firebase Auth
        if (typeof window.auth !== 'undefined') {
            console.log('Firebase auth available, currentUser:', window.auth.currentUser);
            if (window.auth.currentUser) {
                console.log('User authenticated via Firebase');
                return true;
            }
        } else {
            console.log('Firebase auth not available');
        }
        
        // Check authManager if available
        if (typeof window.authManager !== 'undefined') {
            console.log('AuthManager available, isLoggedIn:', window.authManager.isLoggedIn());
            if (window.authManager.isLoggedIn()) {
                console.log('User authenticated via AuthManager');
                return true;
            }
        } else {
            console.log('AuthManager not available');
        }
        
        // Fallback: check if user is in the DOM (user profile visible)
        const userProfile = document.querySelector('.user-profile');
        console.log('User profile in DOM:', !!userProfile);
        if (userProfile) {
            console.log('User authenticated via DOM check');
            return true;
        }
        
        console.log('No authentication found, showing auth required');
        this.showAuthRequired();
        return false;
    }

    /**
     * Clear authentication and redirect to login
     */
    clearAuthAndRedirect() {
        // Sign out from Firebase if available
        if (typeof window.auth !== 'undefined') {
            window.auth.signOut().catch(error => {
                console.error('Firebase signout error:', error);
            });
        }
        this.showAuthRequired();
    }

    /**
     * Set up periodic authentication check
     */
    setupAuthCheck() {
        // Listen for Firebase Auth state changes
        if (typeof window.auth !== 'undefined') {
            window.auth.onAuthStateChanged((user) => {
                console.log('Firebase auth state changed in chatbot:', user ? 'Logged in' : 'Logged out');
                if (!user) {
                    this.showAuthRequired();
                } else {
                    this.onUserChanged();
                }
            });
        }
        
        // Also check authManager if available
        if (typeof window.authManager !== 'undefined') {
            window.authManager.onAuthStateChanged((user) => {
                console.log('AuthManager state changed in chatbot:', user ? 'Logged in' : 'Logged out');
                if (!user) {
                    this.showAuthRequired();
                } else {
                    this.onUserChanged();
                }
            });
        }
    }

    /**
     * Handle user change (login/logout/switch)
     */
    onUserChanged() {
        const userId = this.getCurrentUserId();
        if (userId) {
            // User logged in, refresh chat history
            this.updateChatHistory();
            this.showNotification(`Welcome back! Loading your chat history...`, 'info');
        }
    }

    /**
     * Generate a unique chat ID
     */
    generateChatId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    /**
     * Get chat ID from current URL query parameters
     */
    getChatIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('c') || null;
    }

    /**
     * Update URL with chat ID using query parameters
     */
    updateURL(chatId) {
        const url = new URL(window.location);
        url.searchParams.set('c', chatId);
        
        if (window.location.href !== url.href) {
            window.history.pushState({ chatId }, '', url.href);
        }
    }

    /**
     * Initialize chat from URL
     */
    async initializeChatFromURL() {
        const chatId = this.getChatIdFromURL();
        
        if (chatId) {
            // Load existing chat
            this.currentChatId = chatId;
            await this.loadChatById(chatId);
        } else {
            // No chat ID in URL - show welcome screen without generating ID yet
            this.currentChatId = null;
            this.messages = [];
            this.conversationHistory = [];
            
            // Clear the chat display
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML = '';
            
            // Show welcome message
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.classList.remove('hidden');
            }
            
            // Update chat history in sidebar
            await this.updateChatHistory();
            
            this.scrollToBottom();
        }
    }

    /**
     * Load chat by ID
     */
    async loadChatById(chatId) {
        const chatData = await this.getChatById(chatId);
        
        if (chatData) {
            this.messages = chatData.messages || [];
            this.conversationHistory = chatData.conversationHistory || [];
            this.currentChatId = chatId;
            
            // Clear current messages
            document.getElementById('chat-messages').innerHTML = '';
            
            // Hide welcome message if there are messages
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                if (this.messages.length > 0) {
                    welcomeMessage.classList.add('hidden');
                } else {
                    welcomeMessage.classList.remove('hidden');
                }
            }
            
            // Render loaded messages
            this.messages.forEach(message => {
                this.renderMessage(message);
            });
            
            this.scrollToBottom();
            this.showNotification(`Loaded chat: ${chatData.title || 'Untitled'}`, 'info');
        } else {
            // Chat not found, create new one
            this.startNewChat();
        }
    }

    /**
     * Get chat by ID from localStorage
     */
    async getChatById(chatId) {
        const allChats = await this.getAllChats();
        return allChats.find(chat => chat.id === chatId);
    }

    /**
     * Get all chats (user-specific) - tries backend first, then localStorage
     */
    async getAllChats() {
        const userId = this.getCurrentUserId();
        if (!userId) return [];
        
        try {
            // Try to get from backend first
            const backendChats = await this.getChatsFromBackend();
            if (backendChats && backendChats.length > 0) {
                console.log('Loaded chats from backend');
                return backendChats;
            }
        } catch (error) {
            console.log('Backend not available, using localStorage');
        }
        
        // Fallback to localStorage
        const chats = localStorage.getItem(`chatbot-chats-${userId}`);
        return chats ? JSON.parse(chats) : [];
    }

    /**
     * Save all chats (user-specific) - saves to both backend and localStorage
     */
    async saveAllChats(chats) {
        const userId = this.getCurrentUserId();
        if (!userId) return;
        
        // Save to localStorage first (immediate)
        localStorage.setItem(`chatbot-chats-${userId}`, JSON.stringify(chats));
        
        try {
            // Try to save to backend for cross-domain sync
            await this.saveChatsToBackend(chats);
            console.log('Chats saved to backend for cross-domain sync');
        } catch (error) {
            console.log('Backend save failed, using localStorage only');
        }
    }

    /**
     * Get chats from backend API
     */
    async getChatsFromBackend() {
        const userId = this.getCurrentUserId();
        if (!userId) return [];
        
        // Get Firebase Auth token
        let userToken = null;
        if (typeof window.auth !== 'undefined' && window.auth.currentUser) {
            try {
                userToken = await window.auth.currentUser.getIdToken();
            } catch (error) {
                console.error('Failed to get Firebase token:', error);
            }
        }
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (userToken) {
            headers['Authorization'] = `Bearer ${userToken}`;
        }
        
        const response = await fetch(Config.getApiUrl('chatHistory'), {
            method: 'GET',
            headers: headers
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.chats || [];
        } else {
            throw new Error(`Backend request failed: ${response.status}`);
        }
    }

    /**
     * Save chats to backend API
     */
    async saveChatsToBackend(chats) {
        const userId = this.getCurrentUserId();
        if (!userId) return;
        
        // Get Firebase Auth token
        let userToken = null;
        if (typeof window.auth !== 'undefined' && window.auth.currentUser) {
            try {
                userToken = await window.auth.currentUser.getIdToken();
            } catch (error) {
                console.error('Failed to get Firebase token:', error);
            }
        }
        
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (userToken) {
            headers['Authorization'] = `Bearer ${userToken}`;
        }
        
        const payload = {
            userId: userId,
            chats: chats
        };
        
        const response = await fetch(Config.getApiUrl('chatHistory'), {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`Backend save failed: ${response.status}`);
        }
    }

    /**
     * Get current user ID for chat storage
     */
    getCurrentUserId() {
        // First priority: Firebase Auth (most reliable for cross-device sync)
        if (typeof window.auth !== 'undefined' && window.auth.currentUser) {
            const firebaseUid = window.auth.currentUser.uid;
            console.log('Using Firebase user ID:', firebaseUid);
            return firebaseUid;
        }
        
        // Second priority: URL parameters (for your site's format)
        const urlParams = new URLSearchParams(window.location.search);
        const uid = urlParams.get('uid');
        if (uid) {
            console.log('Using user ID from URL:', uid);
            return uid;
        }
        
        // Third priority: authManager
        if (typeof window.authManager !== 'undefined' && window.authManager.getCurrentUser()) {
            const authManagerUid = window.authManager.getCurrentUser().uid;
            console.log('Using authManager user ID:', authManagerUid);
            return authManagerUid;
        }
        
        // Fourth priority: Check if user is logged in via DOM (for production site)
        const userProfile = document.querySelector('.user-profile');
        if (userProfile) {
            // Try to extract user ID from the profile or use a fallback
            const username = userProfile.querySelector('.user-name')?.textContent || 'taleshereco';
            console.log('Using username from DOM:', username);
            return username;
        }
        
        console.log('No user ID found');
        return null;
    }

    /**
     * Navigate to a specific chat
     */
    async navigateToChat(chatId) {
        // Save current chat before switching
        if (this.messages.length > 0 && this.currentChatId) {
            await this.saveCurrentChat();
        }
        
        // Navigate to the chat URL with query parameter
        const url = new URL(window.location);
        url.searchParams.set('c', chatId);
        window.location.href = url.href;
    }

    /**
     * Delete a specific chat
     */
    async deleteChat(chatId) {
        const chat = await this.getChatById(chatId);
        if (!chat) {
            this.showNotification('Chat not found', 'error');
            return;
        }

        const chatTitle = chat.title || 'Untitled Chat';
        
        if (confirm(`Are you sure you want to delete "${chatTitle}"? This action cannot be undone.`)) {
            try {
                // Get all chats
                const allChats = await this.getAllChats();
                console.log('Before deletion - allChats:', allChats.length, 'chats');
                
                // Ensure allChats is an array
                if (!Array.isArray(allChats)) {
                    console.warn('allChats is not an array, cannot delete chat');
                    this.showNotification('Failed to delete chat', 'error');
                    return;
                }
                
                // Remove the chat
                const updatedChats = allChats.filter(chat => chat.id !== chatId);
                console.log('After deletion - updatedChats:', updatedChats.length, 'chats');
                
                // Save updated chats
                await this.saveAllChats(updatedChats);
                console.log('Chats saved to backend/localStorage');
                
                // If this was the current chat, start a new one
                if (chatId === this.currentChatId) {
                    await this.startNewChat();
                }
                
                // Always update the history display
                await this.updateChatHistory();
                
                this.showNotification(`Chat "${chatTitle}" deleted successfully`, 'success');
            } catch (error) {
                console.error('Failed to delete chat:', error);
                this.showNotification('Failed to delete chat', 'error');
            }
        }
    }

    /**
     * Set up browser history support
     */
    setupHistorySupport() {
        // Listen for browser back/forward navigation
        window.addEventListener('popstate', (event) => {
            const chatId = this.getChatIdFromURL();
            if (chatId && chatId !== this.currentChatId) {
                this.loadChatById(chatId);
            }
        });
    }

    /**
     * Show authentication required message
     */
    showAuthRequired() {
        const chatContainer = document.querySelector('.chatbot-main-area');
        if (chatContainer) {
            chatContainer.innerHTML = `
                <div class="auth-required-container">
                    <div class="auth-required-content">
                        <div class="auth-icon">🔒</div>
                        <h2>Authentication Required</h2>
                        <p>You need to be logged in to access the AI chatbot.</p>
                        <div class="auth-actions">
                            <a href="login.html" class="auth-btn primary">Login</a>
                            <a href="signup.html" class="auth-btn secondary">Sign Up</a>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const clearBtn = document.getElementById('clear-chat-btn');
        const exportBtn = document.getElementById('export-chat-btn');
        // Model selector removed - using fixed free model
        
        if (!chatInput || !sendBtn) {
            console.error('Required elements not found: chat-input or send-btn');
            return;
        }

        // Send message events
        chatInput.addEventListener('input', () => {
            this.updateCharCount();
            this.autoResizeTextarea();
            this.toggleSendButton();
        });

        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Clear chat (if button exists)
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearChat();
            });
        }

        // Export chat (if button exists)
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportChat();
            });
        }

        // Model is fixed to free model - no switching needed

        // New chat button
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => {
                this.startNewChat();
            });
        }

        // Small new chat button
        const newChatBtnSmall = document.getElementById('new-chat-btn-small');
        if (newChatBtnSmall) {
            newChatBtnSmall.addEventListener('click', () => {
                this.startNewChat();
            });
        }

        // Dataset button
        const datasetBtn = document.getElementById('dataset-btn');
        if (datasetBtn) {
            datasetBtn.addEventListener('click', () => {
                this.showDatasetModal();
            });
        }

        // Suggestion chips
        const suggestionChips = document.querySelectorAll('.suggestion-chip');
        if (suggestionChips.length > 0) {
            suggestionChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const suggestion = chip.getAttribute('data-suggestion');
                    document.getElementById('chat-input').value = suggestion;
                    this.sendMessage();
                });
            });
        }

        // Voice input (placeholder for future implementation)
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                this.showNotification('Voice input coming soon!', 'info');
            });
        }

        // File attachment (placeholder for future implementation)
        const attachBtn = document.getElementById('attach-btn');
        if (attachBtn) {
            attachBtn.addEventListener('click', () => {
                this.showNotification('File attachment coming soon!', 'info');
            });
        }

        // Mobile sidebar functionality
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');
        const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
        const mobileNewChat = document.getElementById('mobile-new-chat');
        const mobileNewChatBtn = document.getElementById('mobile-new-chat-btn');
        
        if (mobileMenuToggle) {
            mobileMenuToggle.addEventListener('click', () => this.toggleMobileSidebar());
        }
        
        if (mobileSidebarOverlay) {
            mobileSidebarOverlay.addEventListener('click', () => this.closeMobileSidebar());
        }
        
        if (mobileSidebarClose) {
            mobileSidebarClose.addEventListener('click', () => this.closeMobileSidebar());
        }
        
        if (mobileNewChat) {
            mobileNewChat.addEventListener('click', () => {
                this.startNewChat();
                this.closeMobileSidebar();
            });
        }
        
        if (mobileNewChatBtn) {
            mobileNewChatBtn.addEventListener('click', () => {
                this.startNewChat();
                this.closeMobileSidebar();
            });
        }

        // User message actions (copy and edit)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.copy-btn')) {
                const messageId = e.target.closest('.copy-btn').getAttribute('data-message-id');
                this.copyMessage(messageId);
            }
            
            if (e.target.closest('.edit-btn')) {
                const messageId = e.target.closest('.edit-btn').getAttribute('data-message-id');
                this.editMessage(messageId);
            }
        });
    }

    /**
     * Test connection to AI service
     */
    async testConnection() {
        const statusElement = document.getElementById('connection-status');
        const statusText = statusElement.querySelector('.status-text');
        
        statusElement.classList.remove('hidden');
        statusText.textContent = 'Testing AI service connection...';

        try {
            // Create a test message for the connection test
            const testMessage = {
                role: 'user',
                content: 'Hello, are you working?',
                timestamp: new Date().toISOString()
            };
            
            // Temporarily add the test message to conversation history
            const originalHistory = [...this.conversationHistory];
            this.conversationHistory = [testMessage];
            
            // Test with a simple message
            const testResponse = await this.sendToAI('Hello, are you working?');
            
            // Restore original conversation history
            this.conversationHistory = originalHistory;
            
            if (testResponse && testResponse.success) {
                this.isConnected = true;
                statusElement.className = 'connection-status connection-success';
                statusText.textContent = '✅ Connected to AI service';
                setTimeout(() => {
                    statusElement.classList.add('hidden');
                }, 3000);
            } else {
                throw new Error('AI service not responding properly');
            }
        } catch (error) {
            this.isConnected = false;
            statusElement.className = 'connection-status connection-error';
            statusText.textContent = '❌ Failed to connect to AI service';
            console.error('Connection test failed:', error);
        }
    }

    /**
     * Send message to AI
     * @param {string} message - User message
     * @returns {Promise<Object>} AI response
     */
    async sendToAI(message) {
        try {
            // Check authentication before making API call
            if (!this.checkAuthentication()) {
                this.showNotification('Authentication required to use AI chatbot', 'error');
                return null;
            }

            // Prepare request payload with current conversation history
            const payload = {
                model: this.currentModel,
                messages: this.conversationHistory,
                max_tokens: 1000,
                temperature: 0.7
            };

            console.log('Sending payload to backend:', payload);

            // Get Firebase Auth token
            let userToken = null;
            if (typeof window.auth !== 'undefined' && window.auth.currentUser) {
                try {
                    userToken = await window.auth.currentUser.getIdToken();
                } catch (error) {
                    console.error('Failed to get Firebase token:', error);
                }
            }

            // Make API request to backend
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };
            
            if (userToken) {
                headers['Authorization'] = `Bearer ${userToken}`;
            }

            const response = await fetch(Config.getApiUrl('chatbot'), {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            return data;
        } catch (error) {
            console.error('Error sending message to AI:', error);
            throw error;
        }
    }

    /**
     * Send user message
     */
    async sendMessage() {
        const chatInput = document.getElementById('chat-input');
        const message = chatInput.value.trim();

        if (!message || this.isTyping) {
            return;
        }

        // Generate chat ID if this is the first message
        if (!this.currentChatId) {
            this.currentChatId = this.generateChatId();
            this.updateURL(this.currentChatId);
        }

        // Clear input
        chatInput.value = '';
        this.updateCharCount();
        this.autoResizeTextarea();
        this.toggleSendButton();

        // Add user message to chat
        this.addMessage('user', message);

        // Add user message to conversation history for API
        this.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        });

        // Show typing indicator
        this.showTypingIndicator();

        try {
            // Send to AI
            const response = await this.sendToAI(message);

            // Hide typing indicator
            this.hideTypingIndicator();

            if (response && response.success) {
                // Add AI response to chat
                this.addMessage('assistant', response.response);
                
                // Add AI response to conversation history
                this.conversationHistory.push({
                    role: 'assistant',
                    content: response.response,
                    timestamp: new Date().toISOString()
                });
            } else {
                throw new Error(response?.error || 'Failed to get response from AI');
            }
        } catch (error) {
            // Hide typing indicator
            this.hideTypingIndicator();

            // Show error message
            this.addMessage('system', `Error: ${error.message}`);
            this.showErrorModal(error.message);
        }

        // Save current chat and update sidebar
        await this.saveCurrentChat();
        this.saveChatHistory();
    }

    /**
     * Add message to chat
     * @param {string} type - Message type (user, assistant, system)
     * @param {string} content - Message content
     */
    addMessage(type, content) {
        const message = {
            id: Date.now() + Math.random(),
            type: type,
            content: content,
            timestamp: new Date().toISOString()
        };

        this.messages.push(message);
        this.renderMessage(message);

        // Hide welcome message after first user message
        if (type === 'user') {
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.classList.add('hidden');
            }
        }

        // Scroll to bottom
        this.scrollToBottom();
    }

    /**
     * Render message in chat
     * @param {Object} message - Message object
     */
    renderMessage(message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.className = `message-container ${message.type}-message`;
        messageElement.setAttribute('data-message-id', message.id);

        const timestamp = new Date(message.timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        let messageHTML = '';

      if (message.type === 'user') {
          messageHTML = `
              <div class="message-avatar">
                  <div class="avatar-icon">👤</div>
              </div>
              <div class="message-content">
                  <div class="message-bubble">
                      <div class="message-actions">
                          <button class="action-btn copy-btn" title="Copy message" data-message-id="${message.id}">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                          </button>
                          <button class="action-btn edit-btn" title="Edit message" data-message-id="${message.id}">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                          </button>
                      </div>
                      <div class="message-text">${this.formatMessage(message.content)}</div>
                      <div class="message-time">${timestamp}</div>
                  </div>
              </div>
          `;
        } else if (message.type === 'assistant') {
            messageHTML = `
                <div class="message-avatar">
                    <div class="avatar-icon">🤖</div>
                </div>
                <div class="message-content">
                    <div class="message-bubble">
                        <div class="message-text">${this.formatMessage(message.content)}</div>
                        <div class="message-time">${timestamp}</div>
                    </div>
                </div>
            `;
        } else if (message.type === 'system') {
            messageHTML = `
                <div class="message-content">
                    <div class="message-bubble" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444;">
                        <div class="message-text">${this.formatMessage(message.content)}</div>
                        <div class="message-time">${timestamp}</div>
                    </div>
                </div>
            `;
        }

        messageElement.innerHTML = messageHTML;
        chatMessages.appendChild(messageElement);
    }

    /**
     * Format message content (basic markdown support)
     * @param {string} content - Message content
     * @returns {string} Formatted HTML
     */
    formatMessage(content) {
        // Basic markdown formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    /**
     * Show typing indicator
     */
    showTypingIndicator() {
        this.isTyping = true;
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    /**
     * Hide typing indicator
     */
    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        typingIndicator.classList.add('hidden');
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Update character count
     */
    updateCharCount() {
        const chatInput = document.getElementById('chat-input');
        const charCount = document.querySelector('.char-count');
        const currentLength = chatInput.value.length;
        
        // Only update if char-count element exists
        if (charCount) {
            charCount.textContent = `${currentLength}/${this.maxMessageLength}`;
            
            if (currentLength > this.maxMessageLength * 0.9) {
                charCount.classList.add('warning');
            } else {
                charCount.classList.remove('warning');
            }
        }
    }

    /**
     * Auto-resize textarea
     */
    autoResizeTextarea() {
        const chatInput = document.getElementById('chat-input');
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
    }

    /**
     * Toggle send button state
     */
    toggleSendButton() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const hasText = chatInput.value.trim().length > 0;
        
        sendBtn.disabled = !hasText || this.isTyping;
    }

    /**
     * Clear chat
     */
    async clearChat() {
        if (this.messages.length === 0) {
            this.showNotification('Chat is already empty', 'info');
            return;
        }

        if (confirm('Are you sure you want to clear the chat? This action cannot be undone.')) {
            this.messages = [];
            this.conversationHistory = [];
            
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.innerHTML = '';
            
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                welcomeMessage.classList.remove('hidden');
            }
            
            await this.saveCurrentChat();
            this.saveChatHistory();
            this.showNotification('Chat cleared successfully', 'success');
        }
    }

    /**
     * Start a new chat
     */
    async startNewChat() {
        // Save current chat if it has messages
        if (this.messages.length > 0 && this.currentChatId) {
            await this.saveCurrentChat();
        }
        
        // Clear current session (don't generate ID yet)
        this.currentChatId = null;
        this.messages = [];
        this.conversationHistory = [];
        
        // Clear the chat display
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        
        // Show welcome message
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage) {
            welcomeMessage.classList.remove('hidden');
        }
        
        // Update URL to remove chat ID
        const url = new URL(window.location);
        url.searchParams.delete('c');
        window.history.pushState({}, '', url.href);
        
        // Update chat history in sidebar
        this.updateChatHistory();
        
        // Show notification
        this.showNotification('New chat started', 'success');
        
        // Scroll to top
        this.scrollToBottom();
    }

    /**
     * Update chat history in sidebar
     */
    async updateChatHistory() {
        console.log('updateChatHistory called');
        const historyList = document.getElementById('chat-history-list');
        const allChats = await this.getAllChats();
        console.log('updateChatHistory - allChats:', allChats.length, 'chats');
        
        if (!historyList) {
            console.warn('historyList element not found');
            return;
        }
        
        historyList.innerHTML = '';
        
        if (allChats.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'history-empty';
            emptyMessage.textContent = 'No chat history yet';
            emptyMessage.style.cssText = 'text-align: center; color: var(--text-muted); padding: 1rem; font-style: italic;';
            historyList.appendChild(emptyMessage);
            return;
        }
        
        allChats.forEach((chat, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            if (chat.id === this.currentChatId) {
                historyItem.classList.add('active');
            }
            
            // Show chat title with timestamp and delete button
            const title = chat.title || 'Untitled Chat';
            const date = new Date(chat.timestamp).toLocaleDateString();
            historyItem.innerHTML = `
                <div class="history-content">
                    <div class="history-title">${title}</div>
                    <div class="history-date">${date}</div>
                </div>
                <button class="history-delete-btn" title="Delete chat" data-chat-id="${chat.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            `;
            
            // Add click event for navigation (excluding delete button)
            historyItem.addEventListener('click', (e) => {
                if (!e.target.closest('.history-delete-btn')) {
                    this.navigateToChat(chat.id);
                }
            });
            
            // Add delete button event
            const deleteBtn = historyItem.querySelector('.history-delete-btn');
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.deleteChat(chat.id);
            });
            
            historyList.appendChild(historyItem);
        });
    }

    /**
     * Get chat history from localStorage
     */
    getChatHistory() {
        const history = localStorage.getItem('chatbot-history');
        return history ? JSON.parse(history) : [];
    }

    /**
     * Save chat history to localStorage
     */
    saveChatHistory() {
        const history = this.getChatHistory();
        const currentChat = {
            title: this.getChatTitle(),
            messages: this.messages,
            conversationHistory: this.conversationHistory,
            timestamp: new Date().toISOString()
        };
        
        // Update or add current chat
        const existingIndex = history.findIndex(chat => chat.title === currentChat.title);
        if (existingIndex >= 0) {
            history[existingIndex] = currentChat;
        } else {
            history.unshift(currentChat);
        }
        
        // Keep only last 10 chats
        if (history.length > 10) {
            history.splice(10);
        }
        
        localStorage.setItem('chatbot-history', JSON.stringify(history));
        this.updateChatHistory();
    }

    /**
     * Get chat title from first user message
     */
    getChatTitle() {
        const firstUserMessage = this.messages.find(msg => msg.type === 'user');
        if (firstUserMessage) {
            return firstUserMessage.content.length > 50 
                ? firstUserMessage.content.substring(0, 50) + '...'
                : firstUserMessage.content;
        }
        return 'New Chat';
    }

    /**
     * Load chat from history
     */
    async loadChatFromHistory(index) {
        const history = this.getChatHistory();
        if (history[index]) {
            // Save current chat before switching
            if (this.messages.length > 0) {
                await this.saveCurrentChat();
            }
            
            const chat = history[index];
            this.messages = chat.messages || [];
            this.conversationHistory = chat.conversationHistory || [];
            
            // Clear current messages
            document.getElementById('chat-messages').innerHTML = '';
            
            // Hide welcome message if there are messages
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) {
                if (this.messages.length > 0) {
                    welcomeMessage.classList.add('hidden');
                } else {
                    welcomeMessage.classList.remove('hidden');
                }
            }
            
            // Render loaded messages
            this.messages.forEach(message => {
                this.renderMessage(message);
            });
            
            // Update active state
            document.querySelectorAll('.history-item').forEach(item => {
                item.classList.remove('active');
            });
            const historyItems = document.querySelectorAll('.history-item');
            if (historyItems[index]) {
                historyItems[index].classList.add('active');
            }
            
            // Save the loaded chat as current
            await this.saveCurrentChat();
            
            this.scrollToBottom();
            
            // Show notification
            this.showNotification(`Loaded: ${chat.title}`, 'info');
        }
    }

    /**
     * Export chat
     */
    exportChat() {
        if (this.messages.length === 0) {
            this.showNotification('No messages to export', 'info');
            return;
        }

        const exportData = {
            timestamp: new Date().toISOString(),
            model: this.currentModel,
            messages: this.messages
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Chat exported successfully', 'success');
    }

    /**
     * Copy message to clipboard
     * @param {string} messageId - Message ID
     */
    async copyMessage(messageId) {
        const message = this.messages.find(m => m.id == messageId);
        if (message) {
            try {
                await navigator.clipboard.writeText(message.content);
                this.showNotification('Message copied to clipboard', 'success');
            } catch (error) {
                console.error('Failed to copy message:', error);
                this.showNotification('Failed to copy message', 'error');
            }
        }
    }

    /**
     * Edit user message
     * @param {string} messageId - Message ID
     */
    editMessage(messageId) {
        const message = this.messages.find(m => m.id == messageId);
        if (message && message.type === 'user') {
            // Put the message content in the input field
            const chatInput = document.getElementById('chat-input');
            chatInput.value = message.content;
            chatInput.focus();
            
            // Remove the original message from the conversation
            this.messages = this.messages.filter(msg => msg.id !== messageId);
            this.conversationHistory = this.conversationHistory.filter(msg => msg.id !== messageId);
            
            // Re-render messages
            this.renderMessages();
            
            this.showNotification('Message ready for editing', 'info');
        }
    }

    /**
     * Re-render all messages
     */
    renderMessages() {
        const chatMessages = document.getElementById('chat-messages');
        chatMessages.innerHTML = '';
        
        this.messages.forEach(message => {
            this.renderMessage(message);
        });
        
        this.scrollToBottom();
    }

    /**
     * Regenerate AI response
     * @param {string} messageId - Message ID
     */
    async regenerateMessage(messageId) {
        const messageIndex = this.messages.findIndex(m => m.id == messageId);
        if (messageIndex === -1) return;

        // Find the user message that prompted this response
        let userMessageIndex = -1;
        for (let i = messageIndex - 1; i >= 0; i--) {
            if (this.messages[i].type === 'user') {
                userMessageIndex = i;
                break;
            }
        }

        if (userMessageIndex === -1) {
            this.showNotification('Cannot regenerate: no user message found', 'error');
            return;
        }

        const userMessage = this.messages[userMessageIndex].content;
        
        // Remove the AI response from messages and conversation history
        this.messages.splice(messageIndex, 1);
        this.conversationHistory = this.conversationHistory.filter((_, index) => index < userMessageIndex * 2);

        // Remove the message element from DOM
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }

        // Show typing indicator and regenerate
        this.showTypingIndicator();
        
        try {
            const response = await this.sendToAI(userMessage);
            this.hideTypingIndicator();
            
            if (response && response.success) {
                this.addMessage('assistant', response.response);
                await this.saveCurrentChat();
                this.saveChatHistory();
            } else {
                throw new Error(response?.error || 'Failed to regenerate response');
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.addMessage('system', `Error regenerating response: ${error.message}`);
        }
    }

    /**
     * Show error modal
     * @param {string} errorMessage - Error message
     */
    showErrorModal(errorMessage) {
        const errorModal = document.getElementById('error-modal');
        const errorContent = document.getElementById('error-content');
        
        errorContent.innerHTML = `
            <div class="error-details">
                <h4>Something went wrong</h4>
                <p>${errorMessage}</p>
                <p>Please try again or check your connection.</p>
            </div>
        `;
        
        errorModal.classList.remove('hidden');
        
        // Setup retry button
        const retryBtn = document.getElementById('retry-btn');
        retryBtn.onclick = () => {
            errorModal.classList.add('hidden');
            this.testConnection();
        };
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Get notification icon
     * @param {string} type - Notification type
     * @returns {string} Icon
     */
    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        return icons[type] || icons.info;
    }

    /**
     * Save current chat to localStorage
     */
    async saveCurrentChat() {
        try {
            if (!this.currentChatId) return;
            
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.warn('No user ID found, cannot save chat');
                return;
            }
            
            const chatData = {
                id: this.currentChatId,
                title: this.getChatTitle(),
                messages: this.messages,
                conversationHistory: this.conversationHistory,
                userId: userId,
                timestamp: new Date().toISOString()
            };
            
            // Save to all chats
            const allChats = await this.getAllChats();
            
            // Ensure allChats is an array
            if (!Array.isArray(allChats)) {
                console.warn('allChats is not an array, initializing empty array');
                await this.saveAllChats([chatData]);
                return;
            }
            
            const existingIndex = allChats.findIndex(chat => chat.id === this.currentChatId);
            
            if (existingIndex >= 0) {
                allChats[existingIndex] = chatData;
            } else {
                allChats.unshift(chatData);
            }
            
            // Keep only last 50 chats
            if (allChats.length > 50) {
                allChats.splice(50);
            }
            
            await this.saveAllChats(allChats);
        } catch (error) {
            console.error('Failed to save current chat:', error);
        }
    }

    /**
     * Load current chat from localStorage
     */
    loadCurrentChat() {
        try {
            const savedData = localStorage.getItem('chatbot_history');
            if (savedData) {
                const chatData = JSON.parse(savedData);
                
                // Check if data is recent (within 24 hours)
                const savedTime = new Date(chatData.timestamp);
                const now = new Date();
                const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    this.messages = chatData.messages || [];
                    this.conversationHistory = chatData.conversationHistory || [];
                    
                    // Render saved messages
                    this.messages.forEach(message => {
                        this.renderMessage(message);
                    });
                    
                    // Hide welcome message if there are messages
                    if (this.messages.length > 0) {
                        const welcomeMessage = document.getElementById('welcome-message');
                        if (welcomeMessage) {
                            welcomeMessage.classList.add('hidden');
                        }
                    }
                    
                    this.scrollToBottom();
                } else {
                    // Clear old data
                    localStorage.removeItem('chatbot_history');
                }
            }
        } catch (error) {
            console.error('Failed to load chat history:', error);
            localStorage.removeItem('chatbot_history');
        }
    }

    /**
     * Show dataset upload modal
     */
    showDatasetModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Upload Dataset</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <form id="dataset-form">
                        <div class="form-group">
                            <label for="dataset-name">Dataset Name</label>
                            <input type="text" id="dataset-name" required placeholder="e.g., Company FAQ">
                        </div>
                        <div class="form-group">
                            <label for="dataset-type">Dataset Type</label>
                            <select id="dataset-type" required>
                                <option value="faq">FAQ (Question & Answer)</option>
                                <option value="knowledge">Knowledge Base</option>
                                <option value="text">Text Document</option>
                                <option value="document">Documentation</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="dataset-description">Description (Optional)</label>
                            <input type="text" id="dataset-description" placeholder="Brief description of the dataset">
                        </div>
                        <div class="form-group">
                            <label for="dataset-data">Dataset Content</label>
                            <textarea id="dataset-data" required rows="10" placeholder="Enter your data here..."></textarea>
                            <small>For FAQ: Use JSON format like [{"question": "Q1", "answer": "A1"}]</small>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                            <button type="submit" class="btn btn-primary">Upload Dataset</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle form submission
        document.getElementById('dataset-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.uploadDataset();
        });
    }

    /**
     * Upload dataset to backend
     */
    async uploadDataset() {
        try {
            // Check authentication
            if (!this.checkAuthentication()) {
                this.showNotification('Authentication required to upload datasets', 'error');
                return;
            }

            const name = document.getElementById('dataset-name').value;
            const type = document.getElementById('dataset-type').value;
            const description = document.getElementById('dataset-description').value;
            const dataText = document.getElementById('dataset-data').value;

            let data;
            try {
                // Try to parse as JSON first
                data = JSON.parse(dataText);
            } catch {
                // If not JSON, treat as plain text
                data = dataText;
            }

            const payload = {
                name,
                type,
                description,
                data
            };

            // Get Firebase Auth token
            let userToken = null;
            if (typeof window.auth !== 'undefined' && window.auth.currentUser) {
                try {
                    userToken = await window.auth.currentUser.getIdToken();
                } catch (error) {
                    console.error('Failed to get Firebase token:', error);
                }
            }

            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (userToken) {
                headers['Authorization'] = `Bearer ${userToken}`;
            }

            const response = await fetch(Config.api.baseUrl + Config.api.endpoints.datasetUpload, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification('Dataset uploaded successfully!', 'success');
                document.querySelector('.modal-overlay').remove();
            } else {
                this.showNotification(`Error: ${result.error}`, 'error');
            }

        } catch (error) {
            console.error('Error uploading dataset:', error);
            this.showNotification('Failed to upload dataset', 'error');
        }
    }

    /**
     * Toggle mobile sidebar
     */
    toggleMobileSidebar() {
        const mobileSidebar = document.getElementById('mobile-sidebar');
        const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        
        if (mobileSidebar && mobileSidebarOverlay && mobileMenuToggle) {
            const isOpen = mobileSidebar.classList.contains('active');
            
            if (isOpen) {
                this.closeMobileSidebar();
            } else {
                this.openMobileSidebar();
            }
        }
    }

    /**
     * Open mobile sidebar
     */
    openMobileSidebar() {
        const mobileSidebar = document.getElementById('mobile-sidebar');
        const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        
        if (mobileSidebar && mobileSidebarOverlay && mobileMenuToggle) {
            mobileSidebar.classList.add('active');
            mobileSidebarOverlay.classList.add('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close mobile sidebar
     */
    closeMobileSidebar() {
        const mobileSidebar = document.getElementById('mobile-sidebar');
        const mobileSidebarOverlay = document.getElementById('mobile-sidebar-overlay');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        
        if (mobileSidebar && mobileSidebarOverlay && mobileMenuToggle) {
            mobileSidebar.classList.remove('active');
            mobileSidebarOverlay.classList.remove('active');
            mobileMenuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        }
    }
}

// Utility functions for modal management
const Utils = {
    closeModal() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
    }
};

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait for environment to be initialized
    setTimeout(function() {
        window.chatbot = new ChatbotService();
    }, 1000);
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChatbotService;
}
