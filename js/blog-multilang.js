// Multi-Language Blog Integration
// Adapts the existing blog.html to work with the Wikipedia-style multi-language system
// while preserving all existing functionality (search, categories, etc.)

(function() {
    'use strict';

    let currentLanguage = 'en';
    let articlesData = [];

    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[BML] Blog multilang script loaded');
        
        bootstrapBlogLang();
    });

    function bootstrapBlogLang() {
        const bodyLang = (document.body && document.body.dataset && document.body.dataset.currentLang) || null;
        const storedLang = localStorage.getItem('preferredLanguage');
        currentLanguage = (bodyLang || storedLang || 'en').toLowerCase();
        console.log('[BML] initial lang =', currentLanguage);
        renderStaticBlog(currentLanguage);
        window.addEventListener('languageChanged', function(event) {
            console.log('[BML] languageChanged =>', event.detail.lang);
            currentLanguage = event.detail.lang;
            renderStaticBlog(currentLanguage);
        });
    }

    function renderStaticBlog(lang) {
        console.log('[BML] renderStaticBlog for', lang);
        // Build static cards directly (no DB)
        const comp = document.querySelector('#computational-biology .articles-container');
        const epi = document.querySelector('#epithelial-cell-biology .articles-container');
        if (comp) {
            comp.innerHTML = '';
            comp.appendChild(createCard('ART001', lang, {
                en: 'Tools in Cytometry Analysis',
                tr: 'Sitometri Analiz Araçları',
                az: 'Sitometriya Analiz Vasitələri',
                de: 'Werkzeuge für die Zytometrieanalyse'
            }, '2023-10-27'));
            comp.appendChild(createCard('ART002', lang, {
                en: 'A Complete Guide to scRNA-seq Analysis',
                tr: 'Tek Hücreli RNA-Seq Analizi: Kapsamlı Bir Rehber',
                az: 'Tək Hüceyrəli RNA-Seq Təhlili: Hərtərəfli Bələdçi',
                de: 'Einzelzell-RNA-Seq-Analyse: Ein umfassender Leitfaden'
            }, '2024-07-26'));
        }
        if (epi) {
            epi.innerHTML = '';
            epi.appendChild(createCard('ART003', lang, {
                en: 'Are Leaky Barriers the Hidden Cause of Modern Chronic Diseases?',
                tr: 'Sızdıran Bariyerler Modern Kronik Hastalıkların Gizli Nedeni mi?',
                az: 'Sızan Baryerlər Müasir Xroniki Xəstəliklərin Gizli Səbəbidirmi?',
                de: 'Sind undichte Barrieren die verborgene Ursache moderner chronischer Krankheiten?'
            }, '2024-09-05'));
        }
    }

    function showFallbackArticles() {
        console.log('Showing fallback articles');
        
        // Computational Biology articles
        const compBioContainer = document.querySelector('#computational-biology .articles-container');
        if (compBioContainer) {
            compBioContainer.innerHTML = `
                <a href="/blog/articles/ART001-en.html" class="article-card">
                    <div class="article-card-content">
                        <h3 class="article-card-title">Tools in Cytometry Analysis</h3>
                        <span class="article-card-date">Oct 27, 2023</span>
                        <span class="article-card-version">v1.0</span>
                    </div>
                </a>
                <a href="/blog/articles/ART002-en.html" class="article-card">
                    <div class="article-card-content">
                        <h3 class="article-card-title">A Complete Guide to scRNA-seq Analysis</h3>
                        <span class="article-card-date">Jul 26, 2024</span>
                        <span class="article-card-version">v1.0</span>
                    </div>
                </a>
            `;
        }
        
        // Epithelial Cell Biology articles
        const epithelialContainer = document.querySelector('#epithelial-cell-biology .articles-container');
        if (epithelialContainer) {
            epithelialContainer.innerHTML = `
                <a href="/blog/articles/ART003-en.html" class="article-card">
                    <div class="article-card-content">
                        <h3 class="article-card-title">Are Leaky Barriers the Hidden Cause of Modern Chronic Diseases?</h3>
                        <span class="article-card-date">Sep 05, 2024</span>
                        <span class="article-card-version">v1.0</span>
                    </div>
                </a>
            `;
        }
    }

    function updateArticleSection(sectionId, articles, lang) {
        console.log('[BML] updating section:', sectionId, 'count:', articles.length);
        const section = document.getElementById(sectionId);
        if (!section) {
            console.error('Section not found:', sectionId);
            return;
        }

        const container = section.querySelector('.articles-container');
        if (!container) {
            console.error('Articles container not found in section:', sectionId);
            return;
        }

        // Clear existing articles
        container.innerHTML = '';

        if (articles.length === 0) {
            // Show message if no articles available in this language
            const noArticlesMsg = document.createElement('div');
            noArticlesMsg.className = 'no-articles-message';
            noArticlesMsg.style.cssText = `
                text-align: center;
                padding: 2rem;
                color: #64748b;
                font-style: italic;
            `;
            
            const messages = {
                en: 'No articles available in English yet.',
                tr: 'Bu dilde henüz makale bulunmuyor.',
                az: 'Bu dildə hələ məqalə yoxdur.',
                de: 'Noch keine Artikel in dieser Sprache verfügbar.'
            };
            
            noArticlesMsg.textContent = messages[lang] || messages.en;
            container.appendChild(noArticlesMsg);
            return;
        }

        // Add articles
        articles.forEach(article => {
            const trans = article.translations[lang];
            if (!trans) return;

            const articleCard = createArticleCard(article, trans, lang);
            container.appendChild(articleCard);
        });
    }

    function createCard(code, lang, titles, dateStr) {
        const a = document.createElement('a');
        a.href = `/blog/articles/${code}-${lang}.html`;
        a.className = 'article-card';
        a.innerHTML = `
            <div class="article-card-content">
                <h3 class="article-card-title">${titles[lang] || titles.en}</h3>
                <span class="article-card-date">${formatDateForLanguage(dateStr, lang)}</span>
                <span class="article-card-version">v1.0</span>
            </div>
        `;
        return a;
    }

    function formatDateForLanguage(dateStr, lang) {
        const date = new Date(dateStr);
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };
        
        const locales = {
            en: 'en-US',
            tr: 'tr-TR', 
            az: 'az-AZ',
            de: 'de-DE'
        };

        return date.toLocaleDateString(locales[lang] || 'en-US', options);
    }

    function updateSearchData(articles, lang) {
        // Update the search functionality to work with current language articles
        if (typeof window.BlogSearch !== 'undefined') {
            // If search is already initialized, update its data
            window.BlogSearch.updateArticles(articles, lang);
        } else {
            // Store articles for when search initializes
            articlesData = articles;
        }
    }

    // Expose function to update search when it loads
    window.BlogMultiLang = {
        updateSearchData: updateSearchData,
        getCurrentLanguage: () => currentLanguage,
        getCurrentArticles: () => articlesData,
        loadArticlesForLanguage: loadArticlesForLanguage
    };

})();
