// Table of Contents Generator (rebuilds on language change)
(function() {
    function buildTOC() {
        const articleContent = document.querySelector('.article-content');
        const tocContainer = document.querySelector('.article-toc');
        if (!articleContent || !tocContainer) return;

        // Clear previous TOC
        tocContainer.innerHTML = '';

        const headings = articleContent.querySelectorAll('h2, h3');
        if (headings.length === 0) return;

        const tocList = document.createElement('ul');
        const tocItems = [];

        headings.forEach((heading, index) => {
            if (!heading.id) heading.id = `heading-${index}`;
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${heading.id}`;
            a.textContent = heading.textContent; // reflects translated text
            a.className = heading.tagName.toLowerCase() === 'h2' ? 'toc-h2' : 'toc-h3';
            a.addEventListener('click', function(e) {
                e.preventDefault();
                const targetHeading = document.querySelector(this.getAttribute('href'));
                if (targetHeading) targetHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
            li.appendChild(a);
            tocList.appendChild(li);
            tocItems.push({ element: a, heading: heading });
        });

        const tocTitle = document.createElement('h3');
        // Prefer current page language if available
        const pageLang = (document.body && document.body.dataset && document.body.dataset.currentLang) || document.documentElement.lang || null;
        const lang = pageLang || localStorage.getItem('preferredLanguage') || 'en';
        const t = (window.translations && window.translations[lang] && window.translations[lang].toc_title) || 'Table of Contents';
        tocTitle.textContent = t;
        tocContainer.appendChild(tocTitle);
        tocContainer.appendChild(tocList);

        const observerOptions = { rootMargin: '-20% 0px -70% 0px', threshold: 0 };
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const tocItem = tocItems.find(item => item.heading === entry.target);
                if (tocItem) {
                    if (entry.isIntersecting) {
                        tocItems.forEach(item => item.element.classList.remove('active'));
                        tocItem.element.classList.add('active');
                    }
                }
            });
        }, observerOptions);
        headings.forEach(heading => observer.observe(heading));
    }

    document.addEventListener('DOMContentLoaded', buildTOC);
    window.addEventListener('languageChanged', buildTOC);
})();