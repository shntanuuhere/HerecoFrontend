// Authentication State Management
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.authListeners = [];
        this.init();
    }

    init() {
        // Check if Firebase is available
        if (typeof window.auth !== 'undefined') {
            console.log('Firebase auth found, setting up listener');
            this.setupAuthListener();
        } else {
            console.log('Firebase auth not found, waiting for it to load');
            // Wait for Firebase to load
            window.addEventListener('firebase-ready', () => {
                console.log('Firebase ready event received');
                this.setupAuthListener();
            });
            
            // Also try again after a short delay
            setTimeout(() => {
                if (typeof window.auth !== 'undefined') {
                    console.log('Firebase auth found after delay, setting up listener');
                    this.setupAuthListener();
                }
            }, 1000);
        }
    }

    setupAuthListener() {
        // Listen for authentication state changes
        window.auth.onAuthStateChanged((user) => {
            console.log('Auth state changed:', user ? 'Logged in' : 'Logged out', user);
            this.currentUser = user;
            this.updateNavigation();
            this.notifyListeners(user);
        });
    }

    updateNavigation() {
        const isLoggedIn = !!this.currentUser;
        console.log('Updating navigation, isLoggedIn:', isLoggedIn);
        
        // Update all navigation menus
        this.updateNavLinks(isLoggedIn);
        this.updateUserProfile(isLoggedIn);
    }

    updateNavLinks(isLoggedIn) {
        // Find all navigation lists
        const navLists = document.querySelectorAll('.nav-list');
        console.log('Found nav lists:', navLists.length);
        
        navLists.forEach((navList, index) => {
            // Find all auth-links items (login and signup)
            const authItems = navList.querySelectorAll('.auth-links');
            console.log(`Nav list ${index}: found ${authItems.length} auth items`);
            
            // Hide/show auth items based on login status
            authItems.forEach((item, itemIndex) => {
                const displayValue = isLoggedIn ? 'none' : 'block';
                item.style.display = displayValue;
                console.log(`Auth item ${itemIndex}: setting display to ${displayValue}`);
            });
            
            // Also check for any existing user profile and remove it if logged out
            if (!isLoggedIn) {
                const existingProfile = navList.querySelector('.user-profile');
                if (existingProfile) {
                    existingProfile.remove();
                    console.log('Removed existing user profile');
                }
            }
        });
    }

    updateUserProfile(isLoggedIn) {
        // Find all navigation lists to add user profile
        const navLists = document.querySelectorAll('.nav-list');
        
        navLists.forEach(navList => {
            // Remove existing user profile if any
            const existingProfile = navList.querySelector('.user-profile');
            if (existingProfile) {
                existingProfile.remove();
            }
            
            if (isLoggedIn) {
                // Create user profile dropdown
                const userProfile = this.createUserProfile();
                navList.appendChild(userProfile);
            }
        });
    }

    createUserProfile() {
        const user = this.currentUser;
        const displayName = user.displayName || user.email?.split('@')[0] || 'User';
        const userPhoto = user.photoURL || 'https://via.placeholder.com/32x32/666/fff?text=' + displayName.charAt(0).toUpperCase();
        
        const profileItem = document.createElement('li');
        profileItem.className = 'nav-item user-profile';
        
        profileItem.innerHTML = `
            <div class="user-dropdown">
                <button class="user-button" aria-label="User menu" aria-expanded="false">
                    <img src="${userPhoto}" alt="${displayName}" class="user-avatar">
                    <span class="user-name">${displayName}</span>
                    <span class="dropdown-arrow">▼</span>
                </button>
                <div class="user-menu" style="display: none;">
                    <div class="user-info">
                        <img src="${userPhoto}" alt="${displayName}" class="user-avatar-large">
                        <div class="user-details">
                            <div class="user-name-large">${displayName}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                    <div class="user-menu-divider"></div>
                    <a href="#" class="user-menu-item" id="profile-link">
                        <span class="menu-icon">👤</span>
                        Profile
                    </a>
                    <a href="#" class="user-menu-item" id="settings-link">
                        <span class="menu-icon">⚙️</span>
                        Settings
                    </a>
                    <div class="user-menu-divider"></div>
                    <button class="user-menu-item logout-btn" id="logout-btn">
                        <span class="menu-icon">🚪</span>
                        Sign Out
                    </button>
                </div>
            </div>
        `;
        
        // Add event listeners
        this.setupUserProfileEvents(profileItem);
        
        return profileItem;
    }

    setupUserProfileEvents(profileItem) {
        const userButton = profileItem.querySelector('.user-button');
        const userMenu = profileItem.querySelector('.user-menu');
        const logoutBtn = profileItem.querySelector('.logout-btn');
        
        // Toggle dropdown
        userButton.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = userMenu.style.display !== 'none';
            
            // Close all other dropdowns
            document.querySelectorAll('.user-menu').forEach(menu => {
                if (menu !== userMenu) {
                    menu.style.display = 'none';
                }
            });
            
            userMenu.style.display = isOpen ? 'none' : 'block';
            userButton.setAttribute('aria-expanded', !isOpen);
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!profileItem.contains(e.target)) {
                userMenu.style.display = 'none';
                userButton.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Logout functionality
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await window.auth.signOut();
                // Redirect to home page after logout
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error signing out. Please try again.');
            }
        });
    }

    // Method to add listeners for auth state changes
    onAuthStateChanged(callback) {
        this.authListeners.push(callback);
    }

    notifyListeners(user) {
        this.authListeners.forEach(callback => {
            callback(user);
        });
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is logged in
    isLoggedIn() {
        return !!this.currentUser;
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Export for use in other files
window.authManager = authManager;

// Also add a manual check function for debugging
window.checkAuthState = () => {
    console.log('Manual auth check triggered');
    if (typeof window.auth !== 'undefined') {
        const user = window.auth.currentUser;
        console.log('Current user:', user);
        if (user) {
            authManager.currentUser = user;
            authManager.updateNavigation();
        }
    } else {
        console.log('Firebase auth not available');
    }
};

// Run check after page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, checking auth state');
    setTimeout(() => {
        window.checkAuthState();
    }, 2000);
});
