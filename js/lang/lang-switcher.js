function initializeLangSwitcher() {
    const langSwitcher = document.querySelector('.lang-switcher');
    // If the switcher doesn't exist, do nothing.
    if (!langSwitcher) {
        console.log('Language switcher not found');
        return;
    }

    const langSwitcherButton = langSwitcher.querySelector('.lang-switcher-button');
    const currentLangSpan = document.getElementById('current-lang');
    
    if (!langSwitcherButton) {
        console.error('Language switcher button not found');
        return;
    }
    
    // Check if this is an article page (has data-article-code on body)
    const isArticlePage = document.body.dataset.articleCode || null;
    
    console.log('Initializing language switcher', isArticlePage ? '(article page - will redirect)' : '(blog page - will update content)');
    
    // Toggle dropdown
    langSwitcherButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = langSwitcher.classList.toggle('open');
        console.log('Language dropdown toggled:', isOpen ? 'open' : 'closed');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        if (langSwitcher.classList.contains('open')) {
            langSwitcher.classList.remove('open');
            console.log('Language dropdown closed (outside click)');
        }
    });

    // Function to set language
    const setLanguage = (lang) => {
        if (!translations[lang]) {
            console.error(`Language ${lang} not found in translations.`);
            return;
        }

        console.log(`Setting language to: ${lang}`);

        // Update the button text
        if (currentLangSpan) {
            currentLangSpan.textContent = lang.toUpperCase();
        }

        // Translate UI elements (like "Back to Blog", TOC title, etc.)
        // The article content itself is already in the correct language in the HTML
        const elementsToTranslate = document.querySelectorAll('[data-lang-key]');
        
        elementsToTranslate.forEach(element => {
            const key = element.getAttribute('data-lang-key');
            if (translations[lang][key] !== undefined) {
                // Use innerHTML to support styled text
                element.innerHTML = translations[lang][key];
            }
        });

        // Translate placeholders for inputs/textareas
        const placeholderElements = document.querySelectorAll('[data-lang-placeholder-key]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-lang-placeholder-key');
            if (translations[lang][key] !== undefined) {
                try { element.placeholder = translations[lang][key]; } catch (_) {}
                // For accessibility, also set aria-label if present
                try { if (element.hasAttribute('aria-label')) element.setAttribute('aria-label', translations[lang][key]); } catch (_) {}
            }
        });

        // Persist and propagate language to document
        localStorage.setItem('preferredLanguage', lang);
        try {
            if (document && document.documentElement) {
                document.documentElement.lang = lang;
            }
            if (document && document.body) {
                document.body.dataset.currentLang = lang;
            }
        } catch (_) {}

        // Notify listeners (TOC needs this to rebuild)
        try {
            console.log('Dispatching languageChanged event');
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        } catch (e) {
            console.error('Error dispatching languageChanged event:', e);
        }

        // Close dropdown
        langSwitcher.classList.remove('open');
    };

    // Handle language selection
    const langOptions = langSwitcher.querySelectorAll('.lang-option');
    console.log(`Found ${langOptions.length} language options`);
    
    // Only add click handlers if NOT on an article page
    // Article pages will be handled by lang-redirector.js
    if (!isArticlePage) {
        langOptions.forEach(option => {
            option.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const selectedLang = event.currentTarget.getAttribute('data-lang');
                console.log(`Language option clicked: ${selectedLang}`);
                setLanguage(selectedLang);
            });
        });
    } else {
        console.log('Article page detected - language redirector will handle clicks');
    }

    // Load saved language or default to English
    // On article pages, use the current article language instead
    let initialLang;
    if (isArticlePage) {
        initialLang = document.body.dataset.currentLang || 'en';
        console.log(`Article page - using current language: ${initialLang}`);
    } else {
        initialLang = localStorage.getItem('preferredLanguage') || 'en';
        console.log(`Loading saved language: ${initialLang}`);
    }
    setLanguage(initialLang);
} 