(function() {
    'use strict';

    // Signal that the new unified controller is active
    try { window.LanguageControllerActive = true; } catch (_) {}

    function getQueryLang() {
        try {
            const params = new URLSearchParams(window.location.search);
            const q = params.get('lang');
            if (q && /^[a-z]{2}$/i.test(q)) return q.toLowerCase();
        } catch (_) {}
        return null;
    }

    function detectInitialLang() {
        const bodyLang = (document.body && document.body.dataset && document.body.dataset.currentLang) || null;
        const queryLang = getQueryLang();
        const storedLang = localStorage.getItem('preferredLanguage');
        const htmlLang = (document.documentElement && document.documentElement.lang) || null;
        return (bodyLang || queryLang || storedLang || htmlLang || 'en').toLowerCase();
    }

    function translateUI(lang) {
        if (!window.translations || !window.translations[lang]) return;
        let textCount = 0;
        let placeholderCount = 0;
        // Text content via data-lang-key
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            const key = el.getAttribute('data-lang-key');
            const val = window.translations[lang][key];
            if (val !== undefined) { el.innerHTML = val; textCount++; }
        });
        // Placeholder via data-lang-placeholder-key
        document.querySelectorAll('[data-lang-placeholder-key]').forEach(el => {
            const key = el.getAttribute('data-lang-placeholder-key');
            const val = window.translations[lang][key];
            if (val !== undefined) {
                try { el.placeholder = val; } catch (_) {}
                if (el.hasAttribute('aria-label')) {
                    try { el.setAttribute('aria-label', val); } catch (_) {}
                }
                placeholderCount++;
            }
        });
        try { console.debug('[LC] translateUI done:', { lang, textCount, placeholderCount }); } catch (_) {}
    }

    function setLanguage(lang) {
        // Persist and propagate
        try { localStorage.setItem('preferredLanguage', lang); } catch (_) {}
        try { document.documentElement.lang = lang; } catch (_) {}
        try { if (document.body) document.body.dataset.currentLang = lang; } catch (_) {}
        try { console.debug('[LC] setLanguage =>', lang); } catch (_) {}
        translateUI(lang);
        // Notify listeners (TOC, blog builders, etc.)
        try { console.debug('[LC] dispatch languageChanged'); window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } })); } catch (_) {}
    }

    function formatDateForLanguage(dateStr, lang) {
        const date = new Date(dateStr);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        const locales = { en: 'en-US', tr: 'tr-TR', az: 'az-AZ', de: 'de-DE' };
        return date.toLocaleDateString(locales[lang] || 'en-US', options);
    }

    // Removed database-backed blog rebuild; blog page uses its own static handler now

    function redirectArticle(code, targetLang) {
        const has = window.ArticlesDB && window.ArticlesDB.isAvailableInLanguage(code, targetLang);
        const lang = has ? targetLang : 'en';
        const url = `/blog/articles/${code}-${lang}.html`;
        window.location.href = url;
    }

    function handleLanguageClickCapture(e) {
        const opt = e.target && (e.target.closest ? e.target.closest('.lang-option') : null);
        if (!opt) return;
        const targetLang = opt.getAttribute('data-lang');
        if (!targetLang) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const code = document.body && document.body.dataset && document.body.dataset.articleCode;
        if (code) {
            // Article page → redirect to translated file
            redirectArticle(code, targetLang);
            return false;
        }
        // Blog/index/other → set language in-place
        setLanguage(targetLang);
        if (document.getElementById('computational-biology') || document.getElementById('epithelial-cell-biology')) {
            rebuildBlogForLanguage(targetLang);
        }
        const switcher = document.querySelector('.lang-switcher');
        if (switcher) switcher.classList.remove('open');
        return false;
    }

    function init() {
        const lang = detectInitialLang();
        try { console.debug('[LC] init detected lang', lang); } catch (_) {}
        setLanguage(lang);

        // Blog page is handled by blog-multilang.js (static); no DB polling here

        // Global capture for language option clicks
        document.addEventListener('click', handleLanguageClickCapture, true);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();


