#!/usr/bin/env node

/**
 * Frontend Build Script
 * Handles environment variable injection and build process
 */

const fs = require('fs');
const path = require('path');

class FrontendBuilder {
  constructor() {
    this.projectRoot = path.dirname(__filename);
    this.buildDir = path.join(this.projectRoot, 'dist');
    this.envFile = path.join(this.projectRoot, '.env');
    this.envTemplate = path.join(this.projectRoot, 'env.template');
    this.env = {};
  }

  /**
   * Main build function
   */
  async build(target = 'development') {
    console.log(`🚀 Building frontend for ${target}...`);
    
    try {
      // Load environment variables
      this.loadEnvironment(target);
      
      // Validate environment
      this.validateEnvironment();
      
      // Create build directory
      this.createBuildDirectory();
      
      // Process files
      await this.processFiles();
      
      // Copy static assets
      this.copyStaticAssets();
      
      console.log('✅ Build completed successfully!');
      console.log(`📁 Build output: ${this.buildDir}`);
      
    } catch (error) {
      console.error('❌ Build failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Load environment variables
   */
  loadEnvironment(target) {
    console.log('📋 Loading environment variables...');
    
    // Load from .env file if it exists
    if (fs.existsSync(this.envFile)) {
      const envContent = fs.readFileSync(this.envFile, 'utf8');
      this.parseEnvFile(envContent);
    } else if (fs.existsSync(this.envTemplate)) {
      console.log('⚠️  .env file not found, using template defaults');
      const templateContent = fs.readFileSync(this.envTemplate, 'utf8');
      this.parseEnvFile(templateContent);
    } else {
      console.log('⚠️  No environment file found, using defaults');
    }
    
    // Override with target-specific settings
    this.applyTargetSettings(target);
    
    console.log('✅ Environment variables loaded');
  }

  /**
   * Parse .env file content
   */
  parseEnvFile(content) {
    const lines = content.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;
      
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        this.env[key] = value;
      }
    });
  }

  /**
   * Apply target-specific settings
   */
  applyTargetSettings(target) {
    this.env.BUILD_TARGET = target;
    
    switch (target) {
      case 'production':
        this.env.NODE_ENV = 'production';
        this.env.ENABLE_DEBUG_LOGGING = 'false';
        this.env.ENABLE_DEVELOPMENT_TOOLS = 'false';
        this.env.ENABLE_DEVTOOLS = 'false';
        break;
        
      case 'staging':
        this.env.NODE_ENV = 'staging';
        this.env.ENABLE_DEBUG_LOGGING = 'true';
        this.env.ENABLE_DEVELOPMENT_TOOLS = 'true';
        this.env.ENABLE_DEVTOOLS = 'false';
        break;
        
      case 'development':
      default:
        this.env.NODE_ENV = 'development';
        this.env.ENABLE_DEBUG_LOGGING = 'true';
        this.env.ENABLE_DEVELOPMENT_TOOLS = 'true';
        this.env.ENABLE_DEVTOOLS = 'true';
        break;
    }
  }

  /**
   * Validate environment variables
   */
  validateEnvironment() {
    console.log('🔍 Validating environment...');
    
    const required = ['BACKEND_API_URL'];
    const missing = required.filter(key => !this.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate URL format
    try {
      new URL(this.env.BACKEND_API_URL);
    } catch (error) {
      throw new Error(`Invalid BACKEND_API_URL format: ${this.env.BACKEND_API_URL}`);
    }
    
    console.log('✅ Environment validation passed');
  }

  /**
   * Create build directory
   */
  createBuildDirectory() {
    console.log('📁 Creating build directory...');
    
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true });
    }
    
    fs.mkdirSync(this.buildDir, { recursive: true });
    console.log('✅ Build directory created');
  }

  /**
   * Process files and inject environment variables
   */
  async processFiles() {
    console.log('⚙️  Processing files...');
    
    // Process HTML file
    await this.processHtmlFile();
    
    // Process JavaScript files
    await this.processJsFiles();
    
    console.log('✅ Files processed');
  }

  /**
   * Process HTML file
   */
  async processHtmlFile() {
    const htmlFile = path.join(this.projectRoot, 'index.html');
    const outputFile = path.join(this.buildDir, 'index.html');
    
    if (!fs.existsSync(htmlFile)) {
      throw new Error('index.html not found');
    }
    
    let content = fs.readFileSync(htmlFile, 'utf8');
    
    // Inject environment variables into meta tags
    content = this.injectMetaTags(content);
    
    // Inject environment variables into runtime config script
    content = this.injectRuntimeConfig(content);
    
    // Inject build-time environment variables
    content = this.injectBuildTimeEnv(content);
    
    fs.writeFileSync(outputFile, content);
    console.log('✅ HTML file processed');
  }

  /**
   * Inject environment variables into meta tags
   */
  injectMetaTags(content) {
    const metaMappings = {
      'env-backend-api-url': 'BACKEND_API_URL',
      'env-node-env': 'NODE_ENV',
      'env-enable-debug-logging': 'ENABLE_DEBUG_LOGGING',
      'env-enable-development-tools': 'ENABLE_DEVELOPMENT_TOOLS'
    };
    
    Object.entries(metaMappings).forEach(([metaName, envKey]) => {
      const regex = new RegExp(`<meta name="${metaName}" content="[^"]*">`, 'g');
      const replacement = `<meta name="${metaName}" content="${this.env[envKey] || ''}">`;
      content = content.replace(regex, replacement);
    });
    
    return content;
  }

  /**
   * Inject environment variables into runtime config script
   */
  injectRuntimeConfig(content) {
    const configData = {
      BACKEND_API_URL: this.env.BACKEND_API_URL || '',
      NODE_ENV: this.env.NODE_ENV || 'development',
      ENABLE_DEBUG_LOGGING: this.env.ENABLE_DEBUG_LOGGING || 'false',
      ENABLE_DEVELOPMENT_TOOLS: this.env.ENABLE_DEVELOPMENT_TOOLS || 'false'
    };
    
    const configJson = JSON.stringify(configData, null, 4);
    const regex = /<script type="application\/json" data-config>[\s\S]*?<\/script>/g;
    const replacement = `<script type="application/json" data-config>\n${configJson}\n    </script>`;
    
    content = content.replace(regex, replacement);
    return content;
  }

  /**
   * Inject build-time environment variables
   */
  injectBuildTimeEnv(content) {
    const envScript = `
    <script>
        // Build-time environment injection
        window.__ENV__ = ${JSON.stringify(this.env, null, 8)};
    </script>`;
    
    // Insert before the existing environment configuration script
    const insertPoint = content.indexOf('<!-- Environment Configuration Script -->');
    if (insertPoint !== -1) {
      content = content.slice(0, insertPoint) + envScript + '\n    ' + content.slice(insertPoint);
    }
    
    return content;
  }

  /**
   * Process JavaScript files
   */
  async processJsFiles() {
    const jsDir = path.join(this.projectRoot, 'js');
    const outputJsDir = path.join(this.buildDir, 'js');
    
    if (!fs.existsSync(jsDir)) {
      throw new Error('js directory not found');
    }
    
    fs.mkdirSync(outputJsDir, { recursive: true });
    
    const files = fs.readdirSync(jsDir);
    
    for (const file of files) {
      if (file.endsWith('.js')) {
        const inputFile = path.join(jsDir, file);
        const outputFile = path.join(outputJsDir, file);
        
        let content = fs.readFileSync(inputFile, 'utf8');
        
        // Basic minification for production
        if (this.env.BUILD_TARGET === 'production') {
          content = this.minifyJs(content);
        }
        
        fs.writeFileSync(outputFile, content);
      }
    }
    
    console.log('✅ JavaScript files processed');
  }

  /**
   * Basic JavaScript minification
   */
  minifyJs(content) {
    return content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
      .trim();
  }

  /**
   * Copy static assets
   */
  copyStaticAssets() {
    console.log('📋 Copying static assets...');
    
    // Copy CSS files
    const stylesDir = path.join(this.projectRoot, 'styles');
    if (fs.existsSync(stylesDir)) {
      const outputStylesDir = path.join(this.buildDir, 'styles');
      fs.mkdirSync(outputStylesDir, { recursive: true });
      
      const files = fs.readdirSync(stylesDir);
      files.forEach(file => {
        const inputFile = path.join(stylesDir, file);
        const outputFile = path.join(outputStylesDir, file);
        fs.copyFileSync(inputFile, outputFile);
      });
      
      console.log('✅ CSS files copied');
    }
    
    // Copy other static assets if they exist
    const staticDirs = ['images', 'assets', 'public'];
    staticDirs.forEach(dir => {
      const staticDir = path.join(this.projectRoot, dir);
      if (fs.existsSync(staticDir)) {
        const outputDir = path.join(this.buildDir, dir);
        this.copyDirectory(staticDir, outputDir);
        console.log(`✅ ${dir} directory copied`);
      }
    });
  }

  /**
   * Copy directory recursively
   */
  copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    
    const files = fs.readdirSync(src);
    files.forEach(file => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      
      if (fs.statSync(srcFile).isDirectory()) {
        this.copyDirectory(srcFile, destFile);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    });
  }

  /**
   * Development server
   */
  serve(port = 8080) {
    console.log(`🌐 Starting development server on port ${port}...`);
    
    const express = require('express');
    const app = express();
    
    // Serve static files from project root
    app.use(express.static(this.projectRoot));
    
    // Serve built files from dist if they exist
    if (fs.existsSync(this.buildDir)) {
      app.use('/dist', express.static(this.buildDir));
    }
    
    app.listen(port, () => {
      console.log(`✅ Development server running at http://localhost:${port}`);
      console.log('📁 Serving files from:', this.projectRoot);
    });
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'build';
  const target = args[1] || 'development';
  
  const builder = new FrontendBuilder();
  
  switch (command) {
    case 'build':
      builder.build(target);
      break;
      
    case 'serve':
      const port = parseInt(args[1]) || 8080;
      builder.serve(port);
      break;
      
    case 'dev':
      builder.build('development');
      builder.serve(8080);
      break;
      
    default:
      console.log('Usage: node build.js [command] [options]');
      console.log('Commands:');
      console.log('  build [target]  - Build for target (development|staging|production)');
      console.log('  serve [port]    - Start development server');
      console.log('  dev             - Build and serve for development');
      break;
  }
}

module.exports = FrontendBuilder;
