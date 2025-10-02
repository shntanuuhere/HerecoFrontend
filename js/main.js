/**
 * Main JavaScript file for the podcast website frontend
 * Handles UI interactions, API consumption, and user experience
 */

// Global state management
const AppState = {
    episodes: [],
    filteredEpisodes: [],
    displayedEpisodes: [],
    files: [],
    currentPage: 1,
    isLoading: false,
    searchQuery: '',
    filterType: 'all',
    sortBy: 'date-newest',
    viewMode: 'cards',
    hasMoreFiles: true,
    theme: 'light', // 'light' or 'dark'
    notifications: [],
    preferences: {
        autoRefresh: true,
        lazyLoading: true,
        animations: true,
        reducedMotion: false
    },
    // Performance settings
    itemsPerPage: 12,
    currentDisplayedCount: 0,
    isLoadingMore: false
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
     * Format duration for display
     * @param {string|number} duration - Duration in seconds or formatted string
     * @returns {string} Formatted duration
     */
    formatDuration(duration) {
        if (!duration) return '';
        
        // If it's already a formatted string, return as is
        if (typeof duration === 'string' && duration.includes(':')) {
            return duration;
        }
        
        const seconds = parseInt(duration);
        if (isNaN(seconds)) return '';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    },

    /**
     * Calculate total duration from episodes
     * @param {Array} episodes - Array of episodes
     * @returns {string} Total duration formatted
     */
    calculateTotalDuration(episodes) {
        if (!episodes || episodes.length === 0) return '0h';
        
        let totalSeconds = 0;
        episodes.forEach(episode => {
            if (episode.duration) {
                const duration = episode.duration;
                if (typeof duration === 'string' && duration.includes(':')) {
                    // Parse MM:SS or HH:MM:SS format
                    const parts = duration.split(':').map(Number);
                    if (parts.length === 2) {
                        totalSeconds += parts[0] * 60 + parts[1];
                    } else if (parts.length === 3) {
                        totalSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
                    }
                } else if (typeof duration === 'number') {
                    totalSeconds += duration;
                }
            }
        });
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    },

    /**
     * Parse duration string to seconds
     * @param {string} duration - Duration string
     * @returns {number} Duration in seconds
     */
    parseDurationToSeconds(duration) {
        if (!duration) return 0;
        
        if (typeof duration === 'number') return duration;
        
        if (typeof duration === 'string' && duration.includes(':')) {
            const parts = duration.split(':').map(Number);
            if (parts.length === 2) {
                return parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        }
        
        return 0;
    },

    /**
     * Initialize lazy loading for images
     */
    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    },

    /**
     * Throttle function calls
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in milliseconds
     * @returns {Function} Throttled function
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Check if element is in viewport
     * @param {Element} element - Element to check
     * @returns {boolean} Whether element is in viewport
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Close modal
     */
    closeModal() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.classList.add('hidden');
            
            // Clean up focus trap handlers
            if (modal._focusTrapHandler) {
                modal.removeEventListener('keydown', modal._focusTrapHandler);
                delete modal._focusTrapHandler;
            }
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
        
        
        // Initialize focus management
        this.initFocusManagement();
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
    },

    /**
     * Show modal dialog
     * @param {string} title - Modal title
     * @param {string} content - Modal content HTML
     * @param {Function} onConfirm - Optional confirm callback
     */
    showModal(title, content, onConfirm = null) {
        const modal = document.getElementById('modal-overlay');
        const modalTitle = modal.querySelector('.modal-title');
        const modalBody = modal.querySelector('.modal-body');
        const confirmBtn = document.getElementById('modal-confirm');
        
        if (modalTitle) modalTitle.textContent = title;
        if (modalBody) modalBody.innerHTML = content;
        
        // Remove hidden class to show modal
        modal.classList.remove('hidden');
        modal.classList.add('show');
        
        // Handle confirm button
        if (confirmBtn && onConfirm) {
            confirmBtn.onclick = () => {
                onConfirm();
                this.closeModal();
            };
        } else if (confirmBtn) {
            confirmBtn.onclick = () => this.closeModal();
        }
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close modal dialog
     */
    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('show');
        }
        
        // Restore body scroll
        document.body.style.overflow = '';
    },

    /**
     * Initialize performance optimizations
     */
    initPerformanceOptimizations() {
        // Optimize scroll performance
        let ticking = false;
        
        const optimizeScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    // Smooth scroll behavior
                    document.documentElement.style.scrollBehavior = 'smooth';
                    ticking = false;
                });
                ticking = true;
            }
        };

        // Throttle scroll events
        window.addEventListener('scroll', optimizeScroll, { passive: true });
        
        // Optimize resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Handle resize optimizations
                Utils.handleResize();
            }, 250);
        }, { passive: true });
        
        // Initialize lazy loading
        this.initLazyLoading();
        
        // Preload critical resources
        this.preloadCriticalResources();
    },

    /**
     * Initialize lazy loading for images and media
     */
    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            img.classList.remove('lazy');
                            observer.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            // Observe all lazy images
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    },

    /**
     * Handle window resize optimizations
     */
    handleResize() {
        // Recalculate any size-dependent elements
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            // Trigger reflow for responsive adjustments
            heroContent.style.transform = 'translateZ(0)';
        }
    },

    /**
     * Preload critical resources for better performance
     */
    preloadCriticalResources() {
        try {
            // Preload critical CSS
            const criticalCSS = document.createElement('link');
            criticalCSS.rel = 'preload';
            criticalCSS.as = 'style';
            criticalCSS.href = 'styles/main.css';
            document.head.appendChild(criticalCSS);
            
            // Preload critical fonts
            const fontPreload = document.createElement('link');
            fontPreload.rel = 'preload';
            fontPreload.as = 'font';
            fontPreload.type = 'font/woff2';
            fontPreload.crossOrigin = 'anonymous';
            document.head.appendChild(fontPreload);
        } catch (error) {
            console.warn('Failed to preload critical resources:', error);
        }
    },

    /**
     * Enhanced error handling with user feedback
     */
    handleError(error, context = 'Unknown') {
        console.error(`Error in ${context}:`, error);
        
        // Show user-friendly error message
        const errorMessage = this.getErrorMessage(error);
        this.showNotification(errorMessage, 'error');
        
        // Report error for monitoring
        this.reportError(error, context);
    },

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            return 'Network connection issue. Please check your internet connection.';
        }
        if (error.message.includes('CORS')) {
            return 'Connection issue. Please try again later.';
        }
        if (error.message.includes('429')) {
            return 'Too many requests. Please wait a moment before trying again.';
        }
        return 'Something went wrong. Please try again.';
    },

    /**
     * Report error for monitoring
     */
    reportError(error, context) {
        if (Config.environment.debug) {
            // In production, you would send this to an error monitoring service
            console.log('Error reported:', { error: error.message, context, timestamp: new Date().toISOString() });
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
        const sortSelect = document.getElementById('episode-sort');
        const filterSelect = document.getElementById('episode-filter');
        const viewSelect = document.getElementById('episode-view');

        if (refreshButton) {
            refreshButton.addEventListener('click', () => this.refreshEpisodes());
        }

        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchEpisodes(e.target.value);
            }, Config.constants.debounceDelay));
        }

        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                AppState.sortBy = e.target.value;
                this.applyFiltersAndSort();
            });
        }

        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                AppState.filterType = e.target.value;
                this.applyFiltersAndSort();
            });
        }

        if (viewSelect) {
            viewSelect.addEventListener('change', (e) => {
                AppState.viewMode = e.target.value;
                this.renderEpisodes(AppState.filteredEpisodes);
            });
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
                this.updateStats();
                this.applyFiltersAndSort();
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
        this.applyFiltersAndSort();
    },

    /**
     * Apply filters and sorting to episodes
     */
    applyFiltersAndSort() {
        let filtered = [...AppState.episodes];

        // Apply search filter
        if (AppState.searchQuery.trim()) {
            const query = AppState.searchQuery.toLowerCase();
            filtered = filtered.filter(episode => 
                episode.title.toLowerCase().includes(query) ||
                (episode.description && episode.description.toLowerCase().includes(query)) ||
                (episode.summary && episode.summary.toLowerCase().includes(query))
            );
        }

        // Apply type filter
        if (AppState.filterType !== 'all') {
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const thisYear = new Date(now.getFullYear(), 0, 1);

            filtered = filtered.filter(episode => {
                const episodeDate = new Date(episode.pubDate);
                const durationSeconds = Utils.parseDurationToSeconds(episode.duration);

                switch (AppState.filterType) {
                    case 'recent':
                        return episodeDate >= thirtyDaysAgo;
                    case 'this-year':
                        return episodeDate >= thisYear;
                    case 'long-form':
                        return durationSeconds >= 1800; // 30 minutes
                    case 'short-form':
                        return durationSeconds > 0 && durationSeconds < 1800;
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (AppState.sortBy) {
                case 'date-newest':
                    return new Date(b.pubDate) - new Date(a.pubDate);
                case 'date-oldest':
                    return new Date(a.pubDate) - new Date(b.pubDate);
                case 'title-asc':
                    return a.title.localeCompare(b.title);
                case 'title-desc':
                    return b.title.localeCompare(a.title);
                case 'duration-longest':
                    return Utils.parseDurationToSeconds(b.duration) - Utils.parseDurationToSeconds(a.duration);
                case 'duration-shortest':
                    return Utils.parseDurationToSeconds(a.duration) - Utils.parseDurationToSeconds(b.duration);
                default:
                    return 0;
            }
        });

        AppState.filteredEpisodes = filtered;
        this.updateStats();
        this.renderEpisodes(filtered);
    },

    /**
     * Update episode statistics
     */
    updateStats() {
        const statsContainer = document.getElementById('episode-stats');
        if (!statsContainer) return;

        const totalEpisodes = AppState.episodes.length;
        const filteredEpisodes = AppState.filteredEpisodes.length;
        const totalDuration = Utils.calculateTotalDuration(AppState.episodes);

        const totalEpisodesEl = document.getElementById('total-episodes');
        const filteredEpisodesEl = document.getElementById('filtered-episodes');
        const totalDurationEl = document.getElementById('total-duration');

        if (totalEpisodesEl) totalEpisodesEl.textContent = totalEpisodes;
        if (filteredEpisodesEl) filteredEpisodesEl.textContent = filteredEpisodes;
        if (totalDurationEl) totalDurationEl.textContent = totalDuration;

        // Show stats if we have episodes
        if (totalEpisodes > 0) {
            statsContainer.classList.remove('hidden');
        } else {
            statsContainer.classList.add('hidden');
        }
    },

    /**
     * Render episodes with pagination
     * @param {Array} episodes - Episodes to render
     * @param {boolean} append - Whether to append to existing content
     */
    renderEpisodes(episodes, append = false) {
        const container = document.getElementById('projects-container');
        
        if (!episodes || episodes.length === 0) {
            if (!append) {
                Utils.showEmpty('projects-container', Config.messages.podcast.noEpisodes, '🎧');
            }
            return;
        }

        // Update container class based on view mode
        container.className = `projects-container ${AppState.viewMode}-view`;

        // Calculate episodes to display
        const startIndex = append ? AppState.currentDisplayedCount : 0;
        const endIndex = Math.min(startIndex + AppState.itemsPerPage, episodes.length);
        const episodesToRender = episodes.slice(startIndex, endIndex);

        if (episodesToRender.length === 0) {
            if (!append) {
                Utils.showEmpty('projects-container', Config.messages.podcast.noEpisodes, '🎧');
            }
            return;
        }

        const episodesHtml = episodesToRender.map(episode => this.createEpisodeCard(episode)).join('');
        
        if (append) {
            container.insertAdjacentHTML('beforeend', episodesHtml);
        } else {
            container.innerHTML = episodesHtml;
            AppState.currentDisplayedCount = 0;
        }

        AppState.currentDisplayedCount = endIndex;
        AppState.displayedEpisodes = episodes.slice(0, endIndex);

        // Add click handlers for episode cards
        this.bindEpisodeCardEvents();
        
        // Initialize lazy loading
        Utils.initLazyLoading();
        
        // Add load more button if needed
        this.updateLoadMoreButton(episodes.length);
        
        // Bind custom audio controls
        this.bindCustomAudioControls();
    },

    /**
     * Update load more button visibility
     * @param {number} totalEpisodes - Total number of episodes
     */
    updateLoadMoreButton(totalEpisodes) {
        let loadMoreBtn = document.getElementById('episode-load-more');
        
        if (AppState.currentDisplayedCount >= totalEpisodes) {
            if (loadMoreBtn) {
                loadMoreBtn.remove();
            }
            return;
        }

        if (!loadMoreBtn) {
            loadMoreBtn = document.createElement('button');
            loadMoreBtn.id = 'episode-load-more';
            loadMoreBtn.className = 'btn btn-secondary load-more-btn';
            loadMoreBtn.textContent = 'Load More Episodes';
            loadMoreBtn.addEventListener('click', () => this.loadMoreEpisodes());
            
            const container = document.getElementById('projects-container');
            container.parentNode.insertBefore(loadMoreBtn, container.nextSibling);
        }
    },

    /**
     * Load more episodes
     */
    loadMoreEpisodes() {
        if (AppState.isLoadingMore) return;
        
        AppState.isLoadingMore = true;
        const loadMoreBtn = document.getElementById('episode-load-more');
        
        if (loadMoreBtn) {
            loadMoreBtn.textContent = 'Loading...';
            loadMoreBtn.disabled = true;
        }

        // Simulate loading delay for better UX
        setTimeout(() => {
            this.renderEpisodes(AppState.filteredEpisodes, true);
            AppState.isLoadingMore = false;
            
            if (loadMoreBtn) {
                loadMoreBtn.textContent = 'Load More Episodes';
                loadMoreBtn.disabled = false;
            }
        }, 300);
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
                <div class="audio-player-wrapper">
                    <div class="audio-controls">
                        <button class="custom-play-button" data-audio-src="${episode.enclosure.url}" data-audio-type="${episode.enclosure.type}">
                            <span class="play-icon">▶</span>
                        </button>
                        <div class="audio-info">
                            <div class="audio-time">
                                <span class="current-time">0:00</span>
                                <span class="time-separator">/</span>
                                <span class="total-time">0:00</span>
                            </div>
                            <div class="progress-container">
                                <div class="progress-bar">
                                    <div class="progress-fill"></div>
                                    <div class="progress-handle"></div>
                                </div>
                            </div>
                        </div>
                        <div class="volume-control">
                            <button class="volume-button" title="Volume">
                                <span class="volume-icon">🔊</span>
                            </button>
                            <div class="volume-slider-container">
                                <div class="volume-slider">
                                    <div class="volume-fill"></div>
                                    <div class="volume-handle"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <audio class="hidden-audio" preload="none">
                        <source src="${episode.enclosure.url}" type="${episode.enclosure.type}">
                        Your browser does not support the audio element.
                    </audio>
                </div>
            </div>
        ` : '';

        const artworkHtml = episode.image ? `
            <div class="episode-artwork">
                <img data-src="${episode.image}" alt="${episode.title}" class="lazy" loading="lazy">
            </div>
        ` : '';

        const metadataHtml = `
            <div class="episode-metadata">
                ${episode.pubDate ? `<span class="episode-date">${Utils.formatDate(episode.pubDate)}</span>` : ''}
                ${episode.duration ? `<span class="episode-duration">${Utils.formatDuration(episode.duration)}</span>` : ''}
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
            <div class="episode-card ${AppState.viewMode}-view" 
                 data-episode-id="${episode.guid || episode.title}"
                 role="article"
                 aria-label="Episode: ${episode.title}"
                 tabindex="0">
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
    },

    /**
     * Bind episode card click events
     */
    bindEpisodeCardEvents() {
        const episodeCards = document.querySelectorAll('.episode-card');
        episodeCards.forEach(card => {
            // Click event
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on links or audio controls
                if (e.target.closest('a') || e.target.closest('audio') || e.target.closest('button')) {
                    return;
                }
                
                this.openEpisodeDetail(card);
            });

            // Keyboard event
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.openEpisodeDetail(card);
                }
            });

            // Focus management
            card.addEventListener('focus', () => {
                card.style.outline = '2px solid var(--primary-500)';
                card.style.outlineOffset = '2px';
            });

            card.addEventListener('blur', () => {
                card.style.outline = 'none';
            });
        });
    },

    /**
     * Open episode detail modal
     * @param {Element} card - Episode card element
     */
    openEpisodeDetail(card) {
        const episodeId = card.dataset.episodeId;
        const episode = AppState.episodes.find(ep => 
            (ep.guid && ep.guid === episodeId) || ep.title === episodeId
        );
        
        if (episode) {
            this.showEpisodeDetail(episode);
        }
    },

    /**
     * Show episode detail modal
     * @param {Object} episode - Episode data
     */
    showEpisodeDetail(episode) {
        const modal = document.getElementById('episode-detail-modal');
        const content = document.getElementById('episode-detail-content');
        const playButton = document.getElementById('episode-detail-play');
        
        if (!modal || !content) return;

        const description = episode.description || episode.summary || 'No description available.';
        const audioHtml = episode.enclosure ? `
            <div class="episode-detail-audio">
                <audio id="episode-detail-audio-player" controls preload="metadata">
                    <source src="${episode.enclosure.url}" type="${episode.enclosure.type}">
                    Your browser does not support the audio element.
                </audio>
            </div>
        ` : '';

        const artworkHtml = episode.image ? `
            <div class="episode-detail-artwork">
                <img src="${episode.image}" alt="${episode.title}">
            </div>
        ` : '';

        const metadataHtml = `
            <div class="episode-detail-metadata">
                ${episode.pubDate ? `
                    <div class="episode-detail-meta-item">
                        <span>📅</span>
                        <span>${Utils.formatDate(episode.pubDate)}</span>
                    </div>
                ` : ''}
                ${episode.duration ? `
                    <div class="episode-detail-meta-item">
                        <span>⏱️</span>
                        <span>${Utils.formatDuration(episode.duration)}</span>
                    </div>
                ` : ''}
                ${episode.enclosure ? `
                    <div class="episode-detail-meta-item">
                        <span>🎵</span>
                        <span>Audio Available</span>
                    </div>
                ` : ''}
            </div>
        `;

        const linksHtml = episode.link ? `
            <div class="episode-detail-links">
                <a href="${episode.link}" target="_blank" rel="noopener noreferrer" class="episode-detail-link">
                    View Original Episode
                </a>
            </div>
        ` : '';

        content.innerHTML = `
            <div class="episode-detail-content">
                <div class="episode-detail-header">
                    ${artworkHtml}
                    <div class="episode-detail-info">
                        <h2 class="episode-detail-title">${episode.title}</h2>
                        ${metadataHtml}
                    </div>
                </div>
                <p class="episode-detail-description">${description}</p>
                ${audioHtml}
                ${linksHtml}
            </div>
        `;

        // Set up play button
        if (playButton && episode.enclosure) {
            playButton.style.display = 'inline-flex';
            playButton.onclick = () => {
                const audioPlayer = document.getElementById('episode-detail-audio-player');
                if (audioPlayer) {
                    if (audioPlayer.paused) {
                        audioPlayer.play();
                        playButton.textContent = 'Pause Episode';
                    } else {
                        audioPlayer.pause();
                        playButton.textContent = 'Play Episode';
                    }
                }
            };
        } else if (playButton) {
            playButton.style.display = 'none';
        }

        modal.classList.remove('hidden');
        
        // Focus management for accessibility
        const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }

        // Trap focus within modal
        this.trapFocusInModal(modal);
    },

    /**
     * Trap focus within modal for accessibility
     * @param {Element} modal - Modal element
     */
    trapFocusInModal(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
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

        modal.addEventListener('keydown', handleTabKey);
        
        // Store the handler for cleanup
        modal._focusTrapHandler = handleTabKey;
    },

    /**
     * Bind custom audio control events
     */
    bindCustomAudioControls() {
        const playButtons = document.querySelectorAll('.custom-play-button');
        playButtons.forEach(button => {
            // Remove any existing listeners to prevent duplicates
            button.removeEventListener('click', this.toggleAudioPlayback);
            
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent episode card click
                console.log('Play button clicked, current state:', button.classList.contains('playing'));
                this.toggleAudioPlayback(button);
            });
        });

        // Bind progress bar events
        this.bindProgressControls();
        
        // Bind volume controls
        this.bindVolumeControls();
        
        // Bind keyboard shortcuts
        this.bindKeyboardShortcuts();
    },

    /**
     * Bind progress bar controls
     */
    bindProgressControls() {
        const progressBars = document.querySelectorAll('.progress-bar');
        progressBars.forEach(progressBar => {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                
                const audio = progressBar.closest('.audio-player-wrapper').querySelector('.hidden-audio');
                if (audio && audio.duration) {
                    audio.currentTime = audio.duration * percentage;
                    this.updateProgressDisplay(progressBar, audio);
                }
            });
        });
    },

    /**
     * Bind volume controls
     */
    bindVolumeControls() {
        const volumeSliders = document.querySelectorAll('.volume-slider');
        volumeSliders.forEach(volumeSlider => {
            volumeSlider.addEventListener('click', (e) => {
                const rect = volumeSlider.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                
                const audio = volumeSlider.closest('.audio-player-wrapper').querySelector('.hidden-audio');
                if (audio) {
                    audio.volume = percentage;
                    this.updateVolumeDisplay(volumeSlider, percentage);
                }
            });
        });
    },

    /**
     * Bind keyboard shortcuts
     */
    bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.toggleGlobalPlayback();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.seekAudio(-10);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.seekAudio(10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustVolume(0.1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustVolume(-0.1);
                    break;
            }
        });
    },

    /**
     * Toggle audio playback
     * @param {Element} button - Play button element
     */
    toggleAudioPlayback(button) {
        const audioSrc = button.dataset.audioSrc;
        const audioType = button.dataset.audioType;
        
        // Create or find audio element for this button
        let audio = button.parentElement.querySelector('.hidden-audio');
        if (!audio) {
            audio = document.createElement('audio');
            audio.className = 'hidden-audio';
            audio.preload = 'none';
            const source = document.createElement('source');
            source.src = audioSrc;
            source.type = audioType;
            audio.appendChild(source);
            button.parentElement.appendChild(audio);
        }

        // Store audio reference on button for easier access
        button._audioElement = audio;
        
        // Check if this audio is currently playing
        const isCurrentlyPlaying = !audio.paused && audio.currentTime > 0;
        
        console.log('Audio state - paused:', audio.paused, 'currentTime:', audio.currentTime, 'isCurrentlyPlaying:', isCurrentlyPlaying);
        
        if (isCurrentlyPlaying) {
            // Pause this audio
            console.log('Pausing audio');
            audio.pause();
            button.classList.remove('playing');
            const playIcon = button.querySelector('.play-icon');
            if (playIcon) {
                playIcon.style.display = 'block';
            }
        } else {
            // Stop any other currently playing audio
            const allAudios = document.querySelectorAll('audio');
            allAudios.forEach(otherAudio => {
                if (otherAudio !== audio && !otherAudio.paused) {
                    otherAudio.pause();
                    otherAudio.currentTime = 0;
                }
            });
            
            // Reset all other play buttons
            const allPlayButtons = document.querySelectorAll('.custom-play-button');
            allPlayButtons.forEach(btn => {
                if (btn !== button) {
                    btn.classList.remove('playing');
                    const playIcon = btn.querySelector('.play-icon');
                    if (playIcon) {
                        playIcon.style.display = 'block';
                    }
                }
            });

            // Play this audio
            console.log('Playing audio');
            audio.play().then(() => {
                console.log('Audio started playing successfully');
                button.classList.add('playing');
                const playIcon = button.querySelector('.play-icon');
                if (playIcon) {
                    playIcon.style.display = 'none';
                }
                
                // Show floating player
                this.showFloatingPlayer(button, audio);
            }).catch(error => {
                console.error('Error playing audio:', error);
                Utils.showNotification('Error playing audio. Please try again.', 'error');
            });
        }

        // Handle audio end - only add listener once
        if (!audio.hasAttribute('data-listener-added')) {
            audio.addEventListener('ended', () => {
                button.classList.remove('playing');
                const playIcon = button.querySelector('.play-icon');
                if (playIcon) {
                    playIcon.style.display = 'block';
                }
            });

            // Add time update listener
            audio.addEventListener('timeupdate', () => {
                this.updateAudioDisplay(audio);
            });

            // Add loadedmetadata listener
            audio.addEventListener('loadedmetadata', () => {
                this.updateAudioDisplay(audio);
            });

            audio.setAttribute('data-listener-added', 'true');
        }
    },

    /**
     * Update audio display (time and progress)
     * @param {HTMLAudioElement} audio - Audio element
     */
    updateAudioDisplay(audio) {
        const wrapper = audio.closest('.audio-player-wrapper');
        if (!wrapper) return;

        // Update time display
        const currentTimeEl = wrapper.querySelector('.current-time');
        const totalTimeEl = wrapper.querySelector('.total-time');
        
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(audio.currentTime);
        }
        if (totalTimeEl && audio.duration) {
            totalTimeEl.textContent = this.formatTime(audio.duration);
        }

        // Update progress bar
        const progressBar = wrapper.querySelector('.progress-bar');
        if (progressBar && audio.duration) {
            this.updateProgressDisplay(progressBar, audio);
        }

        // Update floating player if it's showing
        this.updateFloatingPlayerProgress(audio);
        this.updateFloatingPlayerTime(audio);
    },

    /**
     * Update progress bar display
     * @param {Element} progressBar - Progress bar element
     * @param {HTMLAudioElement} audio - Audio element
     */
    updateProgressDisplay(progressBar, audio) {
        const progressFill = progressBar.querySelector('.progress-fill');
        const progressHandle = progressBar.querySelector('.progress-handle');
        
        if (audio.duration) {
            const percentage = (audio.currentTime / audio.duration) * 100;
            if (progressFill) {
                progressFill.style.width = `${percentage}%`;
            }
            if (progressHandle) {
                progressHandle.style.left = `${percentage}%`;
            }
        }
    },

    /**
     * Update volume display
     * @param {Element} volumeSlider - Volume slider element
     * @param {number} volume - Volume level (0-1)
     */
    updateVolumeDisplay(volumeSlider, volume) {
        const volumeFill = volumeSlider.querySelector('.volume-fill');
        const volumeHandle = volumeSlider.querySelector('.volume-handle');
        const volumeIcon = volumeSlider.closest('.volume-control').querySelector('.volume-icon');
        
        const percentage = volume * 100;
        if (volumeFill) {
            volumeFill.style.width = `${percentage}%`;
        }
        if (volumeHandle) {
            volumeHandle.style.left = `${percentage}%`;
        }
        if (volumeIcon) {
            if (volume === 0) {
                volumeIcon.textContent = '🔇';
            } else if (volume < 0.5) {
                volumeIcon.textContent = '🔉';
            } else {
                volumeIcon.textContent = '🔊';
            }
        }
    },

    /**
     * Format time in MM:SS format
     * @param {number} seconds - Time in seconds
     * @returns {string} Formatted time string
     */
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    },

    /**
     * Toggle global playback (keyboard shortcut)
     */
    toggleGlobalPlayback() {
        const playingButton = document.querySelector('.custom-play-button.playing');
        if (playingButton) {
            this.toggleAudioPlayback(playingButton);
        } else {
            const firstButton = document.querySelector('.custom-play-button');
            if (firstButton) {
                this.toggleAudioPlayback(firstButton);
            }
        }
    },

    /**
     * Seek audio (keyboard shortcut)
     * @param {number} seconds - Seconds to seek (positive or negative)
     */
    seekAudio(seconds) {
        const playingAudio = document.querySelector('.custom-play-button.playing');
        if (playingAudio) {
            const audio = playingAudio._audioElement;
            if (audio) {
                audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
            }
        }
    },

    /**
     * Adjust volume (keyboard shortcut)
     * @param {number} delta - Volume change (-0.1 to 0.1)
     */
    adjustVolume(delta) {
        const playingAudio = document.querySelector('.custom-play-button.playing');
        if (playingAudio) {
            const audio = playingAudio._audioElement;
            if (audio) {
                audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
                const volumeSlider = playingAudio.closest('.audio-player-wrapper').querySelector('.volume-slider');
                if (volumeSlider) {
                    this.updateVolumeDisplay(volumeSlider, audio.volume);
                }
            }
        }
    },

    /**
     * Show floating player
     * @param {Element} button - Play button element
     * @param {HTMLAudioElement} audio - Audio element
     */
    showFloatingPlayer(button, audio) {
        const floatingPlayer = document.getElementById('floating-player');
        const floatingTitle = document.getElementById('floating-title');
        const floatingArtwork = document.getElementById('floating-artwork-img');
        const floatingCurrentTime = document.getElementById('floating-current-time');
        const floatingTotalTime = document.getElementById('floating-total-time');
        const floatingPlayBtn = document.getElementById('floating-play-btn');
        const floatingPrevBtn = document.getElementById('floating-prev-btn');
        const floatingNextBtn = document.getElementById('floating-next-btn');
        const floatingVolumeBtn = document.getElementById('floating-volume-btn');
        const floatingExpandBtn = document.getElementById('floating-expand-btn');
        const floatingClose = document.getElementById('floating-close');
        
        if (!floatingPlayer) return;

        // Get episode data
        const episodeCard = button.closest('.episode-card');
        const episodeTitle = episodeCard.querySelector('.episode-title').textContent;
        const episodeImage = episodeCard.querySelector('.episode-artwork img');
        
        // Update floating player content
        if (floatingTitle) {
            floatingTitle.textContent = episodeTitle;
        }
        
        if (floatingArtwork && episodeImage) {
            floatingArtwork.src = episodeImage.src || episodeImage.dataset.src;
            floatingArtwork.alt = episodeTitle;
        }
        
        // Store audio reference for global access
        floatingPlayer._currentAudio = audio;
        
        // Bind floating player events
        if (floatingPlayBtn) {
            floatingPlayBtn.onclick = () => {
                if (audio.paused) {
                    audio.play();
                    floatingPlayBtn.querySelector('.floating-play-icon').textContent = '⏸';
                    floatingPlayer.classList.add('playing');
                } else {
                    audio.pause();
                    floatingPlayBtn.querySelector('.floating-play-icon').textContent = '▶';
                    floatingPlayer.classList.remove('playing');
                }
            };
        }
        
        if (floatingPrevBtn) {
            floatingPrevBtn.onclick = () => {
                this.playPreviousEpisode();
            };
        }
        
        if (floatingNextBtn) {
            floatingNextBtn.onclick = () => {
                this.playNextEpisode();
            };
        }
        
        if (floatingVolumeBtn) {
            floatingVolumeBtn.onclick = () => {
                this.toggleFloatingVolume();
            };
        }
        
        if (floatingExpandBtn) {
            floatingExpandBtn.onclick = () => {
                this.expandFloatingPlayer();
            };
        }
        
        if (floatingClose) {
            floatingClose.onclick = () => {
                this.hideFloatingPlayer();
            };
        }
        
        // Bind progress bar click
        const floatingProgressBar = floatingPlayer.querySelector('.floating-progress-bar');
        if (floatingProgressBar) {
            floatingProgressBar.onclick = (e) => {
                const rect = floatingProgressBar.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = clickX / rect.width;
                
                if (audio.duration) {
                    audio.currentTime = audio.duration * percentage;
                    this.updateFloatingPlayerProgress(audio);
                }
            };
        }
        
        // Bind volume slider
        const floatingVolumeSlider = floatingPlayer.querySelector('.floating-volume-slider');
        if (floatingVolumeSlider) {
            floatingVolumeSlider.onclick = (e) => {
                const rect = floatingVolumeSlider.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                
                audio.volume = percentage;
                this.updateFloatingVolumeDisplay(floatingPlayer, percentage);
            };
        }
        
        // Show floating player
        floatingPlayer.classList.remove('hidden');
        setTimeout(() => {
            floatingPlayer.classList.add('show');
        }, 10);
        
        // Update floating player progress and time
        this.updateFloatingPlayerProgress(audio);
        this.updateFloatingPlayerTime(audio);
    },

    /**
     * Hide floating player
     */
    hideFloatingPlayer() {
        const floatingPlayer = document.getElementById('floating-player');
        if (floatingPlayer) {
            floatingPlayer.classList.remove('show');
            setTimeout(() => {
                floatingPlayer.classList.add('hidden');
            }, 400);
        }
    },

    /**
     * Update floating player progress
     * @param {HTMLAudioElement} audio - Audio element
     */
    updateFloatingPlayerProgress(audio) {
        const floatingProgressFill = document.querySelector('.floating-progress-fill');
        const floatingProgressHandle = document.querySelector('.floating-progress-handle');
        
        if (floatingProgressFill && audio.duration) {
            const percentage = (audio.currentTime / audio.duration) * 100;
            floatingProgressFill.style.width = `${percentage}%`;
            
            if (floatingProgressHandle) {
                floatingProgressHandle.style.left = `${percentage}%`;
            }
        }
    },

    /**
     * Update floating player time display
     * @param {HTMLAudioElement} audio - Audio element
     */
    updateFloatingPlayerTime(audio) {
        const floatingCurrentTime = document.getElementById('floating-current-time');
        const floatingTotalTime = document.getElementById('floating-total-time');
        
        if (floatingCurrentTime) {
            floatingCurrentTime.textContent = this.formatTime(audio.currentTime);
        }
        if (floatingTotalTime && audio.duration) {
            floatingTotalTime.textContent = this.formatTime(audio.duration);
        }
    },

    /**
     * Update floating volume display
     * @param {Element} floatingPlayer - Floating player element
     * @param {number} volume - Volume level (0-1)
     */
    updateFloatingVolumeDisplay(floatingPlayer, volume) {
        const volumeFill = floatingPlayer.querySelector('.floating-volume-fill');
        const volumeHandle = floatingPlayer.querySelector('.floating-volume-handle');
        const volumeIcon = floatingPlayer.querySelector('.floating-volume-icon');
        
        const percentage = volume * 100;
        if (volumeFill) {
            volumeFill.style.width = `${percentage}%`;
        }
        if (volumeHandle) {
            volumeHandle.style.left = `${percentage}%`;
        }
        if (volumeIcon) {
            if (volume === 0) {
                volumeIcon.textContent = '🔇';
            } else if (volume < 0.5) {
                volumeIcon.textContent = '🔉';
            } else {
                volumeIcon.textContent = '🔊';
            }
        }
    },

    /**
     * Play previous episode
     */
    playPreviousEpisode() {
        const currentCard = document.querySelector('.episode-card[data-episode-id]');
        if (currentCard) {
            const currentId = currentCard.dataset.episodeId;
            const allCards = document.querySelectorAll('.episode-card[data-episode-id]');
            const currentIndex = Array.from(allCards).findIndex(card => card.dataset.episodeId === currentId);
            
            if (currentIndex > 0) {
                const prevCard = allCards[currentIndex - 1];
                const prevButton = prevCard.querySelector('.custom-play-button');
                if (prevButton) {
                    this.toggleAudioPlayback(prevButton);
                }
            }
        }
    },

    /**
     * Play next episode
     */
    playNextEpisode() {
        const currentCard = document.querySelector('.episode-card[data-episode-id]');
        if (currentCard) {
            const currentId = currentCard.dataset.episodeId;
            const allCards = document.querySelectorAll('.episode-card[data-episode-id]');
            const currentIndex = Array.from(allCards).findIndex(card => card.dataset.episodeId === currentId);
            
            if (currentIndex < allCards.length - 1) {
                const nextCard = allCards[currentIndex + 1];
                const nextButton = nextCard.querySelector('.custom-play-button');
                if (nextButton) {
                    this.toggleAudioPlayback(nextButton);
                }
            }
        }
    },

    /**
     * Toggle floating volume
     */
    toggleFloatingVolume() {
        const floatingPlayer = document.getElementById('floating-player');
        const audio = floatingPlayer._currentAudio;
        
        if (audio) {
            if (audio.volume > 0) {
                audio.volume = 0;
            } else {
                audio.volume = 0.7; // Default volume
            }
            this.updateFloatingVolumeDisplay(floatingPlayer, audio.volume);
        }
    },

    /**
     * Expand floating player
     */
    expandFloatingPlayer() {
        const floatingPlayer = document.getElementById('floating-player');
        const audio = floatingPlayer._currentAudio;
        
        if (audio) {
            // Find the episode card and open its detail modal
            const currentCard = document.querySelector('.episode-card[data-episode-id]');
            if (currentCard) {
                this.openEpisodeDetail(currentCard);
            }
        }
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
                console.log('Files loaded from API:', response.data);
                AppState.files = response.data;
                AppState.currentPage = 1;
                AppState.hasMoreFiles = response.pagination ? response.pagination.hasMore : response.data.length >= Config.ui.itemsPerPage;
                
                // Test file accessibility
                response.data.forEach(async (file) => {
                    const isAccessible = await this.testFileAccess(file.url);
                    console.log(`File accessibility test for ${file.name}:`, isAccessible ? 'ACCESSIBLE' : 'NOT ACCESSIBLE');
                });
                
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

        // Remove overlay buttons for cleaner video experience
        const overlayHtml = '';

        return `
            <div class="file-item" data-file-type="${fileTypeInfo.type}">
                <div class="file-thumbnail">
                    ${thumbnailHtml}
                    ${overlayHtml}
                </div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
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
        
        // Debug logging
        console.log('Creating preview for file:', {
            name: file.name,
            url: file.url,
            type: fileTypeInfo.type,
            contentType: file.contentType
        });
        
        if (isImage) {
            return `
                <div class="file-preview-container image-preview" data-file-url="${file.url}" data-file-name="${file.name}">
                    <img src="${file.url}" 
                         alt="${file.name}" 
                         class="file-preview-image" 
                         loading="lazy"
                         onload="console.log('Image loaded successfully:', '${file.name}')"
                         onerror="console.error('Image failed to load:', '${file.name}', '${file.url}'); this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="file-preview-fallback" style="display: none;">
                        <div class="file-icon-large">${fileTypeInfo.icon}</div>
                        <div class="file-extension">${file.name.split('.').pop()?.toUpperCase()}</div>
                    </div>
                </div>
            `;
        }
        
        if (isVideo) {
            // Try direct URL first, fallback to proxy if CORS fails
            const directUrl = file.url;
            const proxyUrl = `${Config.api.baseUrl}/api/files/proxy?url=${encodeURIComponent(file.url)}`;
            
            return `
                <div class="file-preview-container video-preview" data-file-url="${file.url}" data-file-name="${file.name}">
                    <video class="file-preview-video" 
                           controls
                           preload="metadata" 
                           muted
                           playsinline
                           onloadedmetadata="console.log('Video metadata loaded:', '${file.name}'); this.currentTime = 1;"
                           onerror="console.error('Video failed to load:', '${file.name}', '${file.url}'); this.tryProxyFallback('${proxyUrl}');"
                           oncanplay="console.log('Video can play:', '${file.name}')">
                        <source src="${directUrl}" type="video/quicktime">
                        <source src="${directUrl}" type="video/mp4">
                        <source src="${directUrl}">
                        Your browser does not support the video tag.
                    </video>
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
            </div>
        `;
    },

    /**
     * Test if a file URL is accessible
     * @param {string} url - File URL to test
     * @returns {Promise<boolean>} Whether the file is accessible
     */
    async testFileAccess(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.error('File access test failed:', url, error);
            return false;
        }
    },

    /**
     * Try proxy fallback for CORS-blocked files
     * @param {string} proxyUrl - Proxy URL to try
     */
    tryProxyFallback(proxyUrl) {
        console.log('Trying proxy fallback:', proxyUrl);
        // This would need to be implemented on the backend
        // For now, just log the attempt
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

        // Image expand buttons
        const imagePreviews = document.querySelectorAll('.image-preview');
        imagePreviews.forEach(container => {
            const expandButton = container.querySelector('.expand-button');
            if (expandButton) {
                expandButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const fileUrl = container.dataset.fileUrl;
                    const fileName = container.dataset.fileName;
                    this.previewFile(fileName);
                });
            }
            
            // Click on image to expand
            const image = container.querySelector('.file-preview-image');
            if (image) {
                image.addEventListener('click', () => {
                    const fileName = container.dataset.fileName;
                    this.previewFile(fileName);
                });
            }
        });

        // Video play buttons and inline playback
        const videoPreviews = document.querySelectorAll('.video-preview');
        videoPreviews.forEach(container => {
            const video = container.querySelector('.file-preview-video');
            const playButton = container.querySelector('.play-button');
            const overlay = container.querySelector('.file-preview-overlay');
            
            if (video && playButton && overlay) {
                // Play button click
                playButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (video.paused) {
                        video.play();
                        playButton.innerHTML = '⏸️';
                        playButton.title = 'Pause Video';
                        overlay.style.opacity = '0.3'; // Dim overlay when playing
                    } else {
                        video.pause();
                        playButton.innerHTML = '▶️';
                        playButton.title = 'Play Video';
                        overlay.style.opacity = '1'; // Show overlay when paused
                    }
                });
                
                // Video click to play/pause (only if not clicking controls)
                video.addEventListener('click', (e) => {
                    // Don't interfere with native video controls
                    if (e.target === video && !e.target.controls) {
                        if (video.paused) {
                            video.play();
                            playButton.innerHTML = '⏸️';
                            playButton.title = 'Pause Video';
                            overlay.style.opacity = '0.3';
                        } else {
                            video.pause();
                            playButton.innerHTML = '▶️';
                            playButton.title = 'Play Video';
                            overlay.style.opacity = '1';
                        }
                    }
                });
                
                // Update play button when video ends
                video.addEventListener('ended', () => {
                    playButton.innerHTML = '▶️';
                    playButton.title = 'Play Video';
                    overlay.style.opacity = '1';
                });
                
                // Show duration when loaded
                video.addEventListener('loadedmetadata', () => {
                    const duration = video.duration;
                    const durationElement = container.querySelector('.video-duration');
                    if (durationElement && duration) {
                        const minutes = Math.floor(duration / 60);
                        const seconds = Math.floor(duration % 60);
                        durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                        durationElement.style.display = 'block';
                    }
                });
                
                // Handle play/pause events from native controls
                video.addEventListener('play', () => {
                    playButton.innerHTML = '⏸️';
                    playButton.title = 'Pause Video';
                    overlay.style.opacity = '0.3';
                });
                
                video.addEventListener('pause', () => {
                    playButton.innerHTML = '▶️';
                    playButton.title = 'Play Video';
                    overlay.style.opacity = '1';
                });
            }
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
    // Ensure modals are hidden on page load
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    });
    
    // Initialize core systems first
    Utils.initTheme();
    Utils.initAccessibility();
    Utils.initPerformanceOptimizations();
    
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
    
    // Set up auto-refresh if enabled (disabled temporarily to avoid rate limiting)
    if (Config.ui.autoRefresh && AppState.preferences.autoRefresh && false) {
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
