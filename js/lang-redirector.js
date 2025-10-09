// Language Redirector for Multi-Language Pages
// Handles language switching between translated pages

(function() {
    'use strict';

    // Get current article code and language from body attributes
    const body = document.body;
    const currentCode = body.dataset.articleCode || null;
    const currentLang = body.dataset.currentLang || getCurrentLangFromURL();

    // Initialize ASAP - before other scripts
    function initializeRedirector() {
        console.log('Lang-redirector initializing...', { currentCode, currentLang });
        if (currentCode) {
            // This is an article page
            console.log('Detected article page, setting up redirector');
            setupArticleLanguageSwitcher();
        } else {
            // This is a blog listing page
            console.log('Detected blog page, setting up blog redirector');
            setupBlogLanguageSwitcher();
        }
    }
    
    // Run immediately if DOM is already loaded, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeRedirector);
    } else {
        initializeRedirector();
    }

    function getCurrentLangFromURL() {
        const url = window.location.pathname;
        
        // Check for blog listing pages: /blog-en.html, /blog-tr.html, etc
        const blogMatch = url.match(/\/blog-(\w{2})\.html/);
        if (blogMatch) return blogMatch[1];
        
        // Check for article pages: /blog/articles/ART001-en.html or existing files
        const articleMatch = url.match(/\/blog\/articles\/[A-Z]+\d+-(\w{2})\.html/);
        if (articleMatch) return articleMatch[1];
        
        // Check for existing article files (they're all in English for now)
        const existingMatch = url.match(/\/blog\/articles\/(cytometry-analysis-tools|scrna-seq-analysis-guide|leaky-barriers-chronic-diseases|sample-post)\.html/);
        if (existingMatch) return 'en';
        
        // Default to English
        return 'en';
    }

    function setupArticleLanguageSwitcher() {
        console.log('Setting up article language switcher for:', currentCode, 'current lang:', currentLang);
        
        let handlerAttempts = 0;
        const maxAttempts = 50; // 5 seconds total
        
        // Wait for header to load and language options to appear
        const checkHeader = setInterval(function() {
            handlerAttempts++;
            const langOptions = document.querySelectorAll('.lang-option');
            
            if (langOptions.length > 0) {
                clearInterval(checkHeader);
                console.log(`✓ Found ${langOptions.length} language options after ${handlerAttempts} attempts, adding redirect handlers`);
                
                // Add click handlers to redirect to translated pages
                // Use CAPTURE phase to run BEFORE any other handlers
                langOptions.forEach((option, index) => {
                    console.log(`  Adding handler ${index+1} to:`, option.textContent.trim());
                    
                    // Remove any existing href to prevent default navigation
                    option.removeAttribute('href');
                    option.style.cursor = 'pointer';
                    
                    // Add click handler in CAPTURE phase (runs first!)
                    option.addEventListener('click', function(e) {
                        const targetLang = this.dataset.lang;
                        console.log(`🌍 REDIRECTOR: Language clicked: "${targetLang}" (current: "${currentLang}")`);
                        
                        // Stop everything
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        
                        if (targetLang === currentLang) {
                            console.log('  Already on this language, just closing dropdown');
                            const langSwitcher = document.querySelector('.lang-switcher');
                            if (langSwitcher) {
                                langSwitcher.classList.remove('open');
                            }
                            return false;
                        }
                        
                        // Build new URL
                        const newURL = `/blog/articles/${currentCode}-${targetLang}.html`;
                        console.log(`  ➜ Redirecting to: ${newURL}`);
                        
                        // Redirect immediately
                        window.location.href = newURL;
                        
                        return false;
                    }, true); // TRUE = capture phase (runs before bubble)
                });
                
                console.log('✓ Redirect handlers installed successfully');
            } else if (handlerAttempts >= maxAttempts) {
                clearInterval(checkHeader);
                console.error('✗ Failed to find language options after', maxAttempts, 'attempts');
            }
        }, 100);

        // Global capture fallback to guarantee redirect even if header re-renders
        const globalCaptureHandler = function(e) {
            const langLink = e.target && (e.target.closest ? e.target.closest('.lang-option') : null);
            if (!langLink) return;
            const targetLang = langLink.dataset && langLink.dataset.lang;
            if (!targetLang) return;
            // Only handle on article pages
            if (!currentCode) return;

            console.log(`🌍 GLOBAL CAPTURE: Language clicked: "${targetLang}" (current: "${currentLang}")`);
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (targetLang === currentLang) {
                const langSwitcher = document.querySelector('.lang-switcher');
                if (langSwitcher) langSwitcher.classList.remove('open');
                return false;
            }
            const newURL = `/blog/articles/${currentCode}-${targetLang}.html`;
            console.log(`  ➜ Redirecting (global) to: ${newURL}`);
            window.location.href = newURL;
            return false;
        };
        document.addEventListener('click', globalCaptureHandler, true);
    }

    function setupBlogLanguageSwitcher() {
        // On the unified /blog.html page we no longer redirect; let the blog handler rebuild in-place
        if (window.location && window.location.pathname === '/blog.html') {
            try { console.log('[LR] Blog page detected (/blog.html) - skipping redirect handlers'); } catch (_) {}
            return;
        }
        // Wait for header to load
        const checkHeader = setInterval(function() {
            const langOptions = document.querySelectorAll('.lang-option');
            if (langOptions.length > 0) {
                clearInterval(checkHeader);
                
                // Override language switcher to redirect to translated blog pages
                langOptions.forEach(option => {
                    option.addEventListener('click', function(e) {
                        e.preventDefault();
                        const targetLang = this.dataset.lang;
                        
                        if (targetLang === currentLang) {
                            return; // Already on this language
                        }
                        
                        // Redirect to translated blog page (legacy blog-xx.html pages only)
                        const newURL = `/blog-${targetLang}.html`;
                        window.location.href = newURL;
                    });
                });
            }
        }, 100);
        
        // Timeout after 5 seconds
        setTimeout(() => clearInterval(checkHeader), 5000);
    }

    // For main portfolio page (index.html), redirect to language-specific blog
    function setupMainPageBlogLinks() {
        const blogLinks = document.querySelectorAll('a[href="/blog.html"], a[href="blog.html"]');
        if (blogLinks.length > 0) {
            const currentLang = localStorage.getItem('preferredLanguage') || 'en';
            blogLinks.forEach(link => {
                link.href = `/blog-${currentLang}.html`;
            });
        }
    }

    // Expose for use in other scripts
    window.LanguageRedirector = {
        getCurrentLang: () => currentLang,
        getCurrentCode: () => currentCode,
        redirectToLang: function(lang) {
        if (currentCode) {
            // Use new language-specific file naming
            window.location.href = `/blog/articles/${currentCode}-${lang}.html`;
        } else {
            window.location.href = `/blog-${lang}.html`;
        }
        }
    };

    // Setup main page links if on index.html
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        document.addEventListener('DOMContentLoaded', setupMainPageBlogLinks);
    }

})();

