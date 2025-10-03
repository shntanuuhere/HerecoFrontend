/**
 * Simple Environment Configuration
 * Runtime environment variable loader for static hosting platforms
 * Replaces the complex build-time environment injection system
 */

(function() {
    'use strict';

    // Default configuration values
    const DEFAULT_CONFIG = {
        BACKEND_API_URL: 'https://hereco-backend.azurewebsites.net',
        NODE_ENV: 'production',
        DEBUG_MODE: 'false',
        DEV_TOOLS: 'false',
        API_TIMEOUT: '10000',
        API_RETRY_ATTEMPTS: '3',
        API_RETRY_DELAY: '1000',
        ENABLE_CACHING: 'true',
        CACHE_DURATION: '300000',
        ENABLE_LAZY_LOADING: 'true',
        CORS_DEBUG: 'false',
        CORS_ORIGINS: window.location.origin,
        AZURE_WEB_APP_NAME: 'your-app-name',
        AZURE_REGION: 'eastus',
        LOCAL_BACKEND_URL: 'http://localhost:3000',
        LOCAL_DEV_MODE: 'false',
        HEALTH_ENDPOINT: '/api/health',
        PODCAST_ENDPOINT: '/api/podcast/episodes',
        FILES_ENDPOINT: '/api/files',
        SHOW_DETAILED_ERRORS: 'false',
        ENABLE_ERROR_REPORTING: 'true'
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

            // Apply environment-specific overrides first
            this.applyEnvironmentOverrides();

            // Load from meta tags (if available) - this will override the defaults
            this.loadFromMetaTags();

            // Load from Vercel environment variables
            this.loadFromVercelEnv();

            // Load from URL parameters (for development/testing)
            this.loadFromUrlParams();

            // Load from localStorage (for development)
            this.loadFromLocalStorage();

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
                    // Remove 'env-' prefix and convert hyphens to underscores
                    let key = name;
                    if (key.startsWith('env-')) {
                        key = key.substring(4); // Remove 'env-' prefix
                    }
                    key = key.replace(/-/g, '_').toUpperCase();
                    this.config[key] = value;
                }
            });
        },

        /**
         * Load environment variables from Vercel build-time injection
         */
        loadFromVercelEnv: function() {
            // Check for Vercel environment variables
            if (typeof window !== 'undefined' && window.process && window.process.env) {
                Object.keys(window.process.env).forEach(key => {
                    const value = window.process.env[key];
                    if (value && !value.startsWith('%') && !value.endsWith('%')) {
                        this.config[key] = this.parseValue(value);
                    }
                });
            }

            // Check for build-time injected variables
            if (typeof window !== 'undefined' && window.__ENV__) {
                Object.keys(window.__ENV__).forEach(key => {
                    const value = window.__ENV__[key];
                    if (value && !value.startsWith('%') && !value.endsWith('%')) {
                        this.config[key] = this.parseValue(value);
                    }
                });
            }

            // Check for Vercel's environment variable injection
            // Vercel injects environment variables as global variables
            const vercelEnvVars = [
                'BACKEND_API_URL', 'NODE_ENV', 'DEBUG_MODE', 'API_TIMEOUT',
                'API_RETRY_ATTEMPTS', 'API_RETRY_DELAY', 'ENABLE_CACHING',
                'CACHE_DURATION', 'ENABLE_LAZY_LOADING', 'CORS_DEBUG',
                'CORS_ORIGINS', 'AZURE_WEB_APP_NAME', 'AZURE_REGION',
                'LOCAL_BACKEND_URL', 'LOCAL_DEV_MODE', 'SHOW_DETAILED_ERRORS',
                'ENABLE_ERROR_REPORTING', 'ENABLE_ANIMATIONS'
            ];

            vercelEnvVars.forEach(key => {
                if (typeof window !== 'undefined' && window[key] && 
                    typeof window[key] === 'string' && 
                    !window[key].startsWith('%') && !window[key].endsWith('%')) {
                    this.config[key] = this.parseValue(window[key]);
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
            // Check if we're in development mode without calling isDevelopment() to avoid recursion
            const isDev = this.config.NODE_ENV === 'development' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
            
            if (isDev) {
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
                this.config.DEBUG_MODE = 'true';
                this.config.DEV_TOOLS = 'true';
                // Don't automatically enable local dev mode - let meta tags control this
                // this.config.LOCAL_DEV_MODE = 'true';
                
                // Don't automatically switch to local backend - use what's configured
                // if (this.config.LOCAL_DEV_MODE === 'true' && this.config.LOCAL_BACKEND_URL) {
                //     this.config.BACKEND_API_URL = this.config.LOCAL_BACKEND_URL;
                // }
            }
            
            // Azure Static Web Apps detection
            else if (hostname.includes('azurestaticapps.net') || hostname.includes('azurewebsites.net')) {
                this.config.NODE_ENV = 'production';
                this.config.DEBUG_MODE = 'false';
                this.config.DEV_TOOLS = 'false';
                this.config.CORS_DEBUG = 'true'; // Enable CORS debugging for Azure deployments
            }
            
            // Staging environment detection
            else if (hostname.includes('staging') || hostname.includes('preview')) {
                this.config.NODE_ENV = 'staging';
                this.config.DEBUG_MODE = 'true';
                this.config.DEV_TOOLS = 'true';
                this.config.CORS_DEBUG = 'true';
            }
            
            // Production environment
            else {
                this.config.NODE_ENV = 'production';
                this.config.DEBUG_MODE = 'false';
                this.config.DEV_TOOLS = 'false';
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
            return this.get('DEBUG_MODE') === 'true';
        },

        /**
         * Check if development tools are enabled
         */
        areDevelopmentToolsEnabled: function() {
            return this.get('DEV_TOOLS') === 'true';
        },

        /**
         * Check if local development mode is enabled
         */
        isLocalDevMode: function() {
            return this.get('LOCAL_DEV_MODE') === 'true';
        },

        /**
         * Check if CORS debugging is enabled
         */
        isCorsDebugEnabled: function() {
            return this.get('CORS_DEBUG') === 'true';
        },

        /**
         * Get Azure Web App name
         */
        getAzureWebAppName: function() {
            return this.get('AZURE_WEB_APP_NAME', 'your-app-name');
        },

        /**
         * Get Azure region
         */
        getAzureRegion: function() {
            return this.get('AZURE_REGION', 'eastus');
        },

        /**
         * Get local backend URL
         */
        getLocalBackendUrl: function() {
            return this.get('LOCAL_BACKEND_URL', 'http://localhost:3000');
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
            let baseUrl = this.get('BACKEND_API_URL', 'https://hereco-backend.azurewebsites.net');
            
            // Only use local backend if explicitly enabled in meta tags
            if (this.get('LOCAL_DEV_MODE') === 'true' && this.get('LOCAL_BACKEND_URL')) {
                baseUrl = this.get('LOCAL_BACKEND_URL');
            }
            
            return baseUrl;
        },

        /**
         * Validate backend URL
         */
        validateBackendUrl: function() {
            const baseUrl = this.getApiBaseUrl();
            
            if (!baseUrl || baseUrl === 'https://hereco-backend.azurewebsites.net') {
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
        },

        /**
         * Get CORS configuration
         */
        getCorsConfig: function() {
            return {
                enabled: true,
                crossOrigin: true,
                origins: this.get('CORS_ORIGINS', window.location.origin),
                debug: this.isCorsDebugEnabled()
            };
        },

        /**
         * Get API timeout
         */
        getApiTimeout: function() {
            return parseInt(this.get('API_TIMEOUT', '10000'), 10);
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
            return this.get('ENABLE_CACHING') === 'true';
        },

        /**
         * Get cache duration
         */
        getCacheDuration: function() {
            return parseInt(this.get('CACHE_DURATION', '300000'), 10);
        },

        /**
         * Check if lazy loading is enabled
         */
        isLazyLoadingEnabled: function() {
            return this.get('ENABLE_LAZY_LOADING') === 'true';
        },

        /**
         * Check if detailed errors are shown
         */
        isDetailedErrorsEnabled: function() {
            return this.get('SHOW_DETAILED_ERRORS') === 'true';
        },

        /**
         * Check if error reporting is enabled
         */
        isErrorReportingEnabled: function() {
            return this.get('ENABLE_ERROR_REPORTING') === 'true';
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
            setLocalBackendUrl: function(url) {
                SimpleEnv.set('LOCAL_BACKEND_URL', url);
                console.log('Local backend URL updated to:', url);
            },
            toggleLocalDevMode: function(enabled) {
                SimpleEnv.set('LOCAL_DEV_MODE', enabled ? 'true' : 'false');
                console.log('Local development mode', enabled ? 'enabled' : 'disabled');
            },
            reloadConfig: function() {
                SimpleEnv.reset();
                console.log('Configuration reloaded');
            },
            showConfig: function() {
                console.log('Current configuration:', SimpleEnv.getAll());
            },
            setDebug: function(enabled) {
                SimpleEnv.set('DEBUG_MODE', enabled ? 'true' : 'false');
                console.log('Debug logging', enabled ? 'enabled' : 'disabled');
            },
            setCorsDebug: function(enabled) {
                SimpleEnv.set('CORS_DEBUG', enabled ? 'true' : 'false');
                console.log('CORS debugging', enabled ? 'enabled' : 'disabled');
            },
            validateBackendUrl: function() {
                const validation = SimpleEnv.validateBackendUrl();
                console.log('Backend URL validation:', validation);
                return validation;
            },
            getCorsConfig: function() {
                const corsConfig = SimpleEnv.getCorsConfig();
                console.log('CORS configuration:', corsConfig);
                return corsConfig;
            }
        };
        
        console.log('Development tools available. Use window.devTools to access them.');
    }

})();
