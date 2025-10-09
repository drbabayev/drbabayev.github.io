// Theme Switcher - Handles dark/light mode toggling
(function() {
    'use strict';


    // Initialize theme switcher
    function initializeThemeSwitcher() {
        // Initialize theme toggle functionality
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }

        // Apply saved theme or system preference first
        applyTheme(getSavedTheme());

        // Ensure Lucide icons are rendered - with retry
        const renderIcons = () => {
            try {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                    console.log('Lucide icons rendered');
                    
                    // Force update theme toggle button after icons render
                    setTimeout(() => {
                        updateThemeToggleButton(getSavedTheme() || getSystemTheme());
                    }, 100);
                }
            } catch (e) {
                console.error('Lucide render error:', e);
            }
        };
        
        // Try immediately
        renderIcons();
        
        // Retry after delay in case Lucide loads late
        setTimeout(renderIcons, 200);
        setTimeout(renderIcons, 500);

        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (!getSavedTheme()) {
                    applyTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    // Get saved theme preference
    function getSavedTheme() {
        return localStorage.getItem('theme');
    }

    // Save theme preference
    function saveTheme(theme) {
        localStorage.setItem('theme', theme);
    }

    // Apply theme to document
    function applyTheme(theme) {
        const html = document.documentElement;
        
        // Remove existing theme classes
        html.removeAttribute('data-theme');
        
        if (theme === 'dark') {
            html.setAttribute('data-theme', 'dark');
        } else {
            html.setAttribute('data-theme', 'light');
        }

        // Update theme toggle button state
        updateThemeToggleButton(theme);

        // Force hamburger menu icon to be white in dark mode
        forceHamburgerIconColor(theme);
    }

    // Update theme toggle button appearance
    function updateThemeToggleButton(theme) {
        const themeToggle = document.querySelector('.theme-toggle');
        if (!themeToggle) return;

        const sunIcon = themeToggle.querySelector('.sun-icon, .lucide-sun');
        const moonIcon = themeToggle.querySelector('.moon-icon, .lucide-moon');
        if (theme === 'dark') {
            if (sunIcon) sunIcon.style.display = 'inline-block';
            if (moonIcon) moonIcon.style.display = 'none';
        } else {
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'inline-block';
        }
    }

    // Force hamburger menu icon to be white in dark mode
    function forceHamburgerIconColor(theme) {
        const navToggle = document.querySelector('.nav-toggle');
        if (navToggle) {
            const svg = navToggle.querySelector('svg');
            const icon = navToggle.querySelector('.icon');
            
            if (theme === 'dark') {
                if (svg) {
                    svg.style.stroke = '#ffffff';
                    svg.style.color = '#ffffff';
                }
                if (icon) {
                    icon.style.stroke = '#ffffff';
                    icon.style.color = '#ffffff';
                }
                // Also set inline styles as fallback
                navToggle.style.color = '#ffffff';
            } else {
                if (svg) {
                    svg.style.stroke = '';
                    svg.style.color = '';
                }
                if (icon) {
                    icon.style.stroke = '';
                    icon.style.color = '';
                }
                navToggle.style.color = '';
            }
        }
    }

    // Toggle between light and dark themes
    function toggleTheme() {
        const currentTheme = getSavedTheme();
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        let newTheme;
        if (currentTheme === 'dark') {
            newTheme = 'light';
        } else if (currentTheme === 'light') {
            newTheme = 'dark';
        } else {
            // No saved preference, use opposite of system preference
            newTheme = systemPrefersDark ? 'light' : 'dark';
        }

        applyTheme(newTheme);
        saveTheme(newTheme);
    }

    // Get system theme preference
    function getSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    }

    // Expose functions globally
    window.initializeThemeSwitcher = initializeThemeSwitcher;
    window.toggleTheme = toggleTheme;
    window.getCurrentTheme = () => getSavedTheme() || getSystemTheme();

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeThemeSwitcher);
    } else {
        initializeThemeSwitcher();
    }

})();
