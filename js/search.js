// Lightweight full-text search for blog articles
(function () {
  const SEARCH_INPUT_ID = 'blog-search-input';
  const RESULTS_ID = 'blog-search-results';

  // Static article links per language (no database dependency)
  let ARTICLE_LINKS = [];

  let indexBuilt = false;
  let articleIndex = []; // { url, title, text }
  let currentSelection = -1;
  let currentLanguage = 'en';

  function getLocalizedTitle(titleKey, fallback) {
    try {
      const lang = localStorage.getItem('preferredLanguage') || 'en';
      if (window.translations && window.translations[lang] && window.translations[lang][titleKey]) {
        // Strip tags if any are present in translations
        const temp = document.createElement('div');
        temp.innerHTML = window.translations[lang][titleKey];
        return temp.textContent || temp.innerText || fallback;
      }
    } catch (_) {}
    return fallback;
  }

  async function fetchAndExtract(url) {
    const res = await fetch(url, { credentials: 'omit' });
    if (!res.ok) throw new Error('Failed to fetch ' + url);
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const content = doc.querySelector('.article-content');
    const text = content ? content.innerText.replace(/[\s\n]+/g, ' ').trim() : '';
    return text;
  }

  async function buildIndex() {
    if (indexBuilt && ARTICLE_LINKS.length > 0) return;
    
    // Get current language
    currentLanguage = localStorage.getItem('preferredLanguage') || 'en';
    // Static mapping of available articles per language
    const titles = {
      ART001: {
        en: 'Tools in Cytometry Analysis',
        tr: 'Sitometri Analiz Araçları',
        az: 'Sitometriya Analiz Vasitələri',
        de: 'Werkzeuge für die Zytometrieanalyse'
      },
      ART002: {
        en: 'A Complete Guide to scRNA-seq Analysis',
        tr: 'Tek Hücreli RNA-Seq Analizi: Kapsamlı Bir Rehber',
        az: 'Tək Hüceyrəli RNA-Seq Təhlili: Hərtərəfli Bələdçi',
        de: 'Einzelzell-RNA-Seq-Analyse: Ein umfassender Leitfaden'
      },
      ART003: {
        en: 'Are Leaky Barriers the Hidden Cause of Modern Chronic Diseases?',
        tr: 'Sızdıran Bariyerler Modern Kronik Hastalıkların Gizli Nedeni mi?',
        az: 'Sızan Baryerlər Müasir Xroniki Xəstəliklərin Gizli Səbəbidirmi?',
        de: 'Sind undichte Barrieren die verborgene Ursache moderner chronischer Krankheiten?'
      }
    };
    const codes = ['ART001', 'ART002', 'ART003'];
    ARTICLE_LINKS = codes.map(code => ({
      url: `/blog/articles/${code}-${currentLanguage}.html`,
      title: (titles[code] && titles[code][currentLanguage]) || (titles[code] && titles[code].en) || code,
      excerpt: '',
      code
    }));
    
    const tasks = ARTICLE_LINKS.map(async (item) => {
      try {
        const text = await fetchAndExtract(item.url);
        articleIndex.push({ url: item.url, title: item.title, text, excerpt: item.excerpt });
      } catch (e) {
        console.warn('[SEARCH] Indexing failed for', item.url, e);
        // Add to index with just title and excerpt if content fetch fails
        articleIndex.push({ url: item.url, title: item.title, text: item.excerpt, excerpt: item.excerpt });
      }
    });
    await Promise.all(tasks);
    indexBuilt = true;
  }

  function normalize(str) {
    return (str || '').toLowerCase();
  }

  function findMatches(query) {
    const q = normalize(query);
    if (!q) return [];
    const results = [];
    for (const item of articleIndex) {
      const titleMatchIdx = normalize(item.title).indexOf(q);
      const excerptMatchIdx = normalize(item.excerpt).indexOf(q);
      const textIdx = normalize(item.text).indexOf(q);
      
      if (titleMatchIdx !== -1 || excerptMatchIdx !== -1 || textIdx !== -1) {
        // Build snippet - prefer excerpt, then text match
        let snippet = '';
        if (excerptMatchIdx !== -1 && item.excerpt) {
          snippet = item.excerpt;
        } else if (textIdx !== -1) {
          const start = Math.max(0, textIdx - 60);
          const end = Math.min(item.text.length, textIdx + q.length + 60);
          snippet = item.text.slice(start, end);
        }
        results.push({ url: item.url, title: item.title, snippet });
      }
    }
    // Simple ranking: title matches first, then excerpt matches, then text matches
    results.sort((a, b) => {
      const aTitle = normalize(a.title).includes(q) ? 0 : 1;
      const bTitle = normalize(b.title).includes(q) ? 0 : 1;
      if (aTitle !== bTitle) return aTitle - bTitle;
      return 0;
    });
    return results.slice(0, 8);
  }

  function openResults(container) {
    container.classList.add('open');
    const input = document.getElementById(SEARCH_INPUT_ID);
    if (input) input.setAttribute('aria-expanded', 'true');
  }

  function closeResults(container) {
    container.classList.remove('open');
    container.innerHTML = '';
    currentSelection = -1;
    const input = document.getElementById(SEARCH_INPUT_ID);
    if (input) input.setAttribute('aria-expanded', 'false');
  }

      function renderResults(results) {
        const container = document.getElementById(RESULTS_ID);
        const searchContainer = document.querySelector('.blog-search');
        if (!container) return;
        
        // Remove loading state
        if (searchContainer) {
          searchContainer.classList.remove('loading');
        }
        
        if (!results.length) {
          closeResults(container);
          return;
        }
        
        container.innerHTML = '';
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          const item = document.createElement('div');
          item.className = 'blog-search-result';
          item.setAttribute('role', 'option');
          item.setAttribute('tabindex', '-1');
          item.setAttribute('data-url', r.url);
          if (i === currentSelection) item.setAttribute('aria-selected', 'true');

          const title = document.createElement('div');
          title.className = 'blog-search-result-title';
          title.textContent = r.title;

          const snippet = document.createElement('div');
          snippet.className = 'blog-search-result-snippet';
          snippet.textContent = r.snippet || 'Click to read more...';

          item.appendChild(title);
          item.appendChild(snippet);
          
          // Enhanced click handling with animation
          item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            item.style.transform = 'scale(0.98)';
            setTimeout(() => {
              window.location.href = r.url;
            }, 150);
          });
          
          // Add hover effects
          item.addEventListener('mouseenter', () => {
            item.style.transform = 'translateX(4px)';
          });
          
          item.addEventListener('mouseleave', () => {
            if (i !== currentSelection) {
              item.style.transform = 'translateX(0)';
            }
          });

          container.appendChild(item);
        }
        openResults(container);
      }

  function moveSelection(delta) {
    const container = document.getElementById(RESULTS_ID);
    const items = container ? Array.from(container.children) : [];
    if (!items.length) return;
    currentSelection = (currentSelection + delta + items.length) % items.length;
    items.forEach((el, idx) => el.setAttribute('aria-selected', String(idx === currentSelection)));
    const selected = items[currentSelection];
    if (selected && selected.scrollIntoView) selected.scrollIntoView({ block: 'nearest' });
  }

  function activateSelection() {
    const container = document.getElementById(RESULTS_ID);
    const items = container ? Array.from(container.children) : [];
    if (!items.length || currentSelection < 0) return;
    const el = items[currentSelection];
    const url = el && el.getAttribute('data-url');
    if (url) window.location.href = url;
  }

  function init() {
    const input = document.getElementById(SEARCH_INPUT_ID);
    const container = document.getElementById(RESULTS_ID);
    if (!input || !container) return;

    let debounceTimer = null;

        input.addEventListener('input', async () => {
          const q = input.value.trim();
          const searchContainer = document.querySelector('.blog-search');
          clearTimeout(debounceTimer);
          
          if (!q) {
            closeResults(container);
            if (searchContainer) searchContainer.classList.remove('loading');
            return;
          }
          
          // Show loading state
          if (searchContainer) searchContainer.classList.add('loading');
          
          // lazily build index
          if (!indexBuilt) await buildIndex();
          debounceTimer = setTimeout(() => {
            const matches = findMatches(q);
            currentSelection = -1;
            renderResults(matches);
          }, 120);
        });

    input.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          moveSelection(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          moveSelection(-1);
          break;
        case 'Enter':
          if (container.classList.contains('open')) {
            e.preventDefault();
            activateSelection();
          }
          break;
        case 'Escape':
          closeResults(container);
          break;
      }
    });

    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && e.target !== input) {
        closeResults(container);
      }
    });
  }

  // Expose functions for multi-language integration (optional)
  window.BlogSearch = {
    updateArticles: function(_articles, lang) {
      // No-op for static mode; just switch language and rebuild lazily
      currentLanguage = lang;
      indexBuilt = false;
      articleIndex = [];
      ARTICLE_LINKS = [];
    },
    rebuildIndex: buildIndex
  };

  // Listen for language changes
  document.addEventListener('languageChanged', function(event) {
    currentLanguage = event.detail.lang;
    // Reset index to rebuild with new language
    indexBuilt = false;
    articleIndex = [];
    ARTICLE_LINKS = [];
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();


