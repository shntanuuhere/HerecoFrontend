/**
 * Frontend Environment Configuration Loader
 * Loads environment variables from various sources and provides configuration
 */

class EnvironmentLoader {
  constructor() {
    this.env = {};
    this.defaults = {};
    this.loaded = false;
  }

  /**
   * Initialize environment configuration
   */
  init() {
    if (this.loaded) return this.env;

    // Set default values
    this.setDefaults();

    // Load from various sources in order of priority
    this.loadFromBuildTime();
    this.loadFromMetaTags();
    this.loadFromLocalStorage();
    this.loadFromRuntimeConfig();

    // Apply environment detection
    this.detectEnvironment();

    // Coerce boolean values for known flags
    this.coerceBooleanFlags();

    // Validate configuration
    this.validate();

    this.loaded = true;
    return this.env;
  }

  /**
   * Set default configuration values
   */
  setDefaults() {
    this.defaults = {
      // Backend API Configuration
      BACKEND_API_URL: window.location.origin,
      
      // Environment Detection
      NODE_ENV: 'development',
      
      // API Settings
      API_TIMEOUT: 30000,
      API_RETRY_ATTEMPTS: 3,
      API_RETRY_DELAY: 1000,
      
      // Feature Flags
      ENABLE_DEBUG_LOGGING: false,
      ENABLE_DEVELOPMENT_TOOLS: false,
      ENABLE_PERFORMANCE_MONITORING: false,
      ENABLE_ERROR_REPORTING: false,
      
      // CORS Configuration
      FRONTEND_ORIGINS: window.location.origin,
      
      // Cache Settings
      ENABLE_FRONTEND_CACHING: true,
      CACHE_DURATION: 300000,
      MAX_CACHE_SIZE: 50,
      
      // Performance Settings
      ENABLE_LAZY_LOADING: true,
      ENABLE_IMAGE_OPTIMIZATION: true,
      ENABLE_PRELOADING: true,
      ITEMS_PER_PAGE: 12,
      
      // Development Settings
      ENABLE_HOT_RELOAD: false,
      ENABLE_SOURCE_MAPS: true,
      ENABLE_DEVTOOLS: false,
      
      // Error Handling
      ENABLE_ERROR_BOUNDARIES: true,
      ENABLE_RETRY_MECHANISMS: true,
      MAX_RETRY_ATTEMPTS: 3,
      
      // Build Configuration
      BUILD_TARGET: 'development',
      ASSET_PREFIX: '',
      PUBLIC_URL: window.location.origin
    };
  }

  /**
   * Load environment variables from build-time injection
   * These are injected by the build script
   */
  loadFromBuildTime() {
    // Check for build-time injected variables
    if (window.__ENV__) {
      Object.assign(this.env, window.__ENV__);
    }
  }

  /**
   * Load environment variables from meta tags
   */
  loadFromMetaTags() {
    const metaTags = document.querySelectorAll('meta[name^="env-"]');
    metaTags.forEach(meta => {
      // Remove 'env-' prefix and convert hyphens to underscores
      let key = meta.name;
      if (key.startsWith('env-')) {
        key = key.substring(4); // Remove 'env-' prefix
      }
      key = key.replace(/-/g, '_').toUpperCase();
      const value = meta.content;
      if (value) {
        this.env[key] = this.parseValue(value);
      }
    });
  }

  /**
   * Load environment variables from localStorage (for development)
   */
  loadFromLocalStorage() {
    // Check if we're in development mode without calling isDevelopment() to avoid recursion
    const isDev = this.env.NODE_ENV === 'development' || 
                 window.location.hostname === 'localhost' || 
                 window.location.hostname === '127.0.0.1';
    
    if (isDev) {
      const stored = localStorage.getItem('__FRONTEND_ENV__');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          Object.assign(this.env, parsed);
        } catch (error) {
          console.warn('Failed to parse stored environment variables:', error);
        }
      }
    }
  }

  /**
   * Load runtime configuration from external sources
   */
  loadFromRuntimeConfig() {
    // Check for runtime configuration script
    const configScript = document.querySelector('script[type="application/json"][data-config]');
    if (configScript) {
      try {
        const config = JSON.parse(configScript.textContent);
        // Only assign non-empty values to avoid overriding defaults with empty strings
        Object.entries(config).forEach(([key, value]) => {
          if (value !== '' && value !== null && value !== undefined) {
            this.env[key] = value;
          }
        });
      } catch (error) {
        console.warn('Failed to parse runtime configuration:', error);
      }
    }
  }

  /**
   * Coerce boolean values for known flags
   */
  coerceBooleanFlags() {
    const booleanFlags = [
      'ENABLE_DEBUG_LOGGING',
      'ENABLE_DEVELOPMENT_TOOLS',
      'ENABLE_PERFORMANCE_MONITORING',
      'ENABLE_ERROR_REPORTING',
      'ENABLE_FRONTEND_CACHING',
      'ENABLE_LAZY_LOADING',
      'ENABLE_IMAGE_OPTIMIZATION',
      'ENABLE_PRELOADING',
      'ENABLE_HOT_RELOAD',
      'ENABLE_SOURCE_MAPS',
      'ENABLE_DEVTOOLS',
      'ENABLE_ERROR_BOUNDARIES',
      'ENABLE_RETRY_MECHANISMS'
    ];

    booleanFlags.forEach(flag => {
      if (this.env[flag] !== undefined) {
        this.env[flag] = this.parseValue(this.env[flag]);
      }
    });
  }

  /**
   * Detect environment based on various indicators
   */
  detectEnvironment() {
    // Only detect if NODE_ENV hasn't been explicitly set
    if (!this.env.NODE_ENV || this.env.NODE_ENV === '') {
      // Detect based on hostname
      const hostname = window.location.hostname;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        this.env.NODE_ENV = 'development';
      } else if (hostname.includes('staging') || hostname.includes('test')) {
        this.env.NODE_ENV = 'staging';
      } else {
        this.env.NODE_ENV = 'production';
      }
    }

    // Override with explicit setting if provided
    if (this.env.NODE_ENV && this.env.NODE_ENV !== 'development') {
      this.env.ENABLE_DEBUG_LOGGING = false;
      this.env.ENABLE_DEVELOPMENT_TOOLS = false;
      this.env.ENABLE_DEVTOOLS = false;
    }
  }

  /**
   * Validate required configuration
   */
  validate() {
    const required = ['BACKEND_API_URL'];
    const missing = required.filter(key => {
      const value = this.get(key);
      return !value || value === '';
    });
    
    if (missing.length > 0) {
      console.error('Missing required environment variables:', missing);
      // Use defaults for missing required variables
      missing.forEach(key => {
        this.env[key] = this.defaults[key];
      });
    }
  }

  /**
   * Get environment variable value
   * @param {string} key - Environment variable key
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Environment variable value
   */
  get(key, defaultValue = null) {
    if (!this.loaded) {
      this.init();
    }
    
    return this.env[key] !== undefined ? this.env[key] : (defaultValue !== null ? defaultValue : this.defaults[key]);
  }

  /**
   * Set environment variable value (for runtime configuration)
   * @param {string} key - Environment variable key
   * @param {*} value - Value to set
   */
  set(key, value) {
    this.env[key] = value;
    
    // Store in localStorage for development
    if (this.isDevelopment()) {
      const stored = JSON.parse(localStorage.getItem('__FRONTEND_ENV__') || '{}');
      stored[key] = value;
      localStorage.setItem('__FRONTEND_ENV__', JSON.stringify(stored));
    }
  }

  /**
   * Check if running in development mode
   * @returns {boolean} True if development mode
   */
  isDevelopment() {
    return this.get('NODE_ENV') === 'development';
  }

  /**
   * Check if running in production mode
   * @returns {boolean} True if production mode
   */
  isProduction() {
    return this.get('NODE_ENV') === 'production';
  }

  /**
   * Check if running in staging mode
   * @returns {boolean} True if staging mode
   */
  isStaging() {
    return this.get('NODE_ENV') === 'staging';
  }

  /**
   * Get all environment variables
   * @returns {Object} All environment variables
   */
  getAll() {
    if (!this.loaded) {
      this.init();
    }
    return { ...this.env };
  }

  /**
   * Parse string values to appropriate types
   * @param {string} value - String value to parse
   * @returns {*} Parsed value
   */
  parseValue(value) {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;
    
    // Try to parse as number
    if (!isNaN(value) && !isNaN(parseFloat(value))) {
      return parseFloat(value);
    }
    
    return value;
  }

  /**
   * Get backend API base URL
   * @returns {string} Backend API base URL
   */
  getBackendApiUrl() {
    return this.get('BACKEND_API_URL');
  }

  /**
   * Get API timeout setting
   * @returns {number} API timeout in milliseconds
   */
  getApiTimeout() {
    return this.get('API_TIMEOUT');
  }

  /**
   * Get API retry attempts
   * @returns {number} Number of retry attempts
   */
  getApiRetryAttempts() {
    return this.get('API_RETRY_ATTEMPTS');
  }

  /**
   * Get API retry delay
   * @returns {number} Retry delay in milliseconds
   */
  getApiRetryDelay() {
    return this.get('API_RETRY_DELAY');
  }

  /**
   * Check if debug logging is enabled
   * @returns {boolean} True if debug logging is enabled
   */
  isDebugLoggingEnabled() {
    return this.get('ENABLE_DEBUG_LOGGING');
  }

  /**
   * Check if development tools are enabled
   * @returns {boolean} True if development tools are enabled
   */
  areDevelopmentToolsEnabled() {
    return this.get('ENABLE_DEVELOPMENT_TOOLS');
  }

  /**
   * Get items per page setting
   * @returns {number} Number of items per page
   */
  getItemsPerPage() {
    return this.get('ITEMS_PER_PAGE');
  }

  /**
   * Get cache duration
   * @returns {number} Cache duration in milliseconds
   */
  getCacheDuration() {
    return this.get('CACHE_DURATION');
  }

  /**
   * Check if frontend caching is enabled
   * @returns {boolean} True if frontend caching is enabled
   */
  isFrontendCachingEnabled() {
    return this.get('ENABLE_FRONTEND_CACHING');
  }

  /**
   * Log current environment configuration (for debugging)
   */
  logConfiguration() {
    if (this.isDebugLoggingEnabled()) {
      console.log('Frontend Environment Configuration:', this.getAll());
    }
  }
}

// Create singleton instance
const envLoader = new EnvironmentLoader();

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    envLoader.init();
    envLoader.logConfiguration();
  });
} else {
  envLoader.init();
  envLoader.logConfiguration();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnvironmentLoader;
}

// Make available globally
window.EnvLoader = EnvironmentLoader;
if (!window.env) {
  window.env = envLoader;
}
