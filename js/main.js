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
    hasMoreFiles: true
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
     * @param {string} type - Notification type (success, error, info)
     * @param {number} duration - Duration in milliseconds
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, duration);
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
        
        const thumbnailHtml = isImage ? `
            <img src="${file.url}" alt="${file.name}" class="gallery-image" loading="lazy">
        ` : isVideo ? `
            <video class="gallery-image" preload="metadata">
                <source src="${file.url}" type="${file.contentType}">
            </video>
        ` : `
            <div class="file-icon-large">${fileTypeInfo.icon}</div>
        `;

        const overlayHtml = `
            <div class="file-overlay">
                <button class="file-action-btn download-btn" onclick="GalleryModule.downloadFile('${file.name}')" title="Download">
                    ⬇️
                </button>
                <button class="file-action-btn" onclick="GalleryModule.viewFileDetails('${file.name}')" title="View Details">
                    ℹ️
                </button>
            </div>
        `;

        return `
            <div class="file-item">
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

// Application initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modules
    ProjectsModule.init();
    GalleryModule.init();
    
    // Set up auto-refresh if enabled
    if (Config.ui.autoRefresh) {
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
    
    // Handle escape key for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            Utils.closeModal();
        }
    });
    
    console.log('Podcast website initialized successfully!');
});
