// Simple client-side routing for development
// This handles /c/ routes when using Python's simple HTTP server

(function() {
    'use strict';
    
    // Check if we're on a /c/ route
    const path = window.location.pathname;
    const chatMatch = path.match(/^\/c\/([a-z0-9]+)\/?$/);
    
    if (chatMatch) {
        // We're on a chat route, load the chatbot
        loadChatbotPage();
    }
    
    function loadChatbotPage() {
        // Create a new script element to load the chatbot
        const script = document.createElement('script');
        script.src = 'js/chatbot.js';
        script.onload = function() {
            console.log('Chatbot loaded for chat route');
        };
        document.head.appendChild(script);
        
        // Also load the auth script if not already loaded
        if (!document.querySelector('script[src="js/auth.js"]')) {
            const authScript = document.createElement('script');
            authScript.src = 'js/auth.js';
            document.head.appendChild(authScript);
        }
    }
})();
