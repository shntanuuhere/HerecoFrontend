# Background Video Setup Guide

## Current Video Configuration

The login and signup pages are currently configured to use your Azure blob storage video:

**Video URL**: `https://shntanuuherebucket1.blob.core.windows.net/files/TVA.mov`

## How to Change the Video

If you want to use a different video, simply update the video source in both files:

1. **Edit `login.html`** - Update the video source URLs
2. **Edit `signup.html`** - Update the video source URLs

Replace the current URLs with your new video URL.

## Video Requirements

### **Recommended Specifications:**
- **Format**: MP4 (H.264) and/or WebM
- **Duration**: 10-30 seconds (will loop automatically)
- **Resolution**: 1920x1080 (Full HD) or higher
- **File Size**: Keep under 10MB for optimal loading
- **Content**: Subtle, non-distracting motion (abstract, nature, or minimal movement)

### **Video Content Suggestions:**
- Abstract geometric patterns
- Gentle particle effects
- Subtle color gradients
- Minimal nature scenes
- Soft lighting effects
- Abstract shapes or lines

## Performance Optimizations

The implementation includes several performance features:

### **Automatic Optimizations:**
- ✅ Video pauses when tab is not visible
- ✅ Fallback to gradient background if video fails to load
- ✅ Reduced motion support for accessibility
- ✅ Mobile-optimized overlay for better readability
- ✅ Hardware acceleration enabled

### **Browser Compatibility:**
- ✅ Modern browsers: Full video support
- ✅ Older browsers: Graceful fallback to gradient
- ✅ Mobile devices: Optimized performance
- ✅ Reduced motion preference: Static background

## Customization Options

### **Change Video Overlay Opacity:**
In `styles/main.css`, modify the `.video-overlay` background:
```css
.video-overlay {
    background: rgba(0, 0, 0, 0.6); /* Adjust the last value (0.6) */
}
```
- `0.3` = Lighter overlay (more video visible)
- `0.8` = Darker overlay (less video visible)

### **Change Video Path:**
In both `login.html` and `signup.html`, update the video source:
```html
<source src="your-custom-path/video.mp4" type="video/mp4">
```

### **Disable Video on Mobile:**
Add this CSS to disable video on mobile devices:
```css
@media (max-width: 768px) {
    .video-background {
        display: none;
    }
}
```

## Testing Your Video

1. **Load the pages** and check if video plays automatically
2. **Test on mobile** to ensure good performance
3. **Check console** for any loading errors
4. **Verify fallback** by temporarily renaming your video file

## Troubleshooting

### **Video Not Playing:**
- Check file path is correct
- Ensure video format is supported (MP4 H.264)
- Check browser console for errors
- Verify file permissions

### **Performance Issues:**
- Reduce video file size
- Lower video resolution
- Use shorter video duration
- Consider disabling on mobile

### **Autoplay Blocked:**
- Video is muted by default (required for autoplay)
- Some browsers may still block - fallback will activate
- User interaction will resume video if needed

## Example Video Sources

If you need free video backgrounds, consider:
- **Pexels Videos**: https://www.pexels.com/videos/
- **Pixabay Videos**: https://pixabay.com/videos/
- **Unsplash Videos**: https://unsplash.com/videos

Look for videos with:
- Subtle movement
- Dark or neutral colors
- Abstract or minimal content
- Short duration (10-30 seconds)
