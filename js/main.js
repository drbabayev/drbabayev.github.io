document.addEventListener("DOMContentLoaded", function() {
    // Function to fetch and insert HTML content
    const includeHTML = (elementId, filePath, callback) => {
        fetch(filePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Could not load ${filePath}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                const targetElement = document.getElementById(elementId);
                if (targetElement) {
                    targetElement.innerHTML = data;

                    // If a callback function is provided, call it
                    if (callback) {
                        callback();
                    }

                    // If we are loading the header, ensure Lucide exists then re-render icons
                    if (elementId === 'main-header') {
                        ensureLucide(() => {
                            try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch (_) {}
                        });
                    }
                }
            })
            .catch(error => console.error(error));
    };

    // Create placeholder elements only if not already present in HTML
    if (!document.getElementById('main-header')) {
        const headerPlaceholder = document.createElement('div');
        headerPlaceholder.id = 'main-header';
        document.body.prepend(headerPlaceholder);
    }

    if (!document.getElementById('main-footer')) {
        const footerPlaceholder = document.createElement('div');
        footerPlaceholder.id = 'main-footer';
        document.body.appendChild(footerPlaceholder);
    }

    // Dynamically load Lucide if missing or wait for it to be ready
    function ensureLucide(onReady) {
        const checkLucide = () => {
            if (typeof lucide !== 'undefined') {
                console.log('Lucide object found:', lucide);
                if (onReady) onReady();
                return true;
            }
            return false;
        };
        
        // Check immediately
        if (checkLucide()) return;
        
        // Check if script tag exists
        const existingScript = document.querySelector('script[src*="lucide"]');
        if (existingScript) {
            console.log('Lucide script found, waiting for window.lucide...');
            // Wait for it with polling
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                console.log(`Attempt ${attempts}: window.lucide =`, window.lucide);
                if (checkLucide() || attempts > 30) {
                    clearInterval(interval);
                    if (attempts > 30 && typeof lucide === 'undefined') {
                        console.error('Lucide failed to load. Trying fallback...');
                        // Try loading different version
                        loadLucideFallback(onReady);
                    }
                }
            }, 200);
            return;
        }
        
        // Load Lucide dynamically if not found
        loadLucideFallback(onReady);
    }
    
    function loadLucideFallback(onReady) {
        console.log('Loading Lucide fallback...');
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/lucide@latest';
        s.onload = () => {
            console.log('Lucide fallback loaded, window.lucide =', window.lucide);
            setTimeout(() => {
                if (onReady) onReady();
            }, 100);
        };
        s.onerror = () => console.error('Failed to load Lucide fallback');
        document.head.appendChild(s);
    }

    // Load the header, and ONLY AFTER it is loaded, initialize the language switcher and theme switcher
    includeHTML('main-header', '/partials/header.html', () => {
        console.log('Header loaded, Lucide available:', typeof lucide !== 'undefined');
        
        // Force Lucide icon creation immediately after header loads
        ensureLucide(() => {
            console.log('Lucide loaded, calling createIcons');
            if (typeof lucide !== 'undefined') {
                try {
                    // Try different methods to create icons
                    if (lucide.createIcons) {
                        lucide.createIcons();
                    } else if (window.lucide && window.lucide.createIcons) {
                        window.lucide.createIcons();
                    } else {
                        console.error('lucide.createIcons not found. Available methods:', Object.keys(lucide));
                    }
                    console.log('Icons created successfully');
                } catch (e) {
                    console.error('Error creating icons:', e);
                }
            }
        });
        
        if (typeof initializeLangSwitcher === 'function') {
            initializeLangSwitcher();
        }
        
        if (typeof initializeThemeSwitcher === 'function') {
            initializeThemeSwitcher();
        }

        // Initialize mobile nav toggle after header loads
        const nav = document.querySelector('nav');
        const toggleBtn = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (nav && toggleBtn && navLinks) {
            // Ensure icon is rendered at start
            try {
                ensureLucide(() => {
                    if (toggleBtn && !toggleBtn.querySelector('svg') && typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                });
                // Fallback: if no SVG is found after a short delay, add a text fallback
                setTimeout(() => {
                    if (toggleBtn && !toggleBtn.querySelector('svg')) {
                        console.debug('Lucide icon not loaded, using text fallback');
                        toggleBtn.innerHTML = '<span style="font-size: 18px; font-weight: bold;">☰</span>';
                    }
                }, 150);
            } catch (e) {
                console.debug('Lucide initial render skipped:', e);
            }

            // Toggle open/close
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = nav.classList.toggle('menu-open');
                toggleBtn.setAttribute('aria-expanded', String(isOpen));
                ensureLucide(() => {
                    if (typeof lucide !== 'undefined') {
                        // Swap icon placeholder and re-render via lucide
                        const iconName = isOpen ? 'x' : 'menu';
                        toggleBtn.innerHTML = '<i data-lucide="' + iconName + '" class="icon"></i>';
                        try { lucide.createIcons(); } catch (e) {
                            console.debug('Lucide re-render error:', e);
                            toggleBtn.innerHTML = '<span style="font-size: 18px; font-weight: bold;">' + (isOpen ? '✕' : '☰') + '</span>';
                        }
                    }
                });
            });

            // Close when clicking a link (for in-page nav)
            navLinks.addEventListener('click', (event) => {
                const target = event.target;
                if (target && target.closest && target.closest('a')) {
                    nav.classList.remove('menu-open');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                }
            });

            // Close on outside click
            document.addEventListener('click', (event) => {
                if (!nav.contains(event.target)) {
                    nav.classList.remove('menu-open');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                }
            });

            // Close on resize above breakpoint
            window.addEventListener('resize', () => {
                if (window.innerWidth > 768) {
                    nav.classList.remove('menu-open');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                }
            });
            console.debug('Mobile nav toggle initialized');
        }
    });

    // Load the footer
    includeHTML('main-footer', '/partials/footer.html');
}); 