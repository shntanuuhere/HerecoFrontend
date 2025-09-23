/**
 * Configuration file for the podcast website frontend
 * Contains all configuration settings, constants, and environment-specific values
 */

// Wait for environment loader to be available
const getEnvValue = (key, defaultValue) => {
    if (typeof window !== 'undefined' && window.env && typeof window.env.get === 'function') {
        try {
            return window.env.get(key, defaultValue);
        } catch (error) {
            console.warn('Error getting environment value:', error);
            return defaultValue;
        }
    }
    
    // Fallback: try to get from meta tags directly
    if (typeof document !== 'undefined') {
        const metaName = `env-${key.toLowerCase().replace(/_/g, '-')}`;
        const meta = document.querySelector(`meta[name="${metaName}"]`);
        if (meta && meta.content) {
            return meta.content;
        }
    }
    
    return defaultValue;
};

// Helper function to join URLs and avoid double slashes
const joinUrl = (base, path) => {
    if (!base || !path) return base || path || '';
    
    // Remove trailing slashes from base and leading slashes from path
    const cleanBase = base.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    
    // Join with single slash
    return cleanBase + (cleanPath ? '/' + cleanPath : '');
};

const Config = {
    // Backend API Configuration
    api: {
        baseUrl: getEnvValue('BACKEND_API_URL', 'https://hereco-backend.azurewebsites.net'),
        endpoints: {
            // Podcast endpoints
            episodes: '/api/podcast/episodes',
            feedInfo: '/api/podcast/feed-info',
            feed: '/api/podcast/feed',
            
            // File management endpoints
            files: '/api/files',
            fileInfo: '/api/files',
            fileDownload: '/api/files',
            
            // Storage endpoints
            containerInfo: '/api/storage/container-info',
            testConnection: '/api/storage/test-connection',
            
            // Cache endpoints
            cacheStats: '/api/cache/stats',
            clearCache: '/api/cache/clear',
            
            // Health check
            health: '/api/health'
        },
        timeout: getEnvValue('API_TIMEOUT', 10000), // 10 seconds for cross-origin requests
        retryAttempts: getEnvValue('API_RETRY_ATTEMPTS', 3),
        retryDelay: getEnvValue('API_RETRY_DELAY', 1000), // 1 second
        corsEnabled: true,
        crossOrigin: true
    },

    // Site Configuration
    site: {
        title: 'Podcast Website',
        description: 'Podcast website with episodes and file gallery',
        version: '1.0.0',
        features: {
            podcastIntegration: true,
            fileUpload: false, // Files are manually uploaded to Azure
            galleryDisplay: true
        }
    },

    // RSS Configuration
    rss: {
        // Podcast Settings
        podcast: {
            maxEpisodes: 20,
            descriptionLength: 200,
            enableAudioPlayer: true,
            enableEpisodeArtwork: true,
            showEpisodeDuration: true,
            enableEpisodeLinks: true
        },
        
        // Cache Settings
        cache: {
            enabled: true,
            duration: 30 * 60 * 1000, // 30 minutes in milliseconds
            maxSize: 50 // Maximum number of cached feeds
        },
        
        // Parsing Options
        parsing: {
            strictMode: false,
            ignoreInvalidDates: true,
            sanitizeHtml: true,
            removeHtmlTags: true
        }
    },

    // Gallery Configuration
    gallery: {
        itemsPerPage: 12,
        maxFileSize: 50 * 1024 * 1024, // 50MB in bytes
        allowedFileTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/svg+xml',
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'application/pdf',
            'text/plain',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip',
            'application/x-rar-compressed'
        ],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.ogg', '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar'],
        maxFileNameLength: 255,
        sanitizeFileNames: true
    },

    // Constants
    constants: {
        debounceDelay: 300, // milliseconds
        animationDuration: 300, // milliseconds
        loadingTimeout: 10000, // 10 seconds
        refreshInterval: 5 * 60 * 1000 // 5 minutes
    },

    // Environment Detection
    environment: {
        isDevelopment: getEnvValue('NODE_ENV', 'development') === 'development',
        isProduction: getEnvValue('NODE_ENV', 'development') === 'production',
        isStaging: getEnvValue('NODE_ENV', 'development') === 'staging',
        debug: getEnvValue('DEBUG_MODE', false), // Set to true for development debugging
        localDevMode: getEnvValue('LOCAL_DEV_MODE', false),
        azureWebApp: getEnvValue('AZURE_WEB_APP_NAME', 'your-app-name')
    },

    // UI Configuration
    ui: {
        itemsPerPage: getEnvValue('ITEMS_PER_PAGE', 12),
        gridColumns: {
            mobile: 1,
            tablet: 2,
            desktop: 3
        },
        breakpoints: {
            mobile: 480,
            tablet: 768,
            desktop: 1024
        },
        skeletonCount: 6, // Number of skeleton items to show while loading
        autoRefresh: true, // Auto-refresh data periodically
        refreshInterval: 5 * 60 * 1000 // 5 minutes
    },

    // Error Messages
    messages: {
        podcast: {
            loadError: 'Failed to load podcast episodes. Please try again.',
            noEpisodes: 'No podcast episodes available.',
            networkError: 'Network error. Please check your connection and try again.',
            parseError: 'Failed to parse podcast feed. The feed may be malformed.',
            corsError: 'Unable to access podcast feed due to CORS restrictions.',
            emptyFeed: 'The podcast feed appears to be empty or has no episodes.',
            refreshError: 'Failed to refresh episodes. Please try again.',
            searchError: 'Failed to search episodes. Please try again.'
        },
        gallery: {
            loadError: 'Failed to load gallery items. Please try again.',
            empty: 'No files in gallery yet. Files are manually uploaded to Azure Blob Storage.',
            deleteError: 'Failed to delete file. Please try again.',
            deleteSuccess: 'File deleted successfully.',
            downloadError: 'Failed to download file. Please try again.',
            loadMoreError: 'Failed to load more files. Please try again.',
            filterError: 'Failed to filter files. Please try again.',
            sortError: 'Failed to sort files. Please try again.',
            searchError: 'Failed to search files. Please try again.'
        },
        api: {
            connectionError: 'Unable to connect to the server. Please check your connection.',
            timeoutError: 'Request timed out. Please try again.',
            serverError: 'Server error occurred. Please try again later.',
            unauthorizedError: 'Unauthorized access. Please refresh the page.',
            forbiddenError: 'Access forbidden. Please contact administrator.',
            notFoundError: 'Resource not found.',
            rateLimitError: 'Too many requests. Please wait a moment and try again.',
            corsError: 'Cross-origin request blocked. Please check CORS configuration on the backend server.',
            corsSetupError: 'CORS configuration issue. The backend server needs to allow requests from this domain.',
            networkError: 'Network error. Please check your internet connection and try again.',
            backendUnavailable: 'Backend server is unavailable. Please try again later or contact support.'
        },
        general: {
            loading: 'Loading...',
            refreshing: 'Refreshing...',
            success: 'Operation completed successfully!',
            error: 'An error occurred. Please try again.',
            retry: 'Retry',
            cancel: 'Cancel',
            close: 'Close',
            confirm: 'Confirm'
        }
    },

    // File Type Icons and Colors
    fileTypes: {
        image: {
            icon: '🖼️',
            color: '#10b981',
            extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
        },
        video: {
            icon: '🎥',
            color: '#f59e0b',
            extensions: ['.mp4', '.webm', '.mov', '.avi', '.mkv']
        },
        audio: {
            icon: '🎵',
            color: '#8b5cf6',
            extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac']
        },
        document: {
            icon: '📄',
            color: '#ef4444',
            extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf']
        },
        spreadsheet: {
            icon: '📊',
            color: '#06b6d4',
            extensions: ['.xls', '.xlsx', '.csv']
        },
        presentation: {
            icon: '📽️',
            color: '#f97316',
            extensions: ['.ppt', '.pptx']
        },
        archive: {
            icon: '📦',
            color: '#64748b',
            extensions: ['.zip', '.rar', '.7z', '.tar', '.gz']
        },
        default: {
            icon: '📁',
            color: '#6b7280'
        }
    },

    // Search Configuration
    search: {
        debounceDelay: 300,
        minQueryLength: 2,
        maxResults: 100,
        highlightMatches: true
    },

    // Performance Configuration
    performance: {
        enableLazyLoading: getEnvValue('ENABLE_LAZY_LOADING', true),
        enableImageOptimization: getEnvValue('ENABLE_IMAGE_OPTIMIZATION', true),
        enableCaching: getEnvValue('ENABLE_FRONTEND_CACHING', true),
        cacheSize: getEnvValue('MAX_CACHE_SIZE', 50),
        preloadNextPage: getEnvValue('ENABLE_PRELOADING', true)
    }
};

// Helper function to get API endpoint URL
Config.getApiUrl = function(endpoint, params = {}) {
    // Get current base URL (may have changed via environment)
    let baseUrl = getEnvValue('BACKEND_API_URL', this.api.baseUrl);
    
    // Handle local development mode - only if explicitly enabled
    if (getEnvValue('LOCAL_DEV_MODE') === 'true' && getEnvValue('LOCAL_BACKEND_URL')) {
        baseUrl = getEnvValue('LOCAL_BACKEND_URL');
    }
    
    // Validate backend URL
    if (!baseUrl || baseUrl === '' || baseUrl === window.location.origin) {
        console.warn('Backend API URL not configured. Please update BACKEND_API_URL in your environment configuration.');
    }
    
    const endpointPath = this.api.endpoints[endpoint];
    
    if (!endpointPath) {
        throw new Error(`Unknown API endpoint: ${endpoint}`);
    }
    
    // Use joinUrl helper to avoid double slashes
    let url = joinUrl(baseUrl, endpointPath);
    
    // Add query parameters if provided
    if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        url += (url.includes('?') ? '&' : '?') + queryString;
    }
    
    return url;
};

// Helper function to get file type information
Config.getFileTypeInfo = function(filename) {
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    for (const [type, info] of Object.entries(this.fileTypes)) {
        if (type === 'default') continue;
        
        if (info.extensions.includes(extension)) {
            return { type, ...info };
        }
    }
    
    return { type: 'default', ...this.fileTypes.default };
};

// Helper function to format file size
Config.formatFileSize = function(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to format date
Config.formatDate = function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Helper function to check if environment is development
Config.isDevelopment = function() {
    return this.environment.isDevelopment;
};

// Helper function to check if environment is production
Config.isProduction = function() {
    return this.environment.isProduction;
};

// Helper function to log debug messages
Config.debug = function(message, data = null) {
    if (getEnvValue('DEBUG_MODE', this.environment.debug)) {
        console.log(`[DEBUG] ${message}`, data);
    }
};

// Helper function to validate backend URL
Config.validateBackendUrl = function() {
    const baseUrl = getEnvValue('BACKEND_API_URL', this.api.baseUrl);
    
    if (!baseUrl || baseUrl === '' || baseUrl === window.location.origin) {
        return {
            valid: false,
            message: 'Backend API URL not configured. Please update BACKEND_API_URL in your environment configuration.'
        };
    }
    
    try {
        new URL(baseUrl);
        return { valid: true, message: 'Backend URL is valid' };
    } catch (error) {
        return {
            valid: false,
            message: 'Invalid backend URL format. Please check your BACKEND_API_URL configuration.'
        };
    }
};

// Helper function to get CORS configuration
Config.getCorsConfig = function() {
    return {
        enabled: this.api.corsEnabled,
        crossOrigin: this.api.crossOrigin,
        origins: getEnvValue('CORS_ORIGINS', window.location.origin),
        debug: getEnvValue('CORS_DEBUG', false)
    };
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Config;
}

// Ensure Config is available globally
if (typeof window !== 'undefined') {
    window.Config = Config;
}
