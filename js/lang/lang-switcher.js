function initializeLangSwitcher() {
    const langSwitcher = document.querySelector('.lang-switcher');
    // If the switcher doesn't exist, do nothing.
    if (!langSwitcher) {
        return;
    }

    const langSwitcherButton = langSwitcher.querySelector('.lang-switcher-button');
    const currentLangSpan = document.getElementById('current-lang');
    
    // Toggle dropdown
    langSwitcherButton.addEventListener('click', (event) => {
        event.stopPropagation();
        langSwitcher.classList.toggle('open');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        if (langSwitcher.classList.contains('open')) {
            langSwitcher.classList.remove('open');
        }
    });

    // Function to set language
    const setLanguage = (lang) => {
        if (!translations[lang]) {
            console.error(`Language ${lang} not found in translations.`);
            return;
        }

        // Update the button text
        if (currentLangSpan) {
            currentLangSpan.textContent = lang.toUpperCase();
        }

        // Get all elements with data-lang-key attribute
        const elementsToTranslate = document.querySelectorAll('[data-lang-key]');
        
        elementsToTranslate.forEach(element => {
            const key = element.getAttribute('data-lang-key');
            if (translations[lang][key] !== undefined) {
                // Use innerHTML to support styled text
                element.innerHTML = translations[lang][key];
            }
        });

        // Close dropdown
        langSwitcher.classList.remove('open');

        // Save language preference
        localStorage.setItem('preferredLanguage', lang);
    };

    // Handle language selection
    langSwitcher.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', (event) => {
            event.preventDefault();
            const selectedLang = event.currentTarget.getAttribute('data-lang');
            setLanguage(selectedLang);
        });
    });

    // Load saved language or default to English
    const savedLang = localStorage.getItem('preferredLanguage') || 'en';
    setLanguage(savedLang);
} 