# Frontend Deployment Guide

This guide explains how to deploy the simplified frontend to various static hosting platforms without build processes or heavy dependencies.

## Overview

The frontend has been simplified to eliminate the 250MB Azure Static Web Apps size limit by:
- Removing all heavy npm dependencies (express, eslint, netlify-cli, vercel, gh-pages, etc.)
- Eliminating the complex 439-line build system
- Using direct file deployment with runtime environment configuration
- Implementing a lightweight environment loader that works with static hosting

## Deployment Options

### 1. Azure Static Web Apps (Recommended)

#### Setup
1. Create an Azure Static Web App in the Azure Portal
2. Get the deployment token from the Azure Static Web Apps resource
3. Add the token as a GitHub Secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`

#### Automatic Deployment
The GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`) automatically deploys when you push to the main/master branch:

```yaml
# Triggers on push to main/master branch
on:
  push:
    branches: [ main, master ]
    paths:
      - 'frontend/**'
```

#### Manual Deployment
You can also deploy manually using the Azure CLI:

```bash
# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Deploy from the frontend directory
cd frontend
swa deploy --deployment-token YOUR_DEPLOYMENT_TOKEN
```

#### Environment Configuration
Set environment variables in the Azure Static Web Apps configuration:

1. Go to Azure Portal → Static Web Apps → Your App → Configuration
2. Add application settings:
   - `BACKEND_API_URL`: Your backend API URL
   - `NODE_ENV`: `production`
   - `ENABLE_DEBUG_LOGGING`: `false`

### 2. Netlify

#### Setup
1. Connect your GitHub repository to Netlify
2. Set build settings:
   - **Build command**: Leave empty (no build process)
   - **Publish directory**: `frontend`
   - **Base directory**: Leave empty

#### Environment Variables
Add environment variables in Netlify dashboard:
- Go to Site settings → Environment variables
- Add variables like `BACKEND_API_URL`, `NODE_ENV`, etc.

#### Netlify Configuration File
Create `netlify.toml` in the project root:

```toml
[build]
  publish = "frontend"
  command = ""

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_ENV = "production"
  ENABLE_DEBUG_LOGGING = "false"
```

### 3. Vercel

#### Setup
1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: `frontend`
   - **Install Command**: Leave empty

#### Environment Variables
Add environment variables in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add variables for each environment (Production, Preview, Development)

#### Vercel Configuration File
Create `vercel.json` in the project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/frontend/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "ENABLE_DEBUG_LOGGING": "false"
  }
}
```

### 4. GitHub Pages

#### Setup
1. Enable GitHub Pages in repository settings
2. Set source to "Deploy from a branch"
3. Select the branch (usually `main` or `master`)
4. Set folder to `/frontend`

#### GitHub Actions for GitHub Pages
Create `.github/workflows/deploy-github-pages.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
    paths:
      - 'frontend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./frontend
```

## Environment Configuration

### Runtime Environment Loading

The frontend uses `js/simple-env.js` for runtime environment configuration:

1. **Meta Tags**: Environment variables can be set via HTML meta tags
2. **URL Parameters**: For testing, use `?env=KEY=VALUE&env=KEY2=VALUE2`
3. **Local Storage**: Development configuration stored in browser
4. **Automatic Detection**: Environment detected based on hostname

### Configuration Methods

#### 1. Meta Tags (Recommended for Production)
```html
<meta name="env-backend-api-url" content="https://your-api.com">
<meta name="env-node-env" content="production">
<meta name="env-enable-debug-logging" content="false">
```

#### 2. URL Parameters (Testing)
```
https://your-site.com?env=BACKEND_API_URL=https://api.example.com&env=NODE_ENV=staging
```

#### 3. Development Tools (Local Development)
```javascript
// Available in development mode
window.devTools.setBackendUrl('http://localhost:3000');
window.devTools.setDebug(true);
window.devTools.showConfig();
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BACKEND_API_URL` | Backend API base URL | `window.location.origin` | Yes |
| `NODE_ENV` | Environment (development/staging/production) | `production` | No |
| `ENABLE_DEBUG_LOGGING` | Enable debug console logging | `false` | No |
| `ENABLE_DEVELOPMENT_TOOLS` | Enable development tools | `false` | No |
| `API_TIMEOUT` | API request timeout (ms) | `30000` | No |
| `API_RETRY_ATTEMPTS` | Number of API retry attempts | `3` | No |
| `API_RETRY_DELAY` | Delay between retries (ms) | `1000` | No |

## Development Workflow

### Local Development
1. Serve files using any static file server:
   ```bash
   # Using Python
   cd frontend
   python -m http.server 8080
   
   # Using Node.js serve
   npx serve frontend -p 8080
   
   # Using PHP
   cd frontend
   php -S localhost:8080
   ```

2. Configure backend URL for development:
   ```javascript
   // In browser console
   window.devTools.setBackendUrl('http://localhost:3000');
   ```

### Testing Different Environments
```bash
# Test with staging backend
open "http://localhost:8080?env=BACKEND_API_URL=https://staging-api.example.com&env=NODE_ENV=staging"

# Test with production backend
open "http://localhost:8080?env=BACKEND_API_URL=https://api.example.com&env=NODE_ENV=production"
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors
- Ensure your backend has proper CORS configuration
- Check that `BACKEND_API_URL` is correctly set
- Verify the backend is accessible from the frontend domain

#### 2. Environment Variables Not Loading
- Check browser console for errors
- Verify meta tags are properly formatted
- Ensure `simple-env.js` is loaded before other scripts

#### 3. API Connection Issues
- Test backend URL directly in browser
- Check network tab in browser dev tools
- Verify API endpoints are correct

#### 4. Deployment Failures
- Check GitHub Actions logs for errors
- Verify deployment tokens are correct
- Ensure file paths are correct in workflow

### Debug Mode
Enable debug mode to see detailed logging:

```javascript
// In browser console
window.devTools.setDebug(true);
window.devTools.showConfig();
```

### Performance Optimization
- Enable lazy loading: `ENABLE_LAZY_LOADING=true`
- Enable image optimization: `ENABLE_IMAGE_OPTIMIZATION=true`
- Enable caching: `ENABLE_FRONTEND_CACHING=true`

## File Structure

```
frontend/
├── index.html              # Main HTML file
├── package.json            # Simplified package.json (no dependencies)
├── DEPLOYMENT.md          # This deployment guide
├── js/
│   ├── simple-env.js      # Runtime environment loader
│   ├── env.js             # Legacy environment loader
│   ├── config.js          # Application configuration
│   ├── apiService.js      # API service
│   └── main.js            # Main application logic
└── styles/
    └── main.css           # Application styles
```

## Migration from Build System

If migrating from the old build system:

1. **Remove build dependencies**: All heavy npm packages have been removed
2. **Update deployment**: Use direct file deployment instead of build artifacts
3. **Environment configuration**: Use runtime configuration instead of build-time injection
4. **Development workflow**: Use static file servers instead of npm scripts

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify environment configuration
3. Test with different hosting platforms
4. Review the troubleshooting section above
