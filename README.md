# Podcast Website Frontend

A modern, responsive frontend for the podcast website built with vanilla JavaScript. Features RSS feed integration, file gallery, and dynamic environment configuration.

## Features

- **Podcast Episodes**: Display episodes from RSS feeds with audio players
- **File Gallery**: Browse and download files from Azure Blob Storage
- **Responsive Design**: Mobile-first design that works on all devices
- **Environment Configuration**: Dynamic configuration for different deployment environments
- **Search & Filter**: Search episodes and filter files by type
- **Auto-refresh**: Automatic data refresh for real-time updates
- **Caching**: Intelligent caching for improved performance

## Technology Stack

- **Vanilla JavaScript**: No frameworks, pure JavaScript for maximum compatibility
- **CSS3**: Modern CSS with custom properties and responsive design
- **HTML5**: Semantic HTML with accessibility features
- **Environment Configuration**: Dynamic configuration system for different environments

## Project Structure

```
frontend/
├── js/                    # JavaScript modules
│   ├── env.js            # Environment configuration loader
│   ├── config.js         # Application configuration
│   ├── apiService.js     # API communication service
│   └── main.js           # Main application logic
├── styles/               # CSS stylesheets
│   └── main.css          # Main stylesheet
├── index.html            # Main HTML file
├── env.template          # Environment configuration template
├── build.js              # Build script for environment injection
├── package.json          # Node.js project configuration
└── README.md            # This file
```

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm (v8 or higher)
- Backend API server running

### 1. Environment Setup

1. Copy the environment template:
   ```bash
   npm run env:setup
   ```

2. Edit `.env` with your configuration:
   ```env
   # Backend API Configuration
   BACKEND_API_URL=http://localhost:3000
   
   # Environment Detection
   NODE_ENV=development
   
   # Feature Flags
   ENABLE_DEBUG_LOGGING=true
   ENABLE_DEVELOPMENT_TOOLS=true
   ```

### 2. Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:8080`

### 3. Build for Production

```bash
npm run build:prod
```

The built files will be in the `dist/` directory.

## Environment Configuration

The frontend uses a flexible environment configuration system that allows you to connect to different backend environments without code changes.

### Configuration Sources (in order of priority)

1. **Build-time injection** - Variables injected during build process
2. **Meta tags** - Configuration via HTML meta tags
3. **Runtime configuration** - JSON configuration in HTML
4. **LocalStorage** - Development overrides stored in browser
5. **Default values** - Fallback values when nothing else is available

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BACKEND_API_URL` | Backend API base URL | `window.location.origin` | Yes |
| `NODE_ENV` | Environment (development/staging/production) | `development` | No |
| `API_TIMEOUT` | API request timeout (ms) | `30000` | No |
| `API_RETRY_ATTEMPTS` | Number of retry attempts | `3` | No |
| `ENABLE_DEBUG_LOGGING` | Enable debug logging | `false` | No |
| `ENABLE_DEVELOPMENT_TOOLS` | Enable development tools | `false` | No |
| `ITEMS_PER_PAGE` | Number of items per page | `12` | No |

### Configuration Examples

#### Local Development
```env
BACKEND_API_URL=http://localhost:3000
NODE_ENV=development
ENABLE_DEBUG_LOGGING=true
ENABLE_DEVELOPMENT_TOOLS=true
```

#### Staging Environment
```env
BACKEND_API_URL=https://staging-api.yourdomain.com
NODE_ENV=staging
ENABLE_DEBUG_LOGGING=true
ENABLE_DEVELOPMENT_TOOLS=false
```

#### Production Environment
```env
BACKEND_API_URL=https://api.yourdomain.com
NODE_ENV=production
ENABLE_DEBUG_LOGGING=false
ENABLE_DEVELOPMENT_TOOLS=false
```

## Development

### Available Scripts

- `npm run dev` - Build and serve for development
- `npm run build` - Build for current environment
- `npm run build:dev` - Build for development
- `npm run build:staging` - Build for staging
- `npm run build:prod` - Build for production
- `npm run serve` - Start development server only
- `npm run clean` - Clean build directory
- `npm run preview` - Build and preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Development Tools

When running in development mode with `ENABLE_DEVELOPMENT_TOOLS=true`, you can use the following tools in the browser console:

```javascript
// Change backend URL at runtime
window.devTools.setBackendUrl('https://new-backend-url.com');

// Reload configuration
window.devTools.reloadConfig();

// Show current configuration
window.devTools.showConfig();
```

### Local Development with Different Backends

You can easily switch between different backend environments:

1. **Local Backend**: Set `BACKEND_API_URL=http://localhost:3000`
2. **Staging Backend**: Set `BACKEND_API_URL=https://staging-api.yourdomain.com`
3. **Production Backend**: Set `BACKEND_API_URL=https://api.yourdomain.com`

## Build Process

The build process handles:

1. **Environment Variable Injection**: Injects environment variables into HTML and JavaScript
2. **File Processing**: Processes HTML and JavaScript files
3. **Asset Optimization**: Basic minification for production builds
4. **Static Asset Copying**: Copies CSS and other static assets

### Build Targets

- **development**: Full debugging, development tools enabled
- **staging**: Some debugging, production-like settings
- **production**: Optimized, no debugging, minified

## Deployment

### Static Hosting (Recommended)

The frontend is designed to be deployed as static files to any hosting service.

#### Netlify

1. Build the project:
   ```bash
   npm run build:prod
   ```

2. Deploy to Netlify:
   ```bash
   npm run deploy:netlify
   ```

3. Set environment variables in Netlify dashboard:
   - `BACKEND_API_URL` - Your backend API URL
   - `NODE_ENV` - `production`

#### Vercel

1. Build the project:
   ```bash
   npm run build:prod
   ```

2. Deploy to Vercel:
   ```bash
   npm run deploy:vercel
   ```

3. Set environment variables in Vercel dashboard

#### GitHub Pages

1. Build the project:
   ```bash
   npm run build:prod
   ```

2. Deploy to GitHub Pages:
   ```bash
   npm run deploy:github
   ```

### Custom Hosting

1. Build the project:
   ```bash
   npm run build:prod
   ```

2. Upload the `dist/` directory to your web server

3. Configure your web server to serve the `index.html` file for all routes (for SPA routing)

### Environment Variables in Production

Set these environment variables in your hosting platform:

```env
BACKEND_API_URL=https://your-backend-api.com
NODE_ENV=production
ENABLE_DEBUG_LOGGING=false
ENABLE_DEVELOPMENT_TOOLS=false
```

## API Integration

The frontend communicates with the backend through a REST API. The API endpoints are:

### Podcast Endpoints
- `GET /api/podcast/episodes` - Get podcast episodes
- `GET /api/podcast/feed-info` - Get podcast feed metadata
- `GET /api/podcast/feed` - Get complete feed data

### File Management Endpoints
- `GET /api/files` - List files from Azure Blob Storage
- `GET /api/files/:filename` - Get specific file information
- `GET /api/files/:filename/download` - Generate download URL

### Utility Endpoints
- `GET /api/health` - Health check

## Troubleshooting

### Common Issues

1. **Frontend can't connect to backend**:
   - Check `BACKEND_API_URL` is correct
   - Verify backend is running and accessible
   - Check CORS settings on backend

2. **Environment variables not loading**:
   - Ensure `.env` file exists and is properly formatted
   - Check for typos in variable names
   - Verify build process completed successfully

3. **Build fails**:
   - Check Node.js version (requires v16+)
   - Ensure all dependencies are installed
   - Check for syntax errors in JavaScript files

4. **Files not appearing in gallery**:
   - Verify backend is connected to Azure Blob Storage
   - Check container permissions
   - Ensure files are uploaded to correct container

### Debug Mode

Enable debug mode by setting `ENABLE_DEBUG_LOGGING=true` in your environment configuration. This will:

- Log all API requests and responses
- Show environment configuration
- Display detailed error messages
- Enable development tools

### Browser Console

Check the browser console for:
- Environment configuration logs
- API request/response logs
- Error messages
- Development tool availability

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub
