# CORS Setup and Deployment Guide

This guide provides comprehensive instructions for setting up the frontend to connect to the Azure Web App backend, including CORS configuration and troubleshooting.

## Table of Contents

1. [Overview](#overview)
2. [Backend CORS Configuration](#backend-cors-configuration)
3. [Frontend Configuration](#frontend-configuration)
4. [Deployment Scenarios](#deployment-scenarios)
5. [Testing API Connections](#testing-api-connections)
6. [Troubleshooting](#troubleshooting)
7. [Environment Variables Reference](#environment-variables-reference)

## Overview

This application is designed to work with a frontend deployed separately from the backend. The backend runs on Azure Web Apps, while the frontend can be deployed to any static hosting platform (Azure Static Web Apps, Netlify, Vercel, etc.).

### Architecture

```
Frontend (Static Host) ←→ Backend (Azure Web App)
     ↓                           ↓
- Azure Static Web Apps    - Azure Web Apps
- Netlify                  - Node.js/Express
- Vercel                   - CORS enabled
- GitHub Pages            - API endpoints
```

## Backend CORS Configuration

### 1. Update Backend CORS Settings

In your backend `server.js` file, update the CORS configuration to allow your frontend domain:

```javascript
const cors = require('cors');

// Get allowed origins from environment variable
const allowedOrigins = process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8080'];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: false, // Set to true if you need to send cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
```

### 2. Set Environment Variables

In your Azure Web App configuration, add the following environment variables:

```bash
# CORS Configuration
CORS_ORIGINS=https://your-frontend-domain.com,https://your-staging-domain.com

# Optional: Enable CORS debugging
CORS_DEBUG=true
```

### 3. Common Frontend Domains

Update `CORS_ORIGINS` with your actual frontend domains:

```bash
# Azure Static Web Apps
CORS_ORIGINS=https://your-app.azurestaticapps.net

# Netlify
CORS_ORIGINS=https://your-app.netlify.app

# Vercel
CORS_ORIGINS=https://your-app.vercel.app

# Custom Domain
CORS_ORIGINS=https://yourdomain.com

# Multiple domains (comma-separated)
CORS_ORIGINS=https://yourdomain.com,https://staging.yourdomain.com,https://your-app.netlify.app
```

## Frontend Configuration

### 1. Environment Configuration

Copy the environment template and update it with your Azure Web App URL:

```bash
# Copy the template
cp frontend/env.template frontend/.env

# Edit the .env file
nano frontend/.env
```

Update the following key variables:

```bash
# Backend API URL - Update with your Azure Web App URL
BACKEND_API_URL=https://hereco-backend.azurewebsites.net

# CORS Origins - Update with your frontend domain
CORS_ORIGINS=https://your-frontend-domain.com

# Azure Web App name
AZURE_WEB_APP_NAME=your-app-name
```

### 2. Meta Tag Configuration

Alternatively, you can configure the frontend using meta tags in `index.html`:

```html
<meta name="env-backend-api-url" content="https://your-azure-web-app.azurewebsites.net">
<meta name="env-cors-origins" content="https://your-frontend-domain.com">
<meta name="env-azure-web-app-name" content="your-app-name">
```

### 3. URL Parameter Configuration (Development)

For testing different configurations, you can use URL parameters:

```
https://your-frontend-domain.com?env=backend_api_url=https://your-azure-web-app.azurewebsites.net
```

## Deployment Scenarios

### Azure Static Web Apps

1. **Configure Backend URL**:
   ```bash
   BACKEND_API_URL=https://hereco-backend.azurewebsites.net
   ```

2. **Update CORS Origins**:
   ```bash
   CORS_ORIGINS=https://your-app.azurestaticapps.net
   ```

3. **Deploy**:
   ```bash
   # Deploy to Azure Static Web Apps
   az staticwebapp deploy --source . --name your-app-name
   ```

### Netlify

1. **Create `netlify.toml`**:
   ```toml
   [build]
     publish = "frontend"
     command = "echo 'No build step required'"
   
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-XSS-Protection = "1; mode=block"
   ```

2. **Set Environment Variables** in Netlify dashboard:
   ```
   BACKEND_API_URL=https://hereco-backend.azurewebsites.net
   CORS_ORIGINS=https://your-app.netlify.app
   ```

### Vercel

1. **Create `vercel.json`**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "frontend/**",
         "use": "@vercel/static"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/frontend/$1"
       }
     ]
   }
   ```

2. **Set Environment Variables** in Vercel dashboard:
   ```
   BACKEND_API_URL=https://hereco-backend.azurewebsites.net
   CORS_ORIGINS=https://your-app.vercel.app
   NODE_ENV=production
   DEBUG_MODE=false
   CORS_DEBUG=false
   ```

3. **Alternative: Use Vercel CLI**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Set environment variables
   vercel env add BACKEND_API_URL
   # Enter: https://hereco-backend.azurewebsites.net
   
   vercel env add CORS_ORIGINS
   # Enter: https://your-app.vercel.app
   
   # Deploy
   vercel --prod
   ```

## Testing API Connections

### 1. Browser Developer Tools

Open your browser's developer tools and check the Network tab for:

- **Preflight Requests**: Look for OPTIONS requests to your backend
- **CORS Headers**: Check for `Access-Control-Allow-Origin` headers
- **Error Messages**: Look for CORS-related error messages

### 2. API Connection Test

The frontend includes an automatic API connection test that runs on page load. Check the browser console for connection status messages.

### 3. Manual Testing

You can test the API connection manually using the browser console:

```javascript
// Test backend connection
apiService.testBackendConnection()
  .then(result => console.log('Connection test result:', result))
  .catch(error => console.error('Connection test failed:', error));

// Check connection status
console.log('Connection status:', apiService.getConnectionStatus());

// Validate backend URL
console.log('Backend URL validation:', Config.validateBackendUrl());
```

### 4. Development Tools

In development mode, you can use the built-in development tools:

```javascript
// Show current configuration
window.devTools.showConfig();

// Test backend URL validation
window.devTools.validateBackendUrl();

// Get CORS configuration
window.devTools.getCorsConfig();

// Set different backend URL for testing
window.devTools.setBackendUrl('https://your-test-backend.azurewebsites.net');
```

## Troubleshooting

### Common CORS Issues

#### 1. "Access to fetch at '...' has been blocked by CORS policy"

**Cause**: The backend doesn't allow requests from your frontend domain.

**Solution**: 
- Update `CORS_ORIGINS` in your backend environment variables
- Ensure your frontend domain is included in the allowed origins
- Restart your Azure Web App after updating environment variables

#### 2. "Failed to fetch" Error

**Cause**: Network connectivity issue or backend server is down.

**Solution**:
- Check if your Azure Web App is running
- Verify the backend URL is correct
- Check Azure Web App logs for errors

#### 3. "Preflight request doesn't pass access control check"

**Cause**: The OPTIONS preflight request is being blocked.

**Solution**:
- Ensure your backend handles OPTIONS requests
- Check that `methods` includes 'OPTIONS' in CORS configuration
- Verify `allowedHeaders` includes required headers

#### 4. Backend URL Not Configured

**Cause**: The frontend is using the default placeholder URL.

**Solution**:
- Update `BACKEND_API_URL` in your environment configuration
- Ensure the URL is properly formatted (include https://)
- Check that the URL is accessible

### Debugging Steps

1. **Check Backend URL**:
   ```javascript
   console.log('Backend URL:', window.env.getApiBaseUrl());
   ```

2. **Validate Configuration**:
   ```javascript
   console.log('Configuration:', window.env.getAll());
   ```

3. **Test CORS Configuration**:
   ```javascript
   console.log('CORS Config:', window.env.getCorsConfig());
   ```

4. **Check Network Requests**:
   - Open browser developer tools
   - Go to Network tab
   - Reload the page
   - Look for failed requests to your backend

5. **Check Backend Logs**:
   - Go to Azure Portal
   - Navigate to your Web App
   - Check Application Insights or Log Stream
   - Look for CORS-related errors

### Environment-Specific Issues

#### Azure Static Web Apps
- Ensure your backend URL is accessible from the internet
- Check that your Azure Web App is not behind a firewall
- Verify that your custom domain (if used) is properly configured

#### Netlify
- Check that environment variables are set in the Netlify dashboard
- Ensure your build process doesn't override environment variables
- Verify that your domain is correctly configured

#### Vercel
- Check that environment variables are set in the Vercel dashboard
- Ensure your deployment configuration is correct
- Verify that your domain is properly configured

## Environment Variables Reference

### Frontend Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `BACKEND_API_URL` | Backend API base URL | `https://your-azure-web-app.azurewebsites.net` | `https://myapp.azurewebsites.net` |
| `NODE_ENV` | Environment mode | `production` | `development`, `staging`, `production` |
| `DEBUG_MODE` | Enable debug logging | `false` | `true`, `false` |
| `DEV_TOOLS` | Enable development tools | `false` | `true`, `false` |
| `API_TIMEOUT` | API request timeout (ms) | `10000` | `5000`, `15000` |
| `API_RETRY_ATTEMPTS` | Number of retry attempts | `3` | `1`, `5` |
| `API_RETRY_DELAY` | Delay between retries (ms) | `1000` | `500`, `2000` |
| `CORS_DEBUG` | Enable CORS debugging | `false` | `true`, `false` |
| `CORS_ORIGINS` | Allowed CORS origins | Current origin | `https://myapp.netlify.app` |
| `AZURE_WEB_APP_NAME` | Azure Web App name | `your-app-name` | `my-podcast-backend` |
| `AZURE_REGION` | Azure region | `eastus` | `westus2`, `europe-west` |
| `LOCAL_BACKEND_URL` | Local development backend URL | `http://localhost:3000` | `http://localhost:8080` |
| `LOCAL_DEV_MODE` | Enable local development mode | `false` | `true`, `false` |
| `ENABLE_CACHING` | Enable frontend caching | `true` | `true`, `false` |
| `CACHE_DURATION` | Cache duration (ms) | `300000` | `600000` |
| `ENABLE_LAZY_LOADING` | Enable lazy loading | `true` | `true`, `false` |
| `SHOW_DETAILED_ERRORS` | Show detailed error messages | `false` | `true`, `false` |
| `ENABLE_ERROR_REPORTING` | Enable error reporting | `true` | `true`, `false` |

### Backend Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CORS_ORIGINS` | Allowed frontend origins (comma-separated) | `https://myapp.netlify.app,https://myapp.vercel.app` |
| `CORS_DEBUG` | Enable CORS debugging | `true` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `production` |

## Additional Resources

- [MDN CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Azure Web Apps CORS Configuration](https://docs.microsoft.com/en-us/azure/app-service/app-service-web-tutorial-rest-api)
- [Express.js CORS Middleware](https://github.com/expressjs/cors)
- [Azure Static Web Apps Documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/)

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for error messages
2. Review the backend logs in Azure Portal
3. Test the API endpoints directly using tools like Postman
4. Verify your environment configuration matches your deployment setup

For additional help, refer to the application's main README.md file or create an issue in the project repository.
