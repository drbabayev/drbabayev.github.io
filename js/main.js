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

                    // If we are loading the header, re-run lucide
                    if (elementId === 'main-header') {
                        // We need to re-initialize icons after they are loaded
                        if (typeof lucide !== 'undefined') {
                            lucide.createIcons();
                        }
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

    // Load the header, and ONLY AFTER it is loaded, initialize the language switcher
    includeHTML('main-header', '/partials/header.html', () => {
        if (typeof initializeLangSwitcher === 'function') {
            initializeLangSwitcher();
        }

        // Initialize mobile nav toggle after header loads
        const nav = document.querySelector('nav');
        const toggleBtn = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');

        if (nav && toggleBtn && navLinks) {
            // Ensure icon is rendered at start
            try {
                if (toggleBtn && !toggleBtn.querySelector('svg') && typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                // Fallback: if no SVG is found after a short delay, add a text fallback
                setTimeout(() => {
                    if (toggleBtn && !toggleBtn.querySelector('svg')) {
                        console.debug('Lucide icon not loaded, using text fallback');
                        toggleBtn.innerHTML = '<span style="font-size: 18px; font-weight: bold;">☰</span>';
                    }
                }, 100);
            } catch (e) {
                console.debug('Lucide initial render skipped:', e);
            }

            // Toggle open/close
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = nav.classList.toggle('menu-open');
                toggleBtn.setAttribute('aria-expanded', String(isOpen));
                if (typeof lucide !== 'undefined') {
                    // Swap icon placeholder and re-render via lucide
                    const iconName = isOpen ? 'x' : 'menu';
                    toggleBtn.innerHTML = '<i data-lucide="' + iconName + '" class="icon"></i>';
                    try {
                        lucide.createIcons();
                    } catch (e) {
                        console.debug('Lucide re-render error:', e);
                        // Fallback to text icons
                        toggleBtn.innerHTML = '<span style="font-size: 18px; font-weight: bold;">' + (isOpen ? '✕' : '☰') + '</span>';
                    }
                } else {
                    // Fallback to text icons if Lucide is not available
                    toggleBtn.innerHTML = '<span style="font-size: 18px; font-weight: bold;">' + (isOpen ? '✕' : '☰') + '</span>';
                }
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