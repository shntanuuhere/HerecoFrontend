/**
 * API Service for frontend-backend communication
 * Handles all HTTP requests to the backend API
 */

class ApiService {
    constructor() {
        this.baseUrl = Config.api.baseUrl;
        this.timeout = Config.api.timeout;
        this.retryAttempts = Config.api.retryAttempts;
        this.retryDelay = Config.api.retryDelay;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.corsConfig = Config.getCorsConfig();
        this.connectionTested = false;
        this.connectionValid = false;
    }

    /**
     * Make HTTP request with retry logic
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @param {number} attempt - Current attempt number
     * @returns {Promise<Object>} Response data
     */
    async makeRequest(url, options = {}, attempt = 1) {
        try {
            // Validate backend URL before making request
            const urlValidation = Config.validateBackendUrl();
            if (!urlValidation.valid) {
                throw new Error(urlValidation.message);
            }

            console.log(`Making request to: ${url} (attempt ${attempt})`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const method = (options.method || 'GET').toUpperCase();
            const headers = { ...options.headers };
            
            // Always set Accept header for API requests
            headers['Accept'] = 'application/json';
            
            // Set Content-Type for non-GET requests
            if (method !== 'GET' && method !== 'HEAD') {
                headers['Content-Type'] = headers['Content-Type'] || 'application/json';
            }
            // Remove X-Requested-With unless absolutely needed

            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
                headers,
                mode: 'cors',
                credentials: 'omit', // Don't send cookies for cross-origin requests
                cache: 'no-cache'
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Mark connection as valid on successful request
            if (!this.connectionValid) {
                this.connectionValid = true;
                this.connectionTested = true;
            }
            
            return data;

        } catch (error) {
            if (attempt < this.retryAttempts && this.shouldRetry(error)) {
                Config.debug(`Request failed, retrying... (attempt ${attempt + 1})`, error);
                await this.delay(this.retryDelay * attempt);
                return this.makeRequest(url, options, attempt + 1);
            }
            throw this.handleError(error);
        }
    }

    /**
     * Check if error should trigger a retry
     * @param {Error} error - Error object
     * @returns {boolean} Whether to retry
     */
    shouldRetry(error) {
        // Don't retry CORS errors as they won't resolve with retries
        if (this.isCorsError(error)) {
            return false;
        }
        
        return error.name === 'AbortError' || 
               error.message.includes('NetworkError') ||
               error.message.includes('Failed to fetch') ||
               error.message.includes('HTTP 5');
    }

    /**
     * Handle and format errors
     * @param {Error} error - Original error
     * @returns {Error} Formatted error
     */
    handleError(error) {
        // Mark connection as invalid on error
        this.connectionValid = false;
        this.connectionTested = true;

        if (error.name === 'AbortError') return new Error(Config.messages.api.timeoutError);

        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            return new Error(Config.messages.api.networkError);
        }

        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            return this.corsConfig.crossOrigin
                ? new Error(Config.messages.api.corsSetupError)
                : new Error(Config.messages.api.connectionError);
        }
        
        if (error.message.includes('HTTP 401')) {
            return new Error(Config.messages.api.unauthorizedError);
        }
        
        if (error.message.includes('HTTP 403')) {
            return new Error(Config.messages.api.forbiddenError);
        }
        
        if (error.message.includes('HTTP 404')) {
            return new Error(Config.messages.api.notFoundError);
        }
        
        if (error.message.includes('HTTP 429')) {
            return new Error(Config.messages.api.rateLimitError);
        }
        
        if (error.message.includes('HTTP 5')) {
            return new Error(Config.messages.api.serverError);
        }
        
        return error;
    }

    /**
     * Check if error is CORS-related
     * @param {Error} error - Error object
     * @returns {boolean} Whether error is CORS-related
     */
    isCorsError(error) {
        const corsErrorMessages = [
            'CORS',
            'Cross-Origin',
            'Access-Control-Allow-Origin',
            'has been blocked by CORS policy',
            'CORS policy',
            'preflight request',
            'OPTIONS request'
        ];
        
        const errorMessage = error.message.toLowerCase();
        return corsErrorMessages.some(msg => errorMessage.includes(msg.toLowerCase()));
    }

    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {Object|null} Cached data or null
     */
    getCachedData(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    /**
     * Set cached data
     * @param {string} key - Cache key
     * @param {Object} data - Data to cache
     */
    setCachedData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear local cache
     * @param {string} key - Optional specific key to clear
     */
    clearLocalCache(key = null) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }

    // Podcast API Methods

    /**
     * Get podcast episodes
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Episodes data
     */
    async getEpisodes(options = {}) {
        const cacheKey = `episodes_${JSON.stringify(options)}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            Config.debug('Returning cached episodes data');
            return cached;
        }

        const url = Config.getApiUrl('episodes', options);
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get podcast feed information
     * @returns {Promise<Object>} Feed info data
     */
    async getFeedInfo() {
        const cacheKey = 'feed_info';
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            Config.debug('Returning cached feed info');
            return cached;
        }

        const url = Config.getApiUrl('feedInfo');
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get complete podcast feed
     * @returns {Promise<Object>} Complete feed data
     */
    async getFeed() {
        const cacheKey = 'complete_feed';
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            Config.debug('Returning cached complete feed');
            return cached;
        }

        const url = Config.getApiUrl('feed');
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    // File Management API Methods

    /**
     * Get files list
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Files data
     */
    async getFiles(options = {}) {
        const cacheKey = `files_${JSON.stringify(options)}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            Config.debug('Returning cached files data');
            return cached;
        }

        const url = Config.getApiUrl('files', options);
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get specific file information
     * @param {string} filename - File name
     * @returns {Promise<Object>} File info data
     */
    async getFileInfo(filename) {
        if (!filename) {
            throw new Error('Filename is required');
        }

        const cacheKey = `file_info_${filename}`;
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            Config.debug(`Returning cached file info for: ${filename}`);
            return cached;
        }

        const url = Config.getApiUrl('fileInfo') + `/${encodeURIComponent(filename)}`;
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Get file download URL
     * @param {string} filename - File name
     * @param {number} expiryMinutes - URL expiry time in minutes
     * @returns {Promise<Object>} Download URL data
     */
    async getFileDownloadUrl(filename, expiryMinutes = 60) {
        if (!filename) {
            throw new Error('Filename is required');
        }

        const url = Config.getApiUrl('fileDownload') + `/${encodeURIComponent(filename)}/download`;
        const params = { expiry: expiryMinutes };
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = url + (url.includes('?') ? '&' : '?') + queryString;
        
        return await this.makeRequest(fullUrl);
    }

    // Storage API Methods

    /**
     * Get container information
     * @returns {Promise<Object>} Container info data
     */
    async getContainerInfo() {
        const cacheKey = 'container_info';
        const cached = this.getCachedData(cacheKey);
        if (cached) {
            Config.debug('Returning cached container info');
            return cached;
        }

        const url = Config.getApiUrl('containerInfo');
        const data = await this.makeRequest(url);
        
        this.setCachedData(cacheKey, data);
        return data;
    }

    /**
     * Test Azure Storage connection
     * @returns {Promise<Object>} Connection test result
     */
    async testConnection() {
        const url = Config.getApiUrl('testConnection');
        return await this.makeRequest(url);
    }

    // Cache Management API Methods

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache stats data
     */
    async getCacheStats() {
        const url = Config.getApiUrl('cacheStats');
        return await this.makeRequest(url);
    }

    /**
     * Clear cache
     * @param {string} service - Service to clear cache for
     * @param {string} filename - Optional filename for Azure service
     * @returns {Promise<Object>} Clear cache result
     */
    async clearCache(service = null, filename = null) {
        const url = Config.getApiUrl('clearCache');
        const body = {};
        
        if (service) {
            body.service = service;
        }
        
        if (filename) {
            body.filename = filename;
        }

        const data = await this.makeRequest(url, {
            method: 'POST',
            body: JSON.stringify(body)
        });

        // Clear local cache as well
        this.clearLocalCache();
        
        return data;
    }

    // Health Check API Method

    /**
     * Check API health
     * @returns {Promise<Object>} Health status
     */
    async checkHealth() {
        const url = Config.getApiUrl('health');
        return await this.makeRequest(url);
    }

    /**
     * Test backend connection and validate CORS configuration
     * @returns {Promise<Object>} Connection test result
     */
    async testBackendConnection() {
        try {
            const urlValidation = Config.validateBackendUrl();
            if (!urlValidation.valid) {
                return { success: false, error: urlValidation.message, type: 'configuration' };
            }

            // Start with a simple health check
            console.log('Testing backend connection...');
            const health = await this.checkHealth();
            console.log('Health check successful:', health);

            this.connectionValid = true;
            this.connectionTested = true;

            return {
                success: true,
                message: 'Backend connection successful',
                data: { health },
                corsEnabled: this.corsConfig.enabled,
                crossOrigin: this.corsConfig.crossOrigin
            };
        } catch (error) {
            this.connectionValid = false;
            this.connectionTested = true;
            console.error('Backend connection test failed:', error);
            const errorType = this.isCorsError(error) ? 'cors' : 'network';
            return { success: false, error: error.message, type: errorType, corsEnabled: this.corsConfig.enabled, crossOrigin: this.corsConfig.crossOrigin };
        }
    }

    /**
     * Get connection status
     * @returns {Object} Connection status information
     */
    getConnectionStatus() {
        return {
            tested: this.connectionTested,
            valid: this.connectionValid,
            corsConfig: this.corsConfig,
            backendUrl: (typeof window !== 'undefined' && window.env)
                ? window.env.get('BACKEND_API_URL', this.baseUrl)
                : this.baseUrl
        };
    }

    /**
     * Reset connection status (useful for testing different configurations)
     */
    resetConnectionStatus() {
        this.connectionTested = false;
        this.connectionValid = false;
        this.corsConfig = Config.getCorsConfig();
    }

    // Utility Methods

    /**
     * Search episodes
     * @param {string} query - Search query
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Search results
     */
    async searchEpisodes(query, options = {}) {
        const searchOptions = {
            ...options,
            search: query
        };
        
        return await this.getEpisodes(searchOptions);
    }

    /**
     * Search files
     * @param {string} query - Search query
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Search results
     */
    async searchFiles(query, options = {}) {
        const searchOptions = {
            ...options,
            search: query
        };
        
        return await this.getFiles(searchOptions);
    }

    /**
     * Filter files by type
     * @param {string} type - File type filter
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Filtered files
     */
    async filterFilesByType(type, options = {}) {
        const filterOptions = {
            ...options,
            type: type
        };
        
        return await this.getFiles(filterOptions);
    }

    /**
     * Sort files
     * @param {string} sortBy - Sort criteria
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Sorted files
     */
    async sortFiles(sortBy, options = {}) {
        const sortOptions = {
            ...options,
            sort: sortBy
        };
        
        return await this.getFiles(sortOptions);
    }

    /**
     * Get paginated files
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Paginated files
     */
    async getFilesPage(page = 1, limit = 12, options = {}) {
        const pageOptions = {
            ...options,
            page: page,
            limit: limit
        };
        
        return await this.getFiles(pageOptions);
    }
}

// Create singleton instance
const apiService = new ApiService();

// Expose globally in browser context
if (typeof window !== 'undefined') {
    window.apiService = apiService;
    window.ApiService = ApiService; // optional
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApiService;
}
