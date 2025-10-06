/**
 * Admin Dashboard JavaScript
 * Handles model management, system status, and configuration
 */

class AdminDashboard {
    constructor() {
        // Use the same API configuration as the main app
        this.apiBaseUrl = typeof API_CONFIG !== 'undefined' ? 
            `${API_CONFIG.baseUrl}${API_CONFIG.chatbot}`.replace('/chatbot', '') : 
            'https://hereco-backend.azurewebsites.net/api';
        this.logs = [];
        this.availableModels = [];
        this.currentConfig = null;
        this.adminKey = 'admin123'; // Change this in production
        
        // Admin email list - add your admin emails here
        this.adminEmails = [
            'senguptashantanu8@gmail.com',  // Your admin email
            'admin@hereco.com'  // Add more admin emails as needed
        ];
        
        this.isAuthenticated = false;
        this.currentUser = null;
        this.configStream = null; // SSE connection for real-time updates
        this.init();
    }
    
    async init() {
        this.log('Admin dashboard initialized');
        this.setupAuthentication();
        this.setupEventListeners();
        this.setupRealTimeUpdates();
    }
    
    setupAuthentication() {
        // Wait for Firebase to be ready
        if (typeof window.auth === 'undefined') {
            window.addEventListener('firebase-ready', () => {
                this.setupFirebaseAuth();
            });
        } else {
            this.setupFirebaseAuth();
        }
    }
    
    setupFirebaseAuth() {
        // Listen for Firebase auth state changes
        window.auth.onAuthStateChanged((user) => {
            if (user && this.isAdminEmail(user.email)) {
                // User is authenticated and is an admin
                this.isAuthenticated = true;
                this.currentUser = user;
                this.showDashboard();
                this.loadInitialData();
                this.log(`Admin login successful: ${user.email}`);
            } else {
                // User is not authenticated or not an admin
                this.isAuthenticated = false;
                this.currentUser = null;
                this.showLoginScreen();
            }
        });
    }
    
    isAdminEmail(email) {
        return this.adminEmails.includes(email);
    }
    
    showLoginScreen() {
        const loginScreen = document.getElementById('login-screen');
        const dashboardContent = document.getElementById('dashboard-content');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (dashboardContent) dashboardContent.style.display = 'none';
        
        // Setup login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFirebaseLogin();
            });
        }
    }
    
    showDashboard() {
        const loginScreen = document.getElementById('login-screen');
        const dashboardContent = document.getElementById('dashboard-content');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (dashboardContent) dashboardContent.style.display = 'block';
        
        // Update user info in header
        this.updateUserInfo();
    }
    
    updateUserInfo() {
        const userInfoElement = document.getElementById('admin-user-info');
        if (userInfoElement && this.currentUser) {
            userInfoElement.textContent = `Logged in as: ${this.currentUser.email}`;
        }
    }
    
    async handleFirebaseLogin() {
        const email = document.getElementById('admin-email').value;
        const password = document.getElementById('admin-password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            // Sign in with Firebase
            const userCredential = await window.signInWithEmailAndPassword(window.auth, email, password);
            const user = userCredential.user;
            
            // Check if user is an admin
            if (this.isAdminEmail(user.email)) {
                // User is authenticated and is an admin
                this.isAuthenticated = true;
                this.currentUser = user;
                this.showDashboard();
                this.loadInitialData();
                this.log(`Admin login successful: ${user.email}`);
            } else {
                // User is authenticated but not an admin
                await window.signOut(window.auth); // Sign them out
                this.showLoginError('Access denied. This email is not authorized for admin access.');
                this.log(`Login denied - not admin: ${user.email}`, 'error');
            }
        } catch (error) {
            // Handle Firebase auth errors
            let errorMessage = 'Login failed. Please check your credentials.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
            }
            
            this.showLoginError(errorMessage);
            this.log(`Firebase login error: ${error.message}`, 'error');
        }
    }
    
    showLoginError(message) {
        const errorDiv = document.getElementById('login-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    async logout() {
        try {
            // Sign out from Firebase
            await window.signOut(window.auth);
            
            this.isAuthenticated = false;
            this.currentUser = null;
            
        // Clear session timeout
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
            this.sessionTimeout = null;
        }
        
        // Cleanup real-time updates
        this.cleanupRealTimeUpdates();
        
        this.showLoginScreen();
            this.log('Admin logged out');
            
            // Clear form
            const emailInput = document.getElementById('admin-email');
            const passwordInput = document.getElementById('admin-password');
            const errorDiv = document.getElementById('login-error');
            
            if (emailInput) emailInput.value = '';
            if (passwordInput) passwordInput.value = '';
            if (errorDiv) errorDiv.style.display = 'none';
        } catch (error) {
            console.error('Logout error:', error);
            this.log(`Logout error: ${error.message}`, 'error');
        }
    }
    
    setupEventListeners() {
        // Auto-refresh status every 30 seconds (only if authenticated)
        setInterval(() => {
            if (this.isAuthenticated) {
                this.refreshSystemStatus();
            }
        }, 30000);
        
        // Session timeout (30 minutes)
        this.sessionTimeout = setTimeout(() => {
            this.logout();
            this.log('Session expired - auto logout');
        }, 30 * 60 * 1000); // 30 minutes
        
        // Reset timeout on user activity
        document.addEventListener('click', () => {
            if (this.isAuthenticated && this.sessionTimeout) {
                clearTimeout(this.sessionTimeout);
                this.sessionTimeout = setTimeout(() => {
                    this.logout();
                    this.log('Session expired - auto logout');
                }, 30 * 60 * 1000);
            }
        });
        
        // Prevent right-click and F12 (basic security)
        document.addEventListener('contextmenu', (e) => {
            if (this.isAuthenticated) {
                e.preventDefault();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (this.isAuthenticated && (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I'))) {
                e.preventDefault();
            }
        });
    }
    
    async loadInitialData() {
        // Only load data if authenticated
        if (!this.isAuthenticated) {
            return;
        }
        
        try {
            await Promise.all([
                this.loadModelConfiguration(),
                this.loadAvailableModels(),
                this.refreshSystemStatus(),
                this.loadUsers(),
                this.loadHealthStatus()
            ]);
        } catch (error) {
            this.log(`Error loading initial data: ${error.message}`, 'error');
        }
    }
    
    async loadModelConfiguration() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/model-config?admin_key=${this.adminKey}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentConfig = data.config;
                this.updateModelSelectors();
                this.updateCurrentConfigDisplay();
                this.log('Model configuration loaded successfully');
            } else {
                throw new Error(data.error || 'Failed to load configuration');
            }
        } catch (error) {
            this.log(`Error loading model configuration: ${error.message}`, 'error');
            this.showAlert('Failed to load model configuration', 'error');
        }
    }
    
    async loadAvailableModels() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/chatbot/models`);
            const data = await response.json();
            
            if (data.success) {
                this.availableModels = data.models;
                this.populateModelSelectors();
                this.updateAvailableModelsDisplay();
                this.log(`Loaded ${data.models.length} available models`);
            } else {
                throw new Error(data.error || 'Failed to load models');
            }
        } catch (error) {
            this.log(`Error loading available models: ${error.message}`, 'error');
            this.showAlert('Failed to load available models', 'error');
        }
    }
    
    populateModelSelectors() {
        const selectors = [
            'primary-model',
            'fallback-model-1',
            'fallback-model-2',
            'fallback-model-3'
        ];
        
        selectors.forEach(selectorId => {
            const select = document.getElementById(selectorId);
            if (select) {
                select.innerHTML = '<option value="">Select a model...</option>';
                
                this.availableModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = `${model.name} (${model.source})`;
                    option.title = model.description;
                    select.appendChild(option);
                });
            }
        });
    }
    
    updateModelSelectors() {
        if (!this.currentConfig) return;
        
        // Set primary model
        const primarySelect = document.getElementById('primary-model');
        if (primarySelect) {
            primarySelect.value = this.currentConfig.primary || '';
        }
        
        // Set fallback models
        const fallbackSelectors = [
            'fallback-model-1',
            'fallback-model-2',
            'fallback-model-3'
        ];
        
        fallbackSelectors.forEach((selectorId, index) => {
            const select = document.getElementById(selectorId);
            if (select && this.currentConfig.fallback && this.currentConfig.fallback[index]) {
                select.value = this.currentConfig.fallback[index];
            }
        });
    }
    
    updateCurrentConfigDisplay() {
        if (!this.currentConfig) return;
        
        const primaryElement = document.getElementById('current-primary');
        const fallbackElement = document.getElementById('current-fallback');
        const lastUpdatedElement = document.getElementById('last-updated');
        
        if (primaryElement) {
            primaryElement.textContent = this.currentConfig.primary || 'Not set';
        }
        
        if (fallbackElement) {
            fallbackElement.textContent = this.currentConfig.fallback ? 
                this.currentConfig.fallback.join(' → ') : 'Not set';
        }
        
        if (lastUpdatedElement) {
            lastUpdatedElement.textContent = new Date().toLocaleString();
        }
    }
    
    updateAvailableModelsDisplay() {
        const container = document.getElementById('available-models');
        if (!container) return;
        
        if (this.availableModels.length === 0) {
            container.innerHTML = '<p>No models available</p>';
            return;
        }
        
        const modelsHtml = this.availableModels.map(model => `
            <div class="model-info">
                <h4>${model.name}</h4>
                <p><strong>ID:</strong> ${model.id}</p>
                <p><strong>Source:</strong> ${model.source}</p>
                <p><strong>Max Tokens:</strong> ${model.max_tokens}</p>
                <p><strong>Note:</strong> ${model.note || 'No additional info'}</p>
                ${model.recommended ? '<p><strong>⭐ Recommended</strong></p>' : ''}
            </div>
        `).join('');
        
        container.innerHTML = modelsHtml;
    }
    
    async updateModelConfiguration() {
        const primaryModel = document.getElementById('primary-model').value;
        const fallbackModels = [
            document.getElementById('fallback-model-1').value,
            document.getElementById('fallback-model-2').value,
            document.getElementById('fallback-model-3').value
        ].filter(model => model); // Remove empty values
        
        if (!primaryModel) {
            this.showAlert('Please select a primary model', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/model-config?admin_key=${this.adminKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    primary: primaryModel,
                    fallback: fallbackModels
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentConfig = data.config;
                this.updateCurrentConfigDisplay();
                this.log(`Model configuration updated: Primary=${primaryModel}, Fallback=${fallbackModels.join(', ')}`);
                this.showAlert('Model configuration updated successfully!', 'success');
                
                // Refresh chatbot model configuration if available
                if (window.chatbotService && typeof window.chatbotService.refreshModelConfiguration === 'function') {
                    window.chatbotService.refreshModelConfiguration();
                    this.log('Chatbot model configuration refreshed');
                }
            } else {
                throw new Error(data.error || 'Failed to update configuration');
            }
        } catch (error) {
            this.log(`Error updating model configuration: ${error.message}`, 'error');
            this.showAlert(`Failed to update configuration: ${error.message}`, 'error');
        }
    }
    
    async resetToDefaults() {
        if (!confirm('Are you sure you want to reset to default configuration?')) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/model-config?admin_key=${this.adminKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    primary: 'gemma2:2b',
                    fallback: ['llama3.1:8b', 'gpt-oss:20b']
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentConfig = data.config;
                this.updateModelSelectors();
                this.updateCurrentConfigDisplay();
                this.log('Configuration reset to defaults');
                this.showAlert('Configuration reset to defaults!', 'success');
                
                // Refresh chatbot model configuration if available
                if (window.chatbotService && typeof window.chatbotService.refreshModelConfiguration === 'function') {
                    window.chatbotService.refreshModelConfiguration();
                    this.log('Chatbot model configuration refreshed');
                }
            } else {
                throw new Error(data.error || 'Failed to reset configuration');
            }
        } catch (error) {
            this.log(`Error resetting configuration: ${error.message}`, 'error');
            this.showAlert(`Failed to reset configuration: ${error.message}`, 'error');
        }
    }
    
    async refreshSystemStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/service-status?admin_key=${this.adminKey}`);
            const data = await response.json();
            
            if (data.success) {
                this.updateServiceStatus(data.services);
                this.log('System status refreshed');
            } else {
                throw new Error(data.error || 'Failed to get service status');
            }
        } catch (error) {
            this.log(`Error refreshing system status: ${error.message}`, 'error');
        }
    }
    
    updateServiceStatus(services) {
        // Update Ollama status
        const ollamaStatus = document.getElementById('ollama-status');
        const ollamaIndicator = document.querySelector('#ollama-status').previousElementSibling;
        if (ollamaStatus) {
            ollamaStatus.textContent = services.ollama.available ? 'Online' : 'Offline';
            ollamaIndicator.className = `status-indicator ${services.ollama.available ? 'status-online' : 'status-offline'}`;
        }
        
        // Update Gemini status
        const geminiStatus = document.getElementById('gemini-status');
        const geminiIndicator = document.querySelector('#gemini-status').previousElementSibling;
        if (geminiStatus) {
            geminiStatus.textContent = services.gemini.available ? 'Online' : 'Offline';
            geminiIndicator.className = `status-indicator ${services.gemini.available ? 'status-online' : 'status-offline'}`;
        }
        
        // Update Cohere status
        const cohereStatus = document.getElementById('cohere-status');
        const cohereIndicator = document.querySelector('#cohere-status').previousElementSibling;
        if (cohereStatus) {
            cohereStatus.textContent = services.cohere.available ? 'Online' : 'Offline';
            cohereIndicator.className = `status-indicator ${services.cohere.available ? 'status-online' : 'status-offline'}`;
        }
    }
    
    async testCurrentModel() {
        if (!this.currentConfig || !this.currentConfig.primary) {
            this.showAlert('No primary model configured', 'warning');
            return;
        }
        
        this.log(`Testing model: ${this.currentConfig.primary}`);
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/test-model?admin_key=${this.adminKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: this.currentConfig.primary
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.log(`Model test successful: ${data.response} (${data.responseTime}ms)`, 'success');
                this.showAlert(`Model test successful! Response time: ${data.responseTime}ms`, 'success');
            } else {
                this.log(`Model test failed: ${data.error} (${data.responseTime}ms)`, 'error');
                this.showAlert(`Model test failed: ${data.error}`, 'error');
            }
        } catch (error) {
            this.log(`Error testing model: ${error.message}`, 'error');
            this.showAlert(`Error testing model: ${error.message}`, 'error');
        }
    }
    
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${message}
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 1.2em; cursor: pointer;">&times;</button>
        `;
        
        alertContainer.appendChild(alert);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            type
        };
        
        this.logs.unshift(logEntry);
        
        // Keep only last 100 logs
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(0, 100);
        }
        
        this.updateLogsDisplay();
    }
    
    updateLogsDisplay() {
        const logsContainer = document.getElementById('system-logs');
        if (!logsContainer) return;
        
        const logsHtml = this.logs.map(log => `
            <div class="log-entry">
                <span class="log-timestamp">[${log.timestamp}]</span>
                <span class="log-${log.type}">${log.message}</span>
            </div>
        `).join('');
        
        logsContainer.innerHTML = logsHtml;
    }
    
    clearLogs() {
        this.logs = [];
        this.updateLogsDisplay();
        this.log('Logs cleared');
    }
    
    /**
     * Setup real-time updates for admin dashboard
     */
    setupRealTimeUpdates() {
        try {
            this.configStream = new EventSource(`${this.apiBaseUrl}/config/stream`);
            
            this.configStream.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    if (data.type === 'config' || data.type === 'config_update') {
                        // Update current configuration display
                        this.currentConfig = data.data;
                        this.updateConfigDisplay();
                        this.log(`Real-time config update: ${data.data.primary} (${data.data.fallback.join(', ')})`);
                    } else if (data.type === 'ping') {
                        // Keep connection alive
                        console.log('Admin config stream ping received');
                    }
                } catch (error) {
                    console.error('Error parsing admin config stream data:', error);
                }
            };
            
            this.configStream.onerror = (error) => {
                console.error('Admin config stream error:', error);
                // Attempt to reconnect after 5 seconds
                setTimeout(() => {
                    if (this.configStream) {
                        this.configStream.close();
                        this.setupRealTimeUpdates();
                    }
                }, 5000);
            };
            
            console.log('Admin real-time configuration stream connected');
        } catch (error) {
            console.error('Failed to setup admin real-time updates:', error);
        }
    }
    
    /**
     * Update configuration display in admin dashboard
     */
    updateConfigDisplay() {
        if (this.currentConfig) {
            // Update current configuration display
            const currentPrimary = document.getElementById('current-primary');
            const currentFallback = document.getElementById('current-fallback');
            const lastUpdated = document.getElementById('last-updated');
            
            if (currentPrimary) currentPrimary.textContent = this.currentConfig.primary;
            if (currentFallback) currentFallback.textContent = this.currentConfig.fallback.join(' → ');
            if (lastUpdated) lastUpdated.textContent = new Date(this.currentConfig.lastUpdated).toLocaleString();
        }
    }
    
    /**
     * Cleanup real-time updates
     */
    cleanupRealTimeUpdates() {
        if (this.configStream) {
            this.configStream.close();
            this.configStream = null;
            console.log('Admin real-time configuration stream disconnected');
        }
    }
    
    // User Management Functions
    async loadUsers() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/users?admin_key=${this.adminKey}`);
            const data = await response.json();
            
            if (data.success) {
                this.updateUsersDisplay(data.users);
                this.log(`Loaded ${data.users.length} users`);
            } else {
                throw new Error(data.error || 'Failed to load users');
            }
        } catch (error) {
            this.log(`Error loading users: ${error.message}`, 'error');
            this.showAlert('Failed to load users', 'error');
        }
    }
    
    updateUsersDisplay(users) {
        const container = document.getElementById('users-list');
        if (!container) return;
        
        if (users.length === 0) {
            container.innerHTML = '<p>No users found</p>';
            return;
        }
        
        const usersHtml = users.map(user => `
            <div class="status-item">
                <div class="status-info">
                    <span class="status-indicator ${user.isBanned ? 'status-offline' : 'status-online'}"></span>
                    <div>
                        <div class="status-label">${user.displayName || 'No name'}</div>
                        <div class="status-value">${user.email} • ${user.chatCount} chats</div>
                        <div class="status-value" style="font-size: 12px; color: #999;">
                            Last sign-in: ${new Date(user.lastSignIn).toLocaleString()} • 
                            ${user.emailVerified ? '✓ Verified' : '✗ Unverified'}
                        </div>
                    </div>
                </div>
                <div>
                    <button class="btn ${user.isBanned ? 'btn-success' : 'btn-danger'}" 
                            onclick="toggleUserBan('${user.uid}', ${user.isBanned})">
                        ${user.isBanned ? 'Unban' : 'Ban'}
                    </button>
                </div>
            </div>
        `).join('');
        
        container.innerHTML = usersHtml;
    }
    
    async toggleUserBan(uid, isCurrentlyBanned) {
        const action = isCurrentlyBanned ? 'unban' : 'ban';
        const confirmMessage = isCurrentlyBanned ? 
            'Are you sure you want to unban this user?' : 
            'Are you sure you want to ban this user?';
            
        if (!confirm(confirmMessage)) {
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/users/ban?admin_key=${this.adminKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uid: uid,
                    action: action
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.log(`User ${action}ned successfully: ${uid}`);
                this.showAlert(`User ${action}ned successfully`, 'success');
                this.loadUsers(); // Refresh user list
            } else {
                throw new Error(data.error || `Failed to ${action} user`);
            }
        } catch (error) {
            this.log(`Error ${action}ning user: ${error.message}`, 'error');
            this.showAlert(`Failed to ${action} user: ${error.message}`, 'error');
        }
    }
    
    // Health Monitoring Functions
    async loadHealthStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/admin/health?admin_key=${this.adminKey}`);
            const data = await response.json();
            
            if (data.success) {
                this.updateHealthDisplay(data.health);
                this.log('Health status loaded');
            } else {
                throw new Error(data.error || 'Failed to load health status');
            }
        } catch (error) {
            this.log(`Error loading health status: ${error.message}`, 'error');
            this.showAlert('Failed to load health status', 'error');
        }
    }
    
    updateHealthDisplay(health) {
        const container = document.getElementById('health-status');
        if (!container) return;
        
        const healthHtml = Object.entries(health).map(([service, data]) => `
            <div class="model-info">
                <h4>${service.toUpperCase()}</h4>
                <div class="status-item">
                    <div class="status-info">
                        <span class="status-indicator ${data.status === 'healthy' ? 'status-online' : 'status-offline'}"></span>
                        <span class="status-label">Status</span>
                    </div>
                    <span class="status-value">${data.status}</span>
                </div>
                ${data.responseTime ? `
                <div class="status-item">
                    <span class="status-label">Response Time</span>
                    <span class="status-value">${data.responseTime}ms</span>
                </div>
                ` : ''}
                ${data.memoryUsage ? `
                <div class="status-item">
                    <span class="status-label">Memory Usage</span>
                    <span class="status-value">${data.memoryUsage}</span>
                </div>
                ` : ''}
                ${data.cpuUsage ? `
                <div class="status-item">
                    <span class="status-label">CPU Usage</span>
                    <span class="status-value">${data.cpuUsage}</span>
                </div>
                ` : ''}
                ${data.uptime ? `
                <div class="status-item">
                    <span class="status-label">Uptime</span>
                    <span class="status-value">${data.uptime}</span>
                </div>
                ` : ''}
            </div>
        `).join('');
        
        container.innerHTML = healthHtml;
    }
}

// Global functions for HTML onclick handlers
function updateModelConfiguration() {
    if (window.adminDashboard) {
        window.adminDashboard.updateModelConfiguration();
    }
}

function resetToDefaults() {
    if (window.adminDashboard) {
        window.adminDashboard.resetToDefaults();
    }
}

function refreshSystemStatus() {
    if (window.adminDashboard) {
        window.adminDashboard.refreshSystemStatus();
    }
}

function testCurrentModel() {
    if (window.adminDashboard) {
        window.adminDashboard.testCurrentModel();
    }
}

function loadAvailableModels() {
    if (window.adminDashboard) {
        window.adminDashboard.loadAvailableModels();
    }
}

function clearLogs() {
    if (window.adminDashboard) {
        window.adminDashboard.clearLogs();
    }
}

function loadUsers() {
    if (window.adminDashboard) {
        window.adminDashboard.loadUsers();
    }
}

function loadHealthStatus() {
    if (window.adminDashboard) {
        window.adminDashboard.loadHealthStatus();
    }
}

function toggleUserBan(uid, isCurrentlyBanned) {
    if (window.adminDashboard) {
        window.adminDashboard.toggleUserBan(uid, isCurrentlyBanned);
    }
}

function logout() {
    if (window.adminDashboard) {
        window.adminDashboard.logout();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.adminDashboard = new AdminDashboard();
});

// Cleanup when page unloads
window.addEventListener('beforeunload', function() {
    if (window.adminDashboard && window.adminDashboard.cleanupRealTimeUpdates) {
        window.adminDashboard.cleanupRealTimeUpdates();
    }
});
