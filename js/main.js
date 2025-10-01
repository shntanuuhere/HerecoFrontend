/**
 * Main JavaScript file for the podcast website frontend
 * Handles UI interactions, API consumption, and user experience
 */

// Global state management
const AppState = {
    episodes: [],
    files: [],
    currentPage: 1,
    isLoading: false,
    searchQuery: '',
    filterType: 'all',
    sortBy: 'date-newest',
    hasMoreFiles: true,
    theme: 'light', // 'light' or 'dark'
    notifications: [],
    preferences: {
        autoRefresh: true,
        lazyLoading: true,
        animations: true,
        reducedMotion: false
    }
};

// Utility functions
const Utils = {
    /**
     * Show loading indicator
     * @param {string} elementId - Element ID to show loading in
     * @param {string} message - Loading message
     */
    showLoading(elementId, message = 'Loading...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading-indicator">
                    <div class="loading-spinner"></div>
                    <span>${message}</span>
                </div>
            `;
        }
    },

    /**
     * Hide loading indicator
     * @param {string} elementId - Element ID to hide loading in
     */
    hideLoading(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            const loadingIndicator = element.querySelector('.loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
        }
    },

    /**
     * Show error message
     * @param {string} elementId - Element ID to show error in
     * @param {string} message - Error message
     * @param {Function} retryCallback - Optional retry callback
     */
    showError(elementId, message, retryCallback = null) {
        const element = document.getElementById(elementId);
        if (element) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            
            const messageP = document.createElement('p');
            messageP.textContent = message;
            errorDiv.appendChild(messageP);
            
            if (retryCallback) {
                const retryButton = document.createElement('button');
                retryButton.className = 'retry-button';
                retryButton.textContent = 'Retry';
                retryButton.addEventListener('click', retryCallback);
                errorDiv.appendChild(retryButton);
            }
            
            element.innerHTML = '';
            element.appendChild(errorDiv);
        }
    },

    /**
     * Show empty state
     * @param {string} elementId - Element ID to show empty state in
     * @param {string} message - Empty state message
     * @param {string} icon - Optional icon
     */
    showEmpty(elementId, message, icon = '📭') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${icon}</div>
                    <div class="empty-message">${message}</div>
                </div>
            `;
        }
    },

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Format file size
     * @param {number} bytes - File size in bytes
     * @returns {string} Formatted file size
     */
    formatFileSize(bytes) {
        return Config.formatFileSize(bytes);
    },

    /**
     * Format date
     * @param {string} dateString - Date string
     * @returns {string} Formatted date
     */
    formatDate(dateString) {
        return Config.formatDate(dateString);
    },

    /**
     * Get file type info
     * @param {string} filename - File name
     * @returns {Object} File type information
     */
    getFileTypeInfo(filename) {
        return Config.getFileTypeInfo(filename);
    },

    /**
     * Close modal
     */
    closeModal() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.classList.add('hidden');
        });
    },

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     * @param {number} duration - Duration in milliseconds
     * @param {Object} options - Additional options
     */
    showNotification(message, type = 'info', duration = 5000, options = {}) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.innerHTML = `
            <span class="notification-icon" aria-hidden="true">${icons[type] || icons.info}</span>
            <span class="notification-content">${message}</span>
            <button class="notification-close" aria-label="Close notification" title="Close">
                <span aria-hidden="true">×</span>
            </button>
        `;
        
        // Add to state
        AppState.notifications.push({
            id: Date.now(),
            message,
            type,
            element: notification
        });
        
        document.body.appendChild(notification);
        
        // Show notification with animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto-remove after duration
        const autoRemove = setTimeout(() => {
            this.hideNotification(notification);
        }, duration);
        
        // Manual close button
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.hideNotification(notification);
        });
        
        // Keyboard support
        notification.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                clearTimeout(autoRemove);
                this.hideNotification(notification);
            }
        });
        
        return notification;
    },

    /**
     * Hide notification with animation
     * @param {HTMLElement} notification - Notification element
     */
    hideNotification(notification) {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            
            // Remove from state
            AppState.notifications = AppState.notifications.filter(n => n.element !== notification);
        }, 300);
    },

    /**
     * Clear all notifications
     */
    clearAllNotifications() {
        AppState.notifications.forEach(notification => {
            this.hideNotification(notification.element);
        });
    },

    /**
     * Initialize theme system
     */
    initTheme() {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        AppState.theme = savedTheme || (prefersDark ? 'dark' : 'light');
        this.applyTheme(AppState.theme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                AppState.theme = e.matches ? 'dark' : 'light';
                this.applyTheme(AppState.theme);
            }
        });
    },

    /**
     * Apply theme to document
     * @param {string} theme - Theme name ('light' or 'dark')
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        AppState.theme = theme;
        localStorage.setItem('theme', theme);
        
        // Update theme toggle button
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.setAttribute('aria-label', `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`);
            themeToggle.setAttribute('title', `Switch to ${theme === 'light' ? 'dark' : 'light'} theme`);
        }
    },

    /**
     * Toggle theme between light and dark
     */
    toggleTheme() {
        const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        
        // Show notification
        this.showNotification(
            `Switched to ${newTheme} theme`, 
            'success', 
            2000
        );
    },

    /**
     * Initialize accessibility features
     */
    initAccessibility() {
        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        AppState.preferences.reducedMotion = prefersReducedMotion;
        
        if (prefersReducedMotion) {
            document.documentElement.classList.add('reduced-motion');
        }
        
        // Add skip link
        this.addSkipLink();
        
        // Initialize focus management
        this.initFocusManagement();
    },

    /**
     * Add skip link for keyboard navigation
     */
    addSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'skip-link';
        skipLink.style.cssText = `
            position: absolute;
            top: -40px;
            left: 6px;
            background: var(--primary-color);
            color: white;
            padding: 8px;
            text-decoration: none;
            border-radius: 4px;
            z-index: 1000;
            transition: top 0.3s;
        `;
        
        skipLink.addEventListener('focus', () => {
            skipLink.style.top = '6px';
        });
        
        skipLink.addEventListener('blur', () => {
            skipLink.style.top = '-40px';
        });
        
        document.body.insertBefore(skipLink, document.body.firstChild);
    },

    /**
     * Initialize focus management
     */
    initFocusManagement() {
        // Trap focus in modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const modal = document.querySelector('.modal-overlay:not(.hidden)');
                if (modal) {
                    this.trapFocus(modal, e);
                }
            }
        });
    },

    /**
     * Trap focus within an element
     * @param {HTMLElement} element - Element to trap focus in
     * @param {KeyboardEvent} e - Keyboard event
     */
    trapFocus(element, e) {
        const focusableElements = element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    }
};

// Projects Module (Podcast Episodes)
const ProjectsModule = {
    /**
     * Initialize projects module
     */
    init() {
        this.bindEvents();
        this.loadEpisodes();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const refreshButton = document.getElementById('refresh-button');
        const searchInput = document.getElementById('episode-search-input');

        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshEpisodes());
        }

        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchEpisodes(e.target.value);
            }, Config.constants.debounceDelay));
        }
    },

    /**
     * Load podcast episodes
     */
    async loadEpisodes() {
        try {
            Utils.showLoading('projects-container', 'Loading podcast episodes...');
            AppState.isLoading = true;

            const response = await apiService.getEpisodes();
            
            if (response.success && response.data) {
                AppState.episodes = response.data;
                this.renderEpisodes(AppState.episodes);
            } else {
                Utils.showError('projects-container', Config.messages.podcast.loadError, this.loadEpisodes);
            }
        } catch (error) {
            console.error('Error loading episodes:', error);
            Utils.showError('projects-container', error.message || Config.messages.podcast.loadError, this.loadEpisodes);
        } finally {
            AppState.isLoading = false;
            Utils.hideLoading('projects-container');
        }
    },

    /**
     * Refresh episodes
     */
    async refreshEpisodes() {
        // Clear cache and reload
        await apiService.clearCache('rss');
        await this.loadEpisodes();
        Utils.showNotification('Episodes refreshed successfully!', 'success');
    },

    /**
     * Search episodes
     * @param {string} query - Search query
     */
    async searchEpisodes(query) {
        AppState.searchQuery = query;
        
        if (!query.trim()) {
            this.renderEpisodes(AppState.episodes);
            return;
        }

        try {
            const filteredEpisodes = AppState.episodes.filter(episode => 
                episode.title.toLowerCase().includes(query.toLowerCase()) ||
                episode.description.toLowerCase().includes(query.toLowerCase())
            );
            
            this.renderEpisodes(filteredEpisodes);
        } catch (error) {
            console.error('Error searching episodes:', error);
            Utils.showNotification(Config.messages.podcast.searchError, 'error');
        }
    },

    /**
     * Render episodes
     * @param {Array} episodes - Episodes to render
     */
    renderEpisodes(episodes) {
        const container = document.getElementById('projects-container');
        
        if (!episodes || episodes.length === 0) {
            Utils.showEmpty('projects-container', Config.messages.podcast.noEpisodes, '🎧');
            return;
        }

        const episodesHtml = episodes.map(episode => this.createEpisodeCard(episode)).join('');
        container.innerHTML = episodesHtml;
    },

    /**
     * Create episode card HTML
     * @param {Object} episode - Episode data
     * @returns {string} Episode card HTML
     */
    createEpisodeCard(episode) {
        const description = episode.description || episode.summary || '';
        const truncatedDescription = description.length > Config.rss.podcast.descriptionLength 
            ? description.substring(0, Config.rss.podcast.descriptionLength) + '...'
            : description;

        const audioHtml = episode.enclosure ? `
            <div class="episode-audio">
                <audio controls preload="none">
                    <source src="${episode.enclosure.url}" type="${episode.enclosure.type}">
                    Your browser does not support the audio element.
                </audio>
            </div>
        ` : '';

        const artworkHtml = episode.image ? `
            <div class="episode-artwork">
                <img src="${episode.image}" alt="${episode.title}" loading="lazy">
            </div>
        ` : '';

        const metadataHtml = `
            <div class="episode-metadata">
                ${episode.pubDate ? `<span class="episode-date">${Utils.formatDate(episode.pubDate)}</span>` : ''}
                ${episode.duration ? `<span class="episode-duration">${episode.duration}</span>` : ''}
            </div>
        `;

        const linksHtml = episode.link ? `
            <div class="episode-links">
                <a href="${episode.link}" target="_blank" rel="noopener noreferrer" class="episode-link">
                    View Episode
                </a>
            </div>
        ` : '';

        return `
            <div class="episode-card">
                ${artworkHtml}
                <div class="episode-content">
                    <h3 class="episode-title">${episode.title}</h3>
                    ${metadataHtml}
                    <p class="episode-description episode-description--clamp">
                        ${truncatedDescription}
                    </p>
                    ${audioHtml}
                    ${linksHtml}
                </div>
            </div>
        `;
    }
};

// Gallery Module
const GalleryModule = {
    /**
     * Initialize gallery module
     */
    init() {
        this.bindEvents();
        this.loadFiles();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const searchInput = document.getElementById('gallery-search');
        const filterSelect = document.getElementById('gallery-filter');
        const sortSelect = document.getElementById('gallery-sort');
        const loadMoreBtn = document.getElementById('load-more-btn');

        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchFiles(e.target.value);
            }, Config.constants.debounceDelay));
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.filterFiles(e.target.value);
            });
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.sortFiles(e.target.value);
            });
        }

        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreFiles();
            });
        }
    },

    /**
     * Load files
     */
    async loadFiles() {
        try {
            Utils.showLoading('gallery-container', 'Loading files...');
            AppState.isLoading = true;

            const response = await apiService.getFiles({
                maxResults: Config.ui.itemsPerPage,
                page: 1
            });
            
            if (response.success && response.data) {
                AppState.files = response.data;
                AppState.currentPage = 1;
                AppState.hasMoreFiles = response.pagination ? response.pagination.hasMore : response.data.length >= Config.ui.itemsPerPage;
                this.renderFiles(AppState.files);
                this.updateLoadMoreButton();
            } else {
                Utils.showError('gallery-container', Config.messages.gallery.loadError, this.loadFiles);
            }
        } catch (error) {
            console.error('Error loading files:', error);
            Utils.showError('gallery-container', error.message || Config.messages.gallery.loadError, this.loadFiles);
        } finally {
            AppState.isLoading = false;
            Utils.hideLoading('gallery-container');
        }
    },

    /**
     * Load more files
     */
    async loadMoreFiles() {
        if (AppState.isLoading || !AppState.hasMoreFiles) return;

        try {
            AppState.isLoading = true;
            const nextPage = AppState.currentPage + 1;

            const response = await apiService.getFiles({
                maxResults: Config.ui.itemsPerPage,
                page: nextPage
            });
            
            if (response.success && response.data) {
                AppState.files = [...AppState.files, ...response.data];
                AppState.currentPage = nextPage;
                AppState.hasMoreFiles = response.pagination ? response.pagination.hasMore : response.data.length >= Config.ui.itemsPerPage;
                this.renderFiles(AppState.files);
                this.updateLoadMoreButton();
            }
        } catch (error) {
            console.error('Error loading more files:', error);
            Utils.showNotification(Config.messages.gallery.loadMoreError, 'error');
        } finally {
            AppState.isLoading = false;
        }
    },

    /**
     * Search files
     * @param {string} query - Search query
     */
    async searchFiles(query) {
        AppState.searchQuery = query;
        
        if (!query.trim()) {
            this.renderFiles(AppState.files);
            return;
        }

        try {
            const filteredFiles = AppState.files.filter(file => 
                file.name.toLowerCase().includes(query.toLowerCase())
            );
            
            this.renderFiles(filteredFiles);
        } catch (error) {
            console.error('Error searching files:', error);
            Utils.showNotification(Config.messages.gallery.searchError, 'error');
        }
    },

    /**
     * Filter files by type
     * @param {string} type - File type filter
     */
    filterFiles(type) {
        AppState.filterType = type;
        
        if (type === 'all') {
            this.renderFiles(AppState.files);
            return;
        }

        const filteredFiles = AppState.files.filter(file => {
            const fileTypeInfo = Utils.getFileTypeInfo(file.name);
            return fileTypeInfo.type === type;
        });
        
        this.renderFiles(filteredFiles);
    },

    /**
     * Sort files
     * @param {string} sortBy - Sort criteria
     */
    sortFiles(sortBy) {
        AppState.sortBy = sortBy;
        
        const sortedFiles = [...AppState.files].sort((a, b) => {
            switch (sortBy) {
                case 'date-newest':
                    return new Date(b.lastModified) - new Date(a.lastModified);
                case 'date-oldest':
                    return new Date(a.lastModified) - new Date(b.lastModified);
                case 'name-asc':
                    return a.name.localeCompare(b.name);
                case 'name-desc':
                    return b.name.localeCompare(a.name);
                case 'size-largest':
                    return (b.size || 0) - (a.size || 0);
                case 'size-smallest':
                    return (a.size || 0) - (b.size || 0);
                default:
                    return 0;
            }
        });
        
        this.renderFiles(sortedFiles);
    },

    /**
     * Render files
     * @param {Array} files - Files to render
     */
    renderFiles(files) {
        const container = document.getElementById('gallery-container');
        
        if (!files || files.length === 0) {
            Utils.showEmpty('gallery-container', Config.messages.gallery.empty, '📁');
            return;
        }

        const filesHtml = files.map(file => this.createFileItem(file)).join('');
        container.innerHTML = filesHtml;
        
        // Bind event listeners for the new buttons
        this.bindFileActionButtons();
    },

    /**
     * Create file item HTML
     * @param {Object} file - File data
     * @returns {string} File item HTML
     */
    createFileItem(file) {
        const fileTypeInfo = Utils.getFileTypeInfo(file.name);
        const isImage = fileTypeInfo.type === 'image';
        const isVideo = fileTypeInfo.type === 'video';
        const isAudio = fileTypeInfo.type === 'audio';
        const isDocument = fileTypeInfo.type === 'document';
        
        // Create preview HTML based on file type
        const thumbnailHtml = this.createFilePreview(file, fileTypeInfo);

        const overlayHtml = `
            <div class="file-overlay">
                <button class="file-action-btn download-btn" data-filename="${file.name}" title="Download">
                    ⬇️
                </button>
                <button class="file-action-btn preview-btn" data-filename="${file.name}" title="Preview">
                    👁️
                </button>
                <button class="file-action-btn info-btn" data-filename="${file.name}" title="View Details">
                    ℹ️
                </button>
            </div>
        `;

        return `
            <div class="file-item" data-file-type="${fileTypeInfo.type}">
                <div class="file-thumbnail">
                    ${thumbnailHtml}
                    ${overlayHtml}
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">
                        <span class="file-size">${Utils.formatFileSize(file.size || 0)}</span>
                        <span class="file-date">${Utils.formatDate(file.lastModified)}</span>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Create file preview HTML based on file type
     * @param {Object} file - File data
     * @param {Object} fileTypeInfo - File type information
     * @returns {string} Preview HTML
     */
    createFilePreview(file, fileTypeInfo) {
        const isImage = fileTypeInfo.type === 'image';
        const isVideo = fileTypeInfo.type === 'video';
        const isAudio = fileTypeInfo.type === 'audio';
        const isDocument = fileTypeInfo.type === 'document';
        
        if (isImage) {
            return `
                <div class="file-preview-container">
                    <img src="${file.url}" 
                         alt="${file.name}" 
                         class="file-preview-image" 
                         loading="lazy"
                         onerror="this.parentElement.innerHTML='<div class=\\"file-preview-fallback\\">${fileTypeInfo.icon}</div>'">
                    <div class="file-preview-overlay">
                        <span class="file-type-badge">${fileTypeInfo.icon}</span>
                    </div>
                </div>
            `;
        }
        
        if (isVideo) {
            return `
                <div class="file-preview-container">
                    <video class="file-preview-video" 
                           preload="metadata" 
                           muted
                           onloadedmetadata="this.currentTime = 1">
                        <source src="${file.url}" type="${file.contentType}">
                    </video>
                    <div class="file-preview-overlay">
                        <span class="file-type-badge">${fileTypeInfo.icon}</span>
                        <div class="play-button">▶️</div>
                    </div>
                </div>
            `;
        }
        
        if (isAudio) {
            return `
                <div class="file-preview-container audio-preview">
                    <div class="audio-waveform">
                        <div class="waveform-bar"></div>
                        <div class="waveform-bar"></div>
                        <div class="waveform-bar"></div>
                        <div class="waveform-bar"></div>
                        <div class="waveform-bar"></div>
                    </div>
                    <div class="file-preview-overlay">
                        <span class="file-type-badge">${fileTypeInfo.icon}</span>
                        <div class="play-button">▶️</div>
                    </div>
                </div>
            `;
        }
        
        if (isDocument) {
            return `
                <div class="file-preview-container document-preview">
                    <div class="document-preview-content">
                        <div class="document-lines">
                            <div class="document-line"></div>
                            <div class="document-line"></div>
                            <div class="document-line"></div>
                            <div class="document-line short"></div>
                        </div>
                    </div>
                    <div class="file-preview-overlay">
                        <span class="file-type-badge">${fileTypeInfo.icon}</span>
                    </div>
                </div>
            `;
        }
        
        // Default fallback for other file types
        return `
            <div class="file-preview-container default-preview">
                <div class="file-preview-fallback">
                    <div class="file-icon-large">${fileTypeInfo.icon}</div>
                    <div class="file-extension">${file.name.split('.').pop()?.toUpperCase()}</div>
                </div>
                <div class="file-preview-overlay">
                    <span class="file-type-badge">${fileTypeInfo.icon}</span>
                </div>
            </div>
        `;
    },

    /**
     * Bind event listeners for file action buttons
     */
    bindFileActionButtons() {
        // Download buttons
        const downloadButtons = document.querySelectorAll('.download-btn');
        downloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const filename = button.dataset.filename;
                this.downloadFile(filename);
            });
        });

        // Preview buttons
        const previewButtons = document.querySelectorAll('.preview-btn');
        previewButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const filename = button.dataset.filename;
                this.previewFile(filename);
            });
        });

        // Info buttons
        const infoButtons = document.querySelectorAll('.info-btn');
        infoButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const filename = button.dataset.filename;
                this.viewFileDetails(filename);
            });
        });

        // Video play buttons
        const videoPreviews = document.querySelectorAll('.file-preview-video');
        videoPreviews.forEach(video => {
            video.addEventListener('click', () => {
                if (video.paused) {
                    video.play();
                } else {
                    video.pause();
                }
            });
        });
    },

    /**
     * Preview file in modal
     * @param {string} filename - File name
     */
    async previewFile(filename) {
        try {
            const file = AppState.files.find(f => f.name === filename);
            if (!file) {
                Utils.showNotification('File not found', 'error');
                return;
            }

            const fileTypeInfo = Utils.getFileTypeInfo(filename);
            const isImage = fileTypeInfo.type === 'image';
            const isVideo = fileTypeInfo.type === 'video';
            const isAudio = fileTypeInfo.type === 'audio';

            let previewHtml = '';
            
            if (isImage) {
                previewHtml = `
                    <div class="file-preview-modal">
                        <img src="${file.url}" alt="${filename}" class="preview-image">
                    </div>
                `;
            } else if (isVideo) {
                previewHtml = `
                    <div class="file-preview-modal">
                        <video controls class="preview-video">
                            <source src="${file.url}" type="${file.contentType}">
                        </video>
                    </div>
                `;
            } else if (isAudio) {
                previewHtml = `
                    <div class="file-preview-modal">
                        <audio controls class="preview-audio">
                            <source src="${file.url}" type="${file.contentType}">
                        </audio>
                    </div>
                `;
            } else {
                previewHtml = `
                    <div class="file-preview-modal">
                        <div class="preview-fallback">
                            <div class="preview-icon">${fileTypeInfo.icon}</div>
                            <p>Preview not available for this file type</p>
                        </div>
                    </div>
                `;
            }

            Utils.showModal('File Preview', previewHtml);
        } catch (error) {
            console.error('Error previewing file:', error);
            Utils.showNotification('Failed to preview file', 'error');
        }
    },

    /**
     * Download file
     * @param {string} filename - File name
     */
    async downloadFile(filename) {
        try {
            const response = await apiService.getFileDownloadUrl(filename);
            
            if (response.success && response.data.downloadUrl) {
                const link = document.createElement('a');
                link.href = response.data.downloadUrl;
                link.download = filename;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                Utils.showNotification('Download started!', 'success');
            } else {
                throw new Error('Failed to get download URL');
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            Utils.showNotification(Config.messages.gallery.downloadError, 'error');
        }
    },

    /**
     * View file details
     * @param {string} filename - File name
     */
    async viewFileDetails(filename) {
        try {
            const response = await apiService.getFileInfo(filename);
            
            if (response.success && response.data) {
                this.showFileDetailsModal(response.data);
            } else {
                throw new Error('Failed to get file details');
            }
        } catch (error) {
            console.error('Error getting file details:', error);
            Utils.showNotification('Failed to load file details', 'error');
        }
    },

    /**
     * Show file details modal
     * @param {Object} file - File data
     */
    showFileDetailsModal(file) {
        const modal = document.getElementById('file-detail-modal');
        const content = document.getElementById('file-detail-content');
        
        if (!modal || !content) return;

        const fileTypeInfo = Utils.getFileTypeInfo(file.name);
        const isImage = fileTypeInfo.type === 'image';
        const isVideo = fileTypeInfo.type === 'video';
        
        const previewHtml = isImage ? `
            <div class="file-detail-preview">
                <img src="${file.url}" alt="${file.name}">
            </div>
        ` : isVideo ? `
            <div class="file-detail-preview">
                <video controls>
                    <source src="${file.url}" type="${file.contentType}">
                </video>
            </div>
        ` : '';

        content.innerHTML = `
            ${previewHtml}
            <div class="file-detail-info">
                <span class="file-detail-label">Name:</span>
                <span class="file-detail-value">${file.name}</span>
                
                <span class="file-detail-label">Size:</span>
                <span class="file-detail-value">${Utils.formatFileSize(file.size || 0)}</span>
                
                <span class="file-detail-label">Type:</span>
                <span class="file-detail-value">${file.contentType || 'Unknown'}</span>
                
                <span class="file-detail-label">Modified:</span>
                <span class="file-detail-value">${Utils.formatDate(file.lastModified)}</span>
                
                <span class="file-detail-label">URL:</span>
                <span class="file-detail-value">${file.url}</span>
            </div>
        `;
        
        modal.classList.remove('hidden');
    },

    /**
     * Update load more button visibility
     */
    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            if (AppState.hasMoreFiles && !AppState.isLoading) {
                loadMoreBtn.classList.remove('hidden');
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        }
    }
};

// Mobile Navigation Module
const MobileNavigation = {
    /**
     * Initialize mobile navigation
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const navList = document.querySelector('.nav-list');
        const navLinks = document.querySelectorAll('.nav-link');

        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => this.toggleMenu());
        }

        // Close menu when clicking on nav links
        navLinks.forEach(link => {
            link.addEventListener('click', () => this.closeMenu());
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.navigation')) {
                this.closeMenu();
            }
        });

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMenu();
            }
        });
    },

    /**
     * Toggle mobile menu
     */
    toggleMenu() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const navList = document.querySelector('.nav-list');
        
        if (!mobileToggle || !navList) return;

        const isExpanded = mobileToggle.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    },

    /**
     * Open mobile menu
     */
    openMenu() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const navList = document.querySelector('.nav-list');
        
        if (!mobileToggle || !navList) return;

        mobileToggle.setAttribute('aria-expanded', 'true');
        navList.classList.add('active');
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close mobile menu
     */
    closeMenu() {
        const mobileToggle = document.querySelector('.mobile-menu-toggle');
        const navList = document.querySelector('.nav-list');
        
        if (!mobileToggle || !navList) return;

        mobileToggle.setAttribute('aria-expanded', 'false');
        navList.classList.remove('active');
        
        // Restore body scroll
        document.body.style.overflow = '';
    }
};

// Smooth Scrolling Module
const SmoothScrolling = {
    /**
     * Initialize smooth scrolling
     */
    init() {
        this.bindEvents();
    },

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Handle anchor links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="#"]');
            if (!link) return;

            const href = link.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();
            this.scrollToElement(target);
        });
    },

    /**
     * Scroll to element smoothly
     * @param {HTMLElement} element - Target element
     */
    scrollToElement(element) {
        const header = document.querySelector('.header');
        const headerHeight = header ? header.offsetHeight : 0;
        const offset = headerHeight + 20; // Add some padding
        
        const targetPosition = element.offsetTop - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
};

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize core systems first
    Utils.initTheme();
    Utils.initAccessibility();
    
    // Initialize modules
    ProjectsModule.init();
    GalleryModule.init();
    MobileNavigation.init();
    SmoothScrolling.init();
    
    // Initialize theme toggle
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            Utils.toggleTheme();
        });
    }
    
    // Set up auto-refresh if enabled
    if (Config.ui.autoRefresh && AppState.preferences.autoRefresh) {
        setInterval(() => {
            ProjectsModule.loadEpisodes();
            GalleryModule.loadFiles();
        }, Config.ui.refreshInterval);
    }
    
    // Handle modal close events
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            Utils.closeModal();
        }
    });
    
    // Handle escape key for modals and notifications
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            Utils.closeModal();
            MobileNavigation.closeMenu();
            Utils.clearAllNotifications();
        }
    });
    
    // Performance monitoring
    if (Config.environment.debug) {
        console.log('Podcast website initialized successfully!');
        console.log('Theme:', AppState.theme);
        console.log('Preferences:', AppState.preferences);
    }
});
