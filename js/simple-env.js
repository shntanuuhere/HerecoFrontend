/**
 * Simple Environment Configuration
 * Runtime environment variable loader for static hosting platforms
 * Replaces the complex build-time environment injection system
 */

(function() {
    'use strict';

    // Default configuration values
    const DEFAULT_CONFIG = {
        BACKEND_API_URL: window.location.origin,
        NODE_ENV: 'production',
        ENABLE_DEBUG_LOGGING: 'false',
        ENABLE_DEVELOPMENT_TOOLS: 'false',
        API_TIMEOUT: '30000',
        API_RETRY_ATTEMPTS: '3',
        API_RETRY_DELAY: '1000',
        ENABLE_FRONTEND_CACHING: 'true',
        CACHE_DURATION: '300000',
        MAX_CACHE_SIZE: '50',
        ENABLE_LAZY_LOADING: 'true',
        ENABLE_IMAGE_OPTIMIZATION: 'true',
        ENABLE_PRELOADING: 'true',
        ITEMS_PER_PAGE: '12'
    };

    // Environment configuration object
    const SimpleEnv = {
        config: {},
        initialized: false,

        /**
         * Initialize environment configuration
         */
        init: function() {
            if (this.initialized) {
                return;
            }

            // Start with default values
            this.config = { ...DEFAULT_CONFIG };

            // Load from meta tags (if available)
            this.loadFromMetaTags();

            // Load from URL parameters (for development/testing)
            this.loadFromUrlParams();

            // Load from localStorage (for development)
            this.loadFromLocalStorage();

            // Apply environment-specific overrides
            this.applyEnvironmentOverrides();

            this.initialized = true;
            this.debug('Environment configuration initialized', this.config);
        },

        /**
         * Load configuration from meta tags
         */
        loadFromMetaTags: function() {
            const metaTags = document.querySelectorAll('meta[name^="env-"]');
            metaTags.forEach(meta => {
                const name = meta.getAttribute('name');
                const value = meta.getAttribute('content');
                if (name && value) {
                    const key = name.replace(/^env-/, '').replace(/-/g, '_').toUpperCase();
                    this.config[key] = value;
                }
            });
        },

        /**
         * Load configuration from URL parameters
         */
        loadFromUrlParams: function() {
            const urlParams = new URLSearchParams(window.location.search);
            const envParams = urlParams.getAll('env');
            
            envParams.forEach(param => {
                const [key, value] = param.split('=');
                if (key && value) {
                    this.config[key.toUpperCase()] = decodeURIComponent(value);
                }
            });
        },

        /**
         * Load configuration from localStorage (development only)
         */
        loadFromLocalStorage: function() {
            if (this.isDevelopment()) {
                try {
                    const storedConfig = localStorage.getItem('__DEV_CONFIG__');
                    if (storedConfig) {
                        const parsedConfig = JSON.parse(storedConfig);
                        this.config = { ...this.config, ...parsedConfig };
                    }
                } catch (error) {
                    console.warn('Failed to load configuration from localStorage:', error);
                }
            }
        },

        /**
         * Apply environment-specific overrides
         */
        applyEnvironmentOverrides: function() {
            const hostname = window.location.hostname;
            
            // Development environment detection
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost')) {
                this.config.NODE_ENV = 'development';
                this.config.ENABLE_DEBUG_LOGGING = 'true';
                this.config.ENABLE_DEVELOPMENT_TOOLS = 'true';
                
                // Use local backend for development
                if (this.config.BACKEND_API_URL === window.location.origin) {
                    this.config.BACKEND_API_URL = 'http://localhost:3000';
                }
            }
            
            // Staging environment detection
            else if (hostname.includes('staging') || hostname.includes('preview')) {
                this.config.NODE_ENV = 'staging';
                this.config.ENABLE_DEBUG_LOGGING = 'true';
                this.config.ENABLE_DEVELOPMENT_TOOLS = 'true';
            }
            
            // Production environment
            else {
                this.config.NODE_ENV = 'production';
                this.config.ENABLE_DEBUG_LOGGING = 'false';
                this.config.ENABLE_DEVELOPMENT_TOOLS = 'false';
            }
        },

        /**
         * Get a configuration value
         */
        get: function(key, defaultValue = null) {
            if (!this.initialized) {
                this.init();
            }
            
            const value = this.config[key.toUpperCase()];
            return value !== undefined ? value : defaultValue;
        },

        /**
         * Set a configuration value (development only)
         */
        set: function(key, value) {
            if (!this.isDevelopment()) {
                console.warn('Configuration can only be modified in development mode');
                return;
            }
            
            this.config[key.toUpperCase()] = value;
            
            // Persist to localStorage for development
            try {
                localStorage.setItem('__DEV_CONFIG__', JSON.stringify(this.config));
            } catch (error) {
                console.warn('Failed to save configuration to localStorage:', error);
            }
        },

        /**
         * Get all configuration values
         */
        getAll: function() {
            if (!this.initialized) {
                this.init();
            }
            return { ...this.config };
        },

        /**
         * Check if environment is development
         */
        isDevelopment: function() {
            return this.get('NODE_ENV') === 'development';
        },

        /**
         * Check if environment is production
         */
        isProduction: function() {
            return this.get('NODE_ENV') === 'production';
        },

        /**
         * Check if environment is staging
         */
        isStaging: function() {
            return this.get('NODE_ENV') === 'staging';
        },

        /**
         * Check if debug logging is enabled
         */
        isDebugEnabled: function() {
            return this.get('ENABLE_DEBUG_LOGGING') === 'true';
        },

        /**
         * Check if development tools are enabled
         */
        areDevelopmentToolsEnabled: function() {
            return this.get('ENABLE_DEVELOPMENT_TOOLS') === 'true';
        },

        /**
         * Debug logging function
         */
        debug: function(message, data = null) {
            if (this.isDebugEnabled()) {
                console.log(`[SimpleEnv] ${message}`, data);
            }
        },

        /**
         * Get API base URL
         */
        getApiBaseUrl: function() {
            return this.get('BACKEND_API_URL', window.location.origin);
        },

        /**
         * Get API timeout
         */
        getApiTimeout: function() {
            return parseInt(this.get('API_TIMEOUT', '30000'), 10);
        },

        /**
         * Get API retry attempts
         */
        getApiRetryAttempts: function() {
            return parseInt(this.get('API_RETRY_ATTEMPTS', '3'), 10);
        },

        /**
         * Get API retry delay
         */
        getApiRetryDelay: function() {
            return parseInt(this.get('API_RETRY_DELAY', '1000'), 10);
        },

        /**
         * Get items per page
         */
        getItemsPerPage: function() {
            return parseInt(this.get('ITEMS_PER_PAGE', '12'), 10);
        },

        /**
         * Check if caching is enabled
         */
        isCachingEnabled: function() {
            return this.get('ENABLE_FRONTEND_CACHING') === 'true';
        },

        /**
         * Get cache duration
         */
        getCacheDuration: function() {
            return parseInt(this.get('CACHE_DURATION', '300000'), 10);
        },

        /**
         * Get max cache size
         */
        getMaxCacheSize: function() {
            return parseInt(this.get('MAX_CACHE_SIZE', '50'), 10);
        },

        /**
         * Check if lazy loading is enabled
         */
        isLazyLoadingEnabled: function() {
            return this.get('ENABLE_LAZY_LOADING') === 'true';
        },

        /**
         * Check if image optimization is enabled
         */
        isImageOptimizationEnabled: function() {
            return this.get('ENABLE_IMAGE_OPTIMIZATION') === 'true';
        },

        /**
         * Check if preloading is enabled
         */
        isPreloadingEnabled: function() {
            return this.get('ENABLE_PRELOADING') === 'true';
        },

        /**
         * Reset configuration to defaults
         */
        reset: function() {
            this.config = { ...DEFAULT_CONFIG };
            this.initialized = false;
            
            if (this.isDevelopment()) {
                try {
                    localStorage.removeItem('__DEV_CONFIG__');
                } catch (error) {
                    console.warn('Failed to clear configuration from localStorage:', error);
                }
            }
            
            this.init();
        }
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            SimpleEnv.init();
        });
    } else {
        SimpleEnv.init();
    }

    // Expose to global scope
    window.env = SimpleEnv;

    // Development tools (only in development mode)
    if (SimpleEnv.isDevelopment() && SimpleEnv.areDevelopmentToolsEnabled()) {
        window.devTools = {
            env: SimpleEnv,
            setBackendUrl: function(url) {
                SimpleEnv.set('BACKEND_API_URL', url);
                console.log('Backend URL updated to:', url);
            },
            reloadConfig: function() {
                SimpleEnv.reset();
                console.log('Configuration reloaded');
            },
            showConfig: function() {
                console.log('Current configuration:', SimpleEnv.getAll());
            },
            setDebug: function(enabled) {
                SimpleEnv.set('ENABLE_DEBUG_LOGGING', enabled ? 'true' : 'false');
                console.log('Debug logging', enabled ? 'enabled' : 'disabled');
            }
        };
        
        console.log('Development tools available. Use window.devTools to access them.');
    }

})();
