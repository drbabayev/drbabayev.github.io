// Blog Editor JavaScript - Multi-Language Version
(function() {
    'use strict';

    // Initialize TinyMCE Editor
    let editor;
    let currentArticleCode = null;
    let articleContents = {}; // Store content for each language

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        initializeEditor();
        initializeEventListeners();
        initializeLucideIcons();
        initializeThemeToggle();
        initializeKeyboardShortcuts();
        loadAutoSave();
    });

    function initializeEditor() {
        tinymce.init({
            selector: '#editor',
            height: 600,
            menubar: true,
            plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'help', 'wordcount'
            ],
            toolbar: 'undo redo | blocks | bold italic underline strikethrough | ' +
                'alignleft aligncenter alignright alignjustify | ' +
                'bullist numlist outdent indent | ' +
                'table tabledelete | tableprops tablerowprops tablecellprops | ' +
                'tableinsertrowbefore tableinsertrowafter tabledeleterow | ' +
                'tableinsertcolbefore tableinsertcolafter tabledeletecol | ' +
                'link image media | removeformat | help',
            content_style: 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-size: 14px }',
            table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
            table_appearance_options: true,
            table_grid: true,
            table_resize_bars: true,
            table_default_attributes: {
                border: '1'
            },
            table_default_styles: {
                'border-collapse': 'collapse',
                'width': '100%'
            },
            setup: function(ed) {
                editor = ed;
                ed.on('change keyup', function() {
                    updateStatus('unsaved');
                    debounceAutoSave();
                });
            },
            placeholder: 'Start writing your article in English (base version)...',
            branding: false,
            promotion: false
        });
    }

    // Helper functions for editor compatibility
    function getEditorContent() {
        return editor ? editor.getContent() : '';
    }
    
    function setEditorContent(htmlContent) {
        if (editor) {
            editor.setContent(html);
        }
    }
    
    function insertTable() {
        // TinyMCE has built-in table insertion, so just notify user
        if (editor) {
            editor.execCommand('mceInsertTable', false, { rows: 3, columns: 3 });
        }
    }

    function initializeEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                switchTab(this.dataset.tab);
            });
        });

        // Toolbar custom buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                handleCustomTool(this.dataset.action);
            });
        });

        // Custom table insertion button
        const insertTableBtn = document.getElementById('insertTableBtn');
        if (insertTableBtn) {
            insertTableBtn.addEventListener('click', insertTable);
        }

        // Header buttons
        document.getElementById('newBtn').addEventListener('click', newArticle);
        document.getElementById('loadBtn').addEventListener('click', showArticleList);
        document.getElementById('saveArticleBtn').addEventListener('click', saveArticleToDatabase);
        const deleteBtn = document.getElementById('deleteArticleBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', deleteCurrentArticle);
        }
        document.getElementById('exportBtn').addEventListener('click', exportAllPages);

        // HTML copy buttons
        document.querySelectorAll('[data-copy]').forEach(btn => {
            btn.addEventListener('click', function() {
                copyHTML(this.dataset.copy);
            });
        });

        // Apply HTML source to editor for a specific language
        document.querySelectorAll('[data-apply-lang]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-apply-lang');
                const textareaId = {
                    en: 'htmlSourceEn', tr: 'htmlSourceTr', az: 'htmlSourceAz', de: 'htmlSourceDe'
                }[lang];
                const htmlContent = document.getElementById(textareaId).value;
                if (!htmlContent) return;
                setEditorContent(htmlContent);
                updateStatus('loaded');
            });
        });

        // Save only one language HTML directly to disk
        document.querySelectorAll('[data-save-lang]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const lang = btn.getAttribute('data-save-lang');
                const code = document.getElementById('articleCode').value;
                if (!code) { alert('No article code'); return; }
                let htmlContent = generateArticleHTML(lang, false);
                try {
                    const resp = await fetch('/api/save-article', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, files: { [lang]: html } })
                    });
                    const data = await resp.json();
                    if (!data.success) throw new Error(data.error || 'Save failed');
                    // Update DB availableLanguages and translations for this language
                    upsertLanguageInDatabase(code, lang);
                    await persistDatabase();
                    alert(`✅ Saved ${code}-${lang}.html and updated database availability`);
                } catch (e) {
                    alert('Save failed: ' + e.message);
                }
            });
        });

        // Delete only one language HTML
        document.querySelectorAll('[data-delete-lang]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const lang = btn.getAttribute('data-delete-lang');
                const code = document.getElementById('articleCode').value;
                if (!code) { alert('No article code'); return; }
                if (!confirm(`Delete ${code}-${lang}.html?`)) return;
                try {
                    const resp = await fetch('/api/delete-article', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, languages: [lang] })
                    });
                    const data = await resp.json();
                    if (!data.success) throw new Error(data.error || 'Delete failed');
                    // Update DB: remove language from availability
                    removeLanguageFromDatabase(code, lang);
                    await persistDatabase();
                    alert(`🗑️ Deleted ${code}-${lang}.html and updated database availability`);
                } catch (e) {
                    alert('Delete failed: ' + e.message);
                }
            });
        });

        // Editor content language switch - load current file HTML if available
        document.querySelectorAll('.content-lang-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const lang = btn.getAttribute('data-lang');
                const code = document.getElementById('articleCode').value;
                if (!code) { alert('No article code'); return; }
                try {
                    const url = `/blog/articles/${code}-${lang}.html`;
                    const resp = await fetch(url);
                    if (!resp.ok) throw new Error('Not found');
                    const htmlText = await resp.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(htmlText, 'text/html');
                    const articleContent = doc.querySelector('.article-content');
                    if (!articleContent) throw new Error('Invalid article file');
                    const clone = articleContent.cloneNode(true);
                    clone.querySelector('h1')?.remove();
                    clone.querySelector('.lang-availability')?.remove();
                    clone.querySelector('.article-toc')?.remove();
                    clone.querySelector('.references')?.remove();
                    const htmlContent = clone.innerHTML.trim() || '';
                    setEditorContent(htmlContent);
                    updateStatus('loaded');
                } catch (e) {
                    alert(`No existing ${code}-${lang}.html found; starting fresh in editor.`);
                    setEditorContent('');
                }
            });
        });

        // Image upload
        document.getElementById('imageUpload').addEventListener('change', handleImageUpload);

        // Modal
        document.getElementById('closeModal').addEventListener('click', closeModal);
        
        // Help modal
        document.getElementById('helpBtn').addEventListener('click', showHelp);
        document.getElementById('closeHelpModal').addEventListener('click', closeHelp);

        // Auto-save on metadata changes
        document.querySelectorAll('.metadata-panel input, .metadata-panel textarea, .metadata-panel select').forEach(input => {
            input.addEventListener('input', debounceAutoSave);
        });

        // Handle language availability checkboxes (file-based management)
        ['Tr', 'Az', 'De'].forEach(langCap => {
            const checkbox = document.getElementById(`available${langCap}`);
            const group = document.getElementById(`group${langCap}`);
            const lang = langCap.toLowerCase();

            checkbox.addEventListener('change', async function() {
                const code = document.getElementById('articleCode').value;
                if (!code) return;

                if (this.checked) {
                    group.style.opacity = '1';
                    group.querySelectorAll('input, textarea').forEach(el => el.disabled = false);
                    // Create file for this language if not present
                    const exists = await languageFileExists(code, lang);
                    if (!exists) {
                        let htmlContent = generateArticleHTML(lang, false);
                        try {
                            await saveLanguageFile(code, lang, html);
                        } catch (e) {
                            alert(`Failed to create ${code}-${lang}.html: ${e.message}`);
                            this.checked = false;
                            group.style.opacity = '0.5';
                            group.querySelectorAll('input, textarea').forEach(el => el.disabled = true);
                        }
                    }
                } else {
                    group.style.opacity = '0.5';
                    group.querySelectorAll('input, textarea').forEach(el => el.disabled = true);
                    // Delete file for this language
                    const confirmDel = confirm(`Delete ${code}-${lang}.html? This will not affect other languages.`);
                    if (confirmDel) {
                        try {
                            await deleteLanguageFile(code, lang);
                        } catch (e) {
                            alert(`Failed to delete ${code}-${lang}.html: ${e.message}`);
                            this.checked = true;
                            group.style.opacity = '1';
                            group.querySelectorAll('input, textarea').forEach(el => el.disabled = false);
                        }
                    }
                }
            });

            // Initialize state
            checkbox.dispatchEvent(new Event('change'));
        });

        // Auto-generate slugs from titles
        ['En', 'Tr', 'Az', 'De'].forEach(lang => {
            const titleInput = document.getElementById(`title${lang}`);
            const slugInput = document.getElementById(`slug${lang}`);
            
            titleInput.addEventListener('input', function() {
                if (!slugInput.value || slugInput.dataset.autoGenerated === 'true') {
                    slugInput.value = generateSlug(this.value);
                    slugInput.dataset.autoGenerated = 'true';
                }
            });
            
            slugInput.addEventListener('input', function() {
                slugInput.dataset.autoGenerated = 'false';
            });
        });
    }

    function initializeLucideIcons() {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function initializeThemeToggle() {
        const themeBtn = document.getElementById('themeToggleBtn');

        // Determine initial theme: saved or system preference
        const savedTheme = localStorage.getItem('editorTheme');
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

        // Set on <html> and body for maximum compatibility with CSS
        document.documentElement.setAttribute('data-theme', initialTheme);
        document.body.setAttribute('data-theme', initialTheme);
        if (initialTheme === 'dark') {
            document.documentElement.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.body.classList.remove('dark');
        }
        updateThemeButton(initialTheme);
        // Force repaint to ensure CSS vars apply
        requestAnimationFrame(() => {
            document.documentElement.style.colorScheme = initialTheme;
        });

        // Toggle on click
        themeBtn.addEventListener('click', function() {
            const currentTheme = (document.documentElement.getAttribute('data-theme') || 'light');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            document.body.setAttribute('data-theme', newTheme);
            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
                document.body.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
                document.body.classList.remove('dark');
            }
            localStorage.setItem('editorTheme', newTheme);
            updateThemeButton(newTheme);
            document.documentElement.style.colorScheme = newTheme;
        });

        // If no saved theme, follow system changes
        if (!savedTheme && window.matchMedia) {
            const mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', (e) => {
                const newTheme = e.matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                document.body.setAttribute('data-theme', newTheme);
                if (newTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                    document.body.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                    document.body.classList.remove('dark');
                }
                updateThemeButton(newTheme);
            });
        }
    }

    function updateThemeButton(theme) {
        const btn = document.getElementById('themeToggleBtn');
        const icon = btn.querySelector('i');
        
        if (theme === 'dark') {
            icon.setAttribute('data-lucide', 'sun');
        } else {
            icon.setAttribute('data-lucide', 'moon');
        }
        
        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file!');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB!');
            return;
        }

        // Read file as data URL for preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const range = quill.getSelection(true);
            // Removed insertEmbed;
            
            // Show instructions for user
            const filename = file.name;
            const suggestion = `/images/${filename}`;
            alert(`Image inserted as preview!\n\nTo publish:\n1. Upload the image to your GitHub repo at: ${suggestion}\n2. Right-click the image in the editor\n3. Change the src to: ${suggestion}\n\nNote: The image is currently embedded as base64. You must replace it with the actual URL before exporting.`);
        };
        reader.readAsDataURL(file);
        
        // Reset input
        event.target.value = '';
    }

    function generateSlug(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        if (tabName === 'editor') {
            document.getElementById('editorTab').classList.add('active');
        } else if (tabName === 'preview') {
            document.getElementById('previewTab').classList.add('active');
            updatePreview();
        } else if (tabName.startsWith('html-')) {
            const lang = tabName.replace('html-', '');
            const tabMap = {
                'en': 'htmlTabEn',
                'tr': 'htmlTabTr',
                'az': 'htmlTabAz',
                'de': 'htmlTabDe'
            };
            document.getElementById(tabMap[lang]).classList.add('active');
            updateHTMLSource(lang);
        }
    }

    function handleCustomTool(action) {
        const range = null;
        if (!range) return;

        switch(action) {
            case 'heading':
                // Removed format;
                break;
            case 'subheading':
                // Removed format;
                break;
            case 'paragraph':
                // Removed format;
                break;
            case 'list':
                // Removed format;
                break;
            case 'image':
                const imageUrl = prompt('Enter image URL (e.g., /images/article.jpg):');
                if (imageUrl) {
                    // Removed insertEmbed;
                }
                break;
            case 'upload-image':
                document.getElementById('imageUpload').click();
                break;
            case 'link':
                const linkUrl = prompt('Enter link URL:');
                if (linkUrl) {
                    // Removed format;
                }
                break;
            case 'code':
                // Removed format;
                break;
        }
    }

    function newArticle() {
        if (confirm('Clear current article and start new? (Current work will be auto-saved)')) {
            currentArticleCode = window.ArticlesDB.getNextCode();
            document.getElementById('articleCode').value = currentArticleCode;
            
            setEditorContent('');
            articleContents = {};
            
            document.querySelectorAll('.metadata-panel input:not(#articleCode), .metadata-panel textarea').forEach(input => {
                input.value = '';
            });
            document.getElementById('articleDate').value = new Date().toISOString().split('T')[0];
            updateStatus('unsaved');
        }
    }

    function showArticleList() {
        const listContainer = document.getElementById('articleList');
        listContainer.innerHTML = '';

        // Runtime guardrails: ensure DB is present and non-empty
        if (!window.ArticlesDB || typeof window.ArticlesDB.getAll !== 'function') {
            listContainer.innerHTML = '<p style="color: #ef4444; text-align: center; padding: 2rem;">Database is not loaded. Make sure /admin/articles-db.js is accessible and included before editor.js.</p>';
            console.error('[Editor] ArticlesDB is not available. Check that admin/articles-db.js is loaded before editor.js');
            return;
        }

        const articles = window.ArticlesDB.getAll();
        if (!Array.isArray(articles) || articles.length === 0) {
            listContainer.innerHTML = '<p style="color: #64748b; text-align: center; padding: 2rem;">No articles found in database. If you just saved, refresh the page to reload the updated database.</p>';
            console.warn('[Editor] ArticlesDB returned empty list. Try refreshing to reload database.');
            return;
        }
        
        if (articles.length === 0) {
            listContainer.innerHTML = '<p style="color: #64748b; text-align: center; padding: 2rem;">No articles yet. Create your first article!</p>';
        } else {
            articles.forEach(article => {
                const item = document.createElement('div');
                item.className = 'article-item';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h3>${article.translations.en.title}</h3>
                            <p>${article.category}</p>
                            <div class="meta">
                                <span><strong>Code:</strong> ${article.code}</span>
                                <span><strong>Date:</strong> ${article.date}</span>
                            </div>
                        </div>
                        <button class="btn btn-secondary" onclick="window.editorLoadArticle('${article.code}')" style="margin-left: 1rem;">
                            <i data-lucide="edit"></i>
                        </button>
                    </div>
                `;
                listContainer.appendChild(item);
            });
            
            // Re-initialize lucide icons for the new buttons
            setTimeout(() => lucide.createIcons(), 100);
        }

        document.getElementById('articleListModal').classList.add('open');
    }

    function closeModal() {
        document.getElementById('articleListModal').classList.remove('open');
    }

    function showHelp() {
        document.getElementById('helpModal').classList.add('open');
    }

    function closeHelp() {
        document.getElementById('helpModal').classList.remove('open');
    }

    function initializeKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl+S - Save to DB
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                saveArticleToDatabase();
            }
            // Ctrl+N - New Article
            else if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                newArticle();
            }
            // Ctrl+O - Open/Load Article
            else if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                showArticleList();
            }
            // Ctrl+E - Export
            else if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                exportAllPages();
            }
            // Escape - Close modals
            else if (e.key === 'Escape') {
                closeModal();
                closeHelp();
            }
        });
    }

    async function loadArticleFromDatabase(code) {
        const article = window.ArticlesDB.getByCode(code);
        if (!article) {
            alert('Article not found!');
            return;
        }

        currentArticleCode = code;
        document.getElementById('articleCode').value = code;
        document.getElementById('articleCategory').value = article.category;
        document.getElementById('articleDate').value = article.date;
        document.getElementById('articleImage').value = article.image || '';

        // Load translations and availability
        ['en', 'tr', 'az', 'de'].forEach(lang => {
            const langCap = lang.charAt(0).toUpperCase() + lang.slice(1);
            const trans = article.translations[lang];
            const isAvailable = article.availableLanguages && article.availableLanguages.includes(lang);
            
            // Set availability checkbox
            if (lang !== 'en') {
                const checkbox = document.getElementById(`available${langCap}`);
                if (checkbox) {
                    checkbox.checked = isAvailable;
                    checkbox.dispatchEvent(new Event('change'));
                }
            }
            
            // Load translation data if available
            if (trans && isAvailable) {
                document.getElementById(`title${langCap}`).value = trans.title || '';
                document.getElementById(`slug${langCap}`).value = trans.slug || '';
                document.getElementById(`excerpt${langCap}`).value = trans.excerpt || '';
            }
        });

        // Close modal first
        closeModal();
        
        // Try to load existing article content from English version
        try {
            const response = await fetch(`/blog/articles/${code}-en.html`);
            if (response.ok) {
                let htmlContent = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const articleContent = doc.querySelector('.article-content');
                
                if (articleContent) {
                    // Extract only the main content (skip title and TOC)
                    const contentClone = articleContent.cloneNode(true);
                    
                    // Remove elements we don't want to edit
                    contentClone.querySelector('h1')?.remove();
                    contentClone.querySelector('.lang-availability')?.remove();
                    contentClone.querySelector('.article-toc')?.remove();
                    contentClone.querySelector('.references')?.remove();
                    
                    // Set the content in the editor using the Delta format
                    const contentHTML = contentClone.innerHTML.trim();
                    if (contentHTML) {
                        // Check if content has tables
                        const hasTables = contentClone.querySelector('table');
                        
                        // Clear first, then set content
                        setEditorContent('');
                        
                        // Use clipboard to properly import HTML into Quill
                        let htmlContent = contentHTML;
                        setEditorContent(htmlContent);
                        
                        // Also populate HTML source tabs for all languages
                        ['en', 'tr', 'az', 'de'].forEach(lang => {
                            const textareaId = {
                                'en': 'htmlSourceEn',
                                'tr': 'htmlSourceTr',
                                'az': 'htmlSourceAz',
                                'de': 'htmlSourceDe'
                            }[lang];
                            
                            const textarea = document.getElementById(textareaId);
                            if (textarea) {
                                textarea.value = contentHTML;
                            }
                        });
                        
                        // Update checkboxes based on what was loaded
                        const hasReferences = doc.querySelector('.references');
                        const hasTOC = doc.querySelector('.article-toc');
                        if (hasReferences) document.getElementById('includeReferences').checked = true;
                        if (hasTOC) document.getElementById('includeTOC').checked = true;
                        
                        updateStatus('loaded');
                        
                        // Alert user about tables if present
                        if (hasTables) {
                            alert(`✅ Article ${code} loaded successfully!\n\n⚠️ THIS ARTICLE CONTAINS TABLES!\n\n📝 To view/edit tables:\n1. Switch to "HTML (EN)" tab\n2. Find your <table> tags\n3. Edit directly in HTML\n4. Tables cannot be shown in visual editor\n\n💡 All content including tables is now loaded in HTML tabs.`);
                        } else {
                            alert(`✅ Article ${code} loaded successfully!\n\n📄 Metadata and content loaded from published version.\n✏️ You can now edit and export again.`);
                        }
                        return;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load article content:', error);
        }
        
        // If loading failed, just clear the editor
        setEditorContent('');
        articleContents = {};
        
        updateStatus('loaded');
        
        alert(`⚠️ Article ${code} metadata loaded!\n\n📝 Content could not be fetched from published files.\nYou can write or paste content manually.`);
    }

    // Expose to window for onclick handlers
    window.editorLoadArticle = loadArticleFromDatabase;

    function saveArticleToDatabase() {
        const metadata = getMetadata();
        
        if (!metadata.articleCode) {
            alert('Article code is missing!');
            return;
        }

        if (!metadata.titleEn) {
            alert('Please enter at least an English title!');
            return;
        }

        // Determine available languages based on checkboxes
        const availableLanguages = ['en']; // English always required
        ['tr', 'az', 'de'].forEach(lang => {
            const langCap = lang.charAt(0).toUpperCase() + lang.slice(1);
            if (document.getElementById(`available${langCap}`).checked) {
                availableLanguages.push(lang);
            }
        });

        const article = {
            code: metadata.articleCode,
            category: metadata.category,
            date: metadata.date,
            image: metadata.articleImage,
            availableLanguages: availableLanguages,
            translations: {}
        };

        // Only include translations for available languages
        if (availableLanguages.includes('en')) {
            article.translations.en = {
                title: metadata.titleEn,
                excerpt: metadata.excerptEn,
                slug: metadata.slugEn || generateSlug(metadata.titleEn)
            };
        }
        if (availableLanguages.includes('tr')) {
            article.translations.tr = {
                title: metadata.titleTr,
                excerpt: metadata.excerptTr,
                slug: metadata.slugTr || generateSlug(metadata.titleTr)
            };
        }
        if (availableLanguages.includes('az')) {
            article.translations.az = {
                title: metadata.titleAz,
                excerpt: metadata.excerptAz,
                slug: metadata.slugAz || generateSlug(metadata.titleAz)
            };
        }
        if (availableLanguages.includes('de')) {
            article.translations.de = {
                title: metadata.titleDe,
                excerpt: metadata.excerptDe,
                slug: metadata.slugDe || generateSlug(metadata.titleDe)
            };
        }

        // Update database IN MEMORY
        const isUpdate = window.ArticlesDB.getByCode(metadata.articleCode);
        if (isUpdate) {
            window.ArticlesDB.update(metadata.articleCode, article);
        } else {
            window.ArticlesDB.add(article);
        }

        // Save to localStorage for sync
        localStorage.setItem('articlesDBSync', window.ArticlesDB.exportJSON());
        localStorage.setItem('articlesDBSyncTime', new Date().toISOString());
        
        updateStatus('saving');
        
        const actionText = isUpdate ? 'updated' : 'added';
        const dbContent = generateDatabaseFileContent();
        
        // Try to save via Node.js server API (database)
        fetch('/api/save-database', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: dbContent
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // After DB saved, save article HTML files for available languages
                const availableLanguages = ['en'];
                ['tr','az','de'].forEach(lang => {
                    const langCap = lang.charAt(0).toUpperCase() + lang.slice(1);
                    const checkbox = document.getElementById(`available${langCap}`);
                    if (checkbox && checkbox.checked) availableLanguages.push(lang);
                });

                const files = {};
                availableLanguages.forEach(lang => {
                    files[lang] = generateArticleHTML(lang, false);
                });

                fetch('/api/save-article', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: metadata.articleCode, files })
                })
                .then(r => r.json())
                .then(saveResp => {
                    if (!saveResp.success) throw new Error(saveResp.error || 'Unknown article save error');
                    updateStatus('saved');
                    alert(`✅ Saved AUTOMATICALLY!\n\n💾 Database updated: /admin/articles-db.js\n📝 Article files written:\n - ${saveResp.written.join('\n - ')}\n\n🎉 All done. No manual steps needed.`);
                })
                .catch(err => {
                    console.error('Article save failed, but DB saved:', err);
                    updateStatus('saved');
                    alert(`✅ Database saved, but article files failed.\n\nError: ${err.message}\n\nYou can still Export All Pages as a fallback.`);
                });
            } else {
                throw new Error(data.error || 'Unknown error');
            }
        })
        .catch(error => {
            console.error('Failed to save via API, falling back to clipboard:', error);
            updateStatus('saved');
            
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(dbContent).then(() => {
                alert(`✅ Article ${actionText} successfully!\n\n⚠️ Server API unavailable - using fallback method.\n\n📋 Database content copied to clipboard!\n\n🔧 STEPS:\n1. Open: /admin/articles-db.js\n2. Press Ctrl+A (select all)\n3. Press Ctrl+V (paste)\n4. Save the file\n\n💡 Use Node.js server for automatic updates!`);
            }).catch(() => {
                // Final fallback: Show modal with content to copy
                if (confirm(`✅ Article ${actionText} successfully!\n\n⚠️ Automatic save failed.\n\nClick OK to download the file, or Cancel to copy manually.`)) {
                    downloadDatabaseFile();
                } else {
                    showCopyModal(dbContent);
                }
            });
        });
    }

    async function deleteCurrentArticle() {
        const metadata = getMetadata();
        const code = metadata.articleCode;
        if (!code) {
            alert('No article code present. Nothing to delete.');
            return;
        }

        const confirmDelete = confirm(`Delete article ${code} from database and remove its HTML files? This cannot be undone.`);
        if (!confirmDelete) return;

        // Remove from DB (in memory)
        if (window.ArticlesDB && typeof window.ArticlesDB.delete === 'function') {
            window.ArticlesDB.delete(code);
        }

        // Persist DB
        downloadDatabaseFile();

        // Determine languages to delete: from checkboxes or default set
        const langs = ['en'];
        ['tr','az','de'].forEach(lang => {
            const langCap = lang.charAt(0).toUpperCase() + lang.slice(1);
            const cb = document.getElementById(`available${langCap}`);
            if (cb && cb.checked) langs.push(lang);
        });

        try {
            const resp = await fetch('/api/delete-article', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, languages: langs })
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || 'Unknown delete error');

            alert(`🗑️ Deleted ${code}\n\nRemoved files:\n - ${(data.deleted || []).join('\n - ')}`);

            // Reset editor state
            setEditorContent('');
            document.getElementById('articleCode').value = window.ArticlesDB.getNextCode();
            updateStatus('saved');
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Delete failed: ' + err.message);
        }
    }
    
    function showCopyModal(content) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;';
        
        const box = document.createElement('div');
        box.style.cssText = 'background:var(--bg-panel);padding:2rem;border-radius:1rem;max-width:800px;max-height:80vh;overflow:auto;';
        
        box.innerHTML = `
            <h2 style="margin-bottom:1rem;">Copy Database Content</h2>
            <p style="margin-bottom:1rem;">Select all text below (Ctrl+A) and copy (Ctrl+C):</p>
            <textarea readonly style="width:100%;height:400px;font-family:monospace;font-size:0.875rem;padding:1rem;border:1px solid var(--border);border-radius:0.5rem;">${content}</textarea>
            <button onclick="this.closest('div[style*=fixed]').remove()" style="margin-top:1rem;padding:0.75rem 1.5rem;background:var(--primary);color:white;border:none;border-radius:0.5rem;cursor:pointer;">Close</button>
        `;
        
        modal.appendChild(box);
        document.body.appendChild(modal);
        
        box.querySelector('textarea').select();
    }
    
    function generateDatabaseFileContent() {
        return `// Article Database
// This file contains all blog articles metadata and content registry

const articlesDB = ${window.ArticlesDB.exportJSON()};

// Helper functions
const ArticlesDB = {
    getAll() { return Object.values(articlesDB); },
    getByCode(code) { return articlesDB[code]; },
    getByCategory(category) { return Object.values(articlesDB).filter(a => a.category === category); },
    getByCategoryAndLanguage(category, lang) { return Object.values(articlesDB).filter(a => a.category === category && a.availableLanguages && a.availableLanguages.includes(lang)); },
    add(article) { articlesDB[article.code] = article; return article; },
    update(code, updates) { if (articlesDB[code]) { articlesDB[code] = { ...articlesDB[code], ...updates }; return articlesDB[code]; } return null; },
    delete(code) { delete articlesDB[code]; },
    getNextCode() { const codes = Object.keys(articlesDB).map(code => parseInt(code.replace('ART', ''))).filter(num => !isNaN(num)); const maxNum = Math.max(...codes, 0); return \`ART\${String(maxNum + 1).padStart(3, '0')}\`; },
    exportJSON() { return JSON.stringify(articlesDB, null, 2); },
    importJSON(json) { try { const data = JSON.parse(json); Object.assign(articlesDB, data); return true; } catch (e) { console.error('Failed to import:', e); return false; } },
    getArticleURL(code, lang = 'en') { const article = articlesDB[code]; if (!article) return null; return \`/blog/articles/\${code}-\${lang}.html\`; },
    getBlogURL(lang = 'en') { return \`/blog.html\`; },
    isAvailableInLanguage(code, lang) { const article = articlesDB[code]; return article && article.availableLanguages && article.availableLanguages.includes(lang); },
    getAvailableLanguages(code) { const article = articlesDB[code]; return article && article.availableLanguages ? article.availableLanguages : ['en']; }
};

if (typeof window !== 'undefined') {
    window.articlesDB = articlesDB;
    window.ArticlesDB = ArticlesDB;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { articlesDB, ArticlesDB };
}
`;
    }

    // File-based helpers (HTML first)
    async function languageFileExists(code, lang) {
        try {
            const resp = await fetch(`/blog/articles/${code}-${lang}.html`, { method: 'HEAD' });
            return resp.ok;
        } catch (e) { return false; }
    }

    async function saveLanguageFile(code, lang, html) {
        const resp = await fetch('/api/save-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, files: { [lang]: html } })
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error || 'Save failed');
        return true;
    }

    async function deleteLanguageFile(code, lang) {
        const resp = await fetch('/api/delete-article', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, languages: [lang] })
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.error || 'Delete failed');
        return true;
    }

    function upsertLanguageInDatabase(code, lang) {
        if (!window.ArticlesDB || !window.ArticlesDB.getByCode) return;
        const article = window.ArticlesDB.getByCode(code);
        if (!article) return;
        if (!Array.isArray(article.availableLanguages)) article.availableLanguages = ['en'];
        if (!article.availableLanguages.includes(lang)) article.availableLanguages.push(lang);
        // Ensure translations object exists
        if (!article.translations) article.translations = {};
        const langCap = lang;
        if (!article.translations[langCap]) {
            const md = getMetadata();
            const titleKey = 'title' + lang.charAt(0).toUpperCase() + lang.slice(1);
            const excerptKey = 'excerpt' + lang.charAt(0).toUpperCase() + lang.slice(1);
            const slugKey = 'slug' + lang.charAt(0).toUpperCase() + lang.slice(1);
            article.translations[langCap] = {
                title: md[titleKey] || md.titleEn || '',
                excerpt: md[excerptKey] || md.excerptEn || '',
                slug: md[slugKey] || (md[titleKey] ? generateSlug(md[titleKey]) : (md.titleEn ? generateSlug(md.titleEn) : ''))
            };
        }
        window.ArticlesDB.update(code, article);
    }

    function removeLanguageFromDatabase(code, lang) {
        if (!window.ArticlesDB || !window.ArticlesDB.getByCode) return;
        const article = window.ArticlesDB.getByCode(code);
        if (!article) return;
        if (Array.isArray(article.availableLanguages)) {
            article.availableLanguages = article.availableLanguages.filter(l => l !== lang);
        }
        if (article.translations && article.translations[lang]) {
            delete article.translations[lang];
        }
        window.ArticlesDB.update(code, article);
    }

    async function persistDatabase() {
        // Build DB file content from in-memory ArticlesDB and trigger server save if available
        const dbContent = generateDatabaseFileContent();
        try {
            const resp = await fetch('/api/save-database', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: dbContent })
            });
            const data = await resp.json();
            if (!data.success) throw new Error(data.error || 'DB save failed');
        } catch (e) {
            // Fallback: download file for manual replacement
            downloadDatabaseFile();
        }
    }

    function downloadDatabaseFile() {
        const dbContent = `// Article Database
// This file contains all blog articles metadata and content registry

const articlesDB = ${window.ArticlesDB.exportJSON()};

// Helper functions
const ArticlesDB = {
    getAll() { return Object.values(articlesDB); },
    getByCode(code) { return articlesDB[code]; },
    getByCategory(category) { return Object.values(articlesDB).filter(a => a.category === category); },
    add(article) { articlesDB[article.code] = article; return article; },
    update(code, updates) { if (articlesDB[code]) { articlesDB[code] = { ...articlesDB[code], ...updates }; return articlesDB[code]; } return null; },
    delete(code) { delete articlesDB[code]; },
    getNextCode() { const codes = Object.keys(articlesDB).map(code => parseInt(code.replace('ART', ''))).filter(num => !isNaN(num)); const maxNum = Math.max(...codes, 0); return \`ART\${String(maxNum + 1).padStart(3, '0')}\`; },
    exportJSON() { return JSON.stringify(articlesDB, null, 2); },
    importJSON(json) { try { const data = JSON.parse(json); Object.assign(articlesDB, data); return true; } catch (e) { console.error('Failed to import:', e); return false; } },
    getArticleURL(code, lang = 'en') { const article = articlesDB[code]; if (!article) return null; return \`/blog/articles/\${code}-\${lang}.html\`; },
    getBlogURL(lang = 'en') { return \`/blog-\${lang}.html\`; }
};

if (typeof window !== 'undefined') {
    window.articlesDB = articlesDB;
    window.ArticlesDB = ArticlesDB;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { articlesDB, ArticlesDB };
}
`;

        const blob = new Blob([dbContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'articles-db.js';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function updatePreview() {
        const previewFrame = document.getElementById('previewFrame');
        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;
        
        let htmlContent = generateArticleHTML('en', true); // Preview in English
        previewDoc.open();
        previewDoc.write(html);
        previewDoc.close();
    }

    function updateHTMLSource(lang) {
        let htmlContent = generateArticleHTML(lang, false);
        const textareaMap = {
            'en': 'htmlSourceEn',
            'tr': 'htmlSourceTr',
            'az': 'htmlSourceAz',
            'de': 'htmlSourceDe'
        };
        document.getElementById(textareaMap[lang]).value = html;
    }

    function generateArticleHTML(lang, previewMode = false) {
        const metadata = getMetadata();
        let content = getEditorContent();
        
        // Wrap tables in scrollable container
        content = content.replace(/<table>/g, '<div class="table-wrapper"><table>');
        content = content.replace(/<\/table>/g, '</table></div>');
        
        const langCap = lang.charAt(0).toUpperCase() + lang.slice(1);
        const title = metadata[`title${langCap}`] || metadata.titleEn;
        const excerpt = metadata[`excerpt${langCap}`] || metadata.excerptEn;
        const code = metadata.articleCode;

        if (previewMode) {
            return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        h2 { font-size: 1.875rem; margin-top: 2rem; margin-bottom: 1rem; }
        h3 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.75rem; }
        p { margin-bottom: 1rem; }
        ul, ol { padding-left: 1.5rem; margin-bottom: 1rem; }
        li { margin-bottom: 0.5rem; }
        img { max-width: 100%; height: auto; }
        code { background: #f1f5f9; padding: 0.2rem 0.4rem; border-radius: 0.25rem; }
        pre { background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>${title}</h1>
    ${content}
</body>
</html>`;
        }

        // Full article HTML
        const langNames = { en: 'English', tr: 'Turkish', az: 'Azerbaijani', de: 'German' };
        const otherLangs = ['en', 'tr', 'az', 'de'].filter(l => l !== lang);

        return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Dr. Anar Babayev</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="${excerpt}">
    <meta name="keywords" content="computational biology, epithelial barrier, research">
    <meta name="author" content="Dr. Anar Babayev">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://drbabayev.github.io/blog/articles/${code}-${lang}.html">
    
    <!-- Open Graph -->
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${excerpt}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://drbabayev.github.io/blog/articles/${code}-${lang}.html">
    ${metadata.articleImage ? `<meta property="og:image" content="https://drbabayev.github.io${metadata.articleImage}">` : ''}
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${excerpt}">
    ${metadata.articleImage ? `<meta name="twitter:image" content="https://drbabayev.github.io${metadata.articleImage}">` : ''}
    
    <!-- Language Alternates -->
    ${otherLangs.map(l => `<link rel="alternate" hreflang="${l}" href="https://drbabayev.github.io/blog/articles/${code}-${l}.html">`).join('\n    ')}
    
    <!-- Favicon -->
    <link rel="icon" href="/favicon.ico">
    
    <!-- Styles -->
    <link rel="stylesheet" href="/css/main.css">
    
    <!-- Lucide Icons -->
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body data-article-code="${code}" data-current-lang="${lang}">
    <!-- Header -->
    <div id="main-header"></div>

    <!-- Article Content -->
    <main class="article-full">
        ${metadata.includeTOC ? `<aside class="article-toc">
            <div class="toc-header">
                <a href="/blog.html" class="back-to-blog-btn" data-lang-key="back_to_blog">&larr; Back to Blog</a>
            </div>
            <!-- Table of Contents will be generated by JavaScript -->
        </aside>` : ''}
        
        <div class="article-content">
            <header class="article-header">
                <h1>${title}</h1>
                <p class="article-meta">Published on <time datetime="${metadata.date}">${new Date(metadata.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time> by Huseyn Babayev</p>
            </header>
            ${metadata.articleImage ? `
            <div class="article-header-image">
                <img src="${metadata.articleImage}" alt="${title}">
            </div>` : ''}
            <article>
                ${content}
                
                ${metadata.includeReferences ? `
                <section class="references">
                    <h2>References</h2>
                    <ol class="references-list">
                        <!-- Add references here -->
                    </ol>
                </section>` : ''}
            </article>
        </div>
    </main>

    <!-- Footer -->
    <div id="main-footer"></div>

    <!-- Scripts -->
    <script src="/js/main.js"></script>
    <script src="/js/theme-switcher.js"></script>
    <script src="/admin/articles-db.js"></script>
    <script src="/js/lang-redirector.js"></script>
    ${metadata.includeTOC ? '<script src="/js/toc.js"></script>' : ''}
</body>
</html>`;
    }

    function getMetadata() {
        return {
            articleCode: document.getElementById('articleCode').value,
            category: document.getElementById('articleCategory').value,
            date: document.getElementById('articleDate').value,
            articleImage: document.getElementById('articleImage').value,
            availableEn: document.getElementById('availableEn').checked,
            availableTr: document.getElementById('availableTr').checked,
            availableAz: document.getElementById('availableAz').checked,
            availableDe: document.getElementById('availableDe').checked,
            titleEn: document.getElementById('titleEn').value,
            slugEn: document.getElementById('slugEn').value,
            excerptEn: document.getElementById('excerptEn').value,
            titleTr: document.getElementById('titleTr').value,
            slugTr: document.getElementById('slugTr').value,
            excerptTr: document.getElementById('excerptTr').value,
            titleAz: document.getElementById('titleAz').value,
            slugAz: document.getElementById('slugAz').value,
            excerptAz: document.getElementById('excerptAz').value,
            titleDe: document.getElementById('titleDe').value,
            slugDe: document.getElementById('slugDe').value,
            excerptDe: document.getElementById('excerptDe').value,
            includeReferences: document.getElementById('includeReferences').checked,
            includeTOC: document.getElementById('includeTOC').checked
        };
    }

    function exportAllPages() {
        const metadata = getMetadata();
        
        if (!metadata.articleCode) {
            alert('Please set article code (or save to DB first)!');
            return;
        }

        if (!metadata.titleEn) {
            alert('Please enter at least an English title!');
            return;
        }

        // Get available languages from checkboxes
        const availableLanguages = ['en'];
        ['tr', 'az', 'de'].forEach(lang => {
            const langCap = lang.charAt(0).toUpperCase() + lang.slice(1);
            if (document.getElementById(`available${langCap}`).checked) {
                availableLanguages.push(lang);
            }
        });

        // Generate only available language versions
        const zip = {}; // Simple object to hold files

        availableLanguages.forEach(lang => {
            let htmlContent = generateArticleHTML(lang, false);
            zip[`${metadata.articleCode}-${lang}.html`] = html;
        });

        // Download each file
        Object.entries(zip).forEach(([filename, content], index) => {
            setTimeout(() => {
                const blob = new Blob([content], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, index * 200);
        });

        updateStatus('exported');
        
        const fileList = availableLanguages.map(lang => `- ${metadata.articleCode}-${lang}.html`).join('\\n');
        const instructionsHTML = `
┌────────────────────────────────────────────────────┐
│   ✅ EXPORTED ${availableLanguages.length} FILE(S) SUCCESSFULLY!     │
└────────────────────────────────────────────────────┘

📄 Files Generated:
${fileList}

📋 DEPLOYMENT CHECKLIST:

1️⃣  SAVE ARTICLES TO REPOSITORY
   ✓ Move downloaded HTML files to: /blog/articles/
   ✓ If you have images, upload them to: /images/

2️⃣  UPDATE DATABASE (IMPORTANT!)
   ✓ Click "Save to DB" button above
   ✓ Download the updated articles-db.js file
   ✓ Replace /admin/articles-db.js with the new file

3️⃣  TEST LOCALLY
   ✓ Run: python3 -m http.server 8000
   ✓ Visit: http://localhost:8000/blog.html
   ✓ Check all language versions work
   ✓ Verify search finds your article

4️⃣  COMMIT & PUSH TO GITHUB
   ✓ git add blog/articles/${metadata.articleCode}-*.html
   ✓ git add admin/articles-db.js
   ✓ git add images/* (if you added images)
   ✓ git commit -m "Add article: ${metadata.titleEn}"
   ✓ git push origin main

5️⃣  VERIFY DEPLOYMENT
   ✓ Visit: https://drbabayev.github.io/blog.html
   ✓ Check all language versions
   ✓ Test search functionality
   ✓ Verify language switcher works

💡 TIP: Save your work in the editor before closing!
    Auto-save keeps a backup for 7 days.
`;
        
        // Create a better formatted alert or console log
        console.log(instructionsHTML);
        alert(`Exported ${availableLanguages.length} file(s)!\n\nSee browser console (F12) for detailed deployment instructions.\n\n⚠️ IMPORTANT: Click "Save to DB" to update the database, then download articles-db.js!`);
    }

    function copyHTML(lang) {
        const textareaMap = {
            'en': 'htmlSourceEn',
            'tr': 'htmlSourceTr',
            'az': 'htmlSourceAz',
            'de': 'htmlSourceDe'
        };
        let htmlContent = document.getElementById(textareaMap[lang]).value;
        navigator.clipboard.writeText(html).then(() => {
            alert(`HTML (${lang.toUpperCase()}) copied to clipboard!`);
        }).catch(err => {
            alert('Failed to copy: ' + err);
        });
    }

    function updateStatus(status) {
        const statusEl = document.getElementById('saveStatus');
        
        switch(status) {
            case 'saved':
                statusEl.textContent = 'Saved';
                statusEl.className = 'status-indicator saved';
                break;
            case 'saving':
                statusEl.textContent = 'Saving...';
                statusEl.className = 'status-indicator saving';
                break;
            case 'exported':
                statusEl.textContent = 'Exported';
                statusEl.className = 'status-indicator saved';
                setTimeout(() => updateStatus('saved'), 2000);
                break;
            case 'loaded':
                statusEl.textContent = 'Loaded';
                statusEl.className = 'status-indicator saved';
                setTimeout(() => updateStatus('saved'), 2000);
                break;
            default:
                statusEl.textContent = 'Unsaved';
                statusEl.className = 'status-indicator';
        }
    }

    // Auto-save functionality
    let autoSaveTimeout;
    function debounceAutoSave() {
        clearTimeout(autoSaveTimeout);
        autoSaveTimeout = setTimeout(autoSave, 2000);
    }

    function autoSave() {
        updateStatus('saving');
        
        const saveData = {
            content: getEditorContent(),
            metadata: getMetadata(),
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('blogEditorAutoSave', JSON.stringify(saveData));
        
        setTimeout(() => updateStatus('saved'), 500);
    }

    function loadAutoSave() {
        const saved = localStorage.getItem('blogEditorAutoSave');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                const saveDate = new Date(data.timestamp);
                const daysSince = (new Date() - saveDate) / (1000 * 60 * 60 * 24);
                
                if (daysSince < 7) {
                    const restore = confirm(`Auto-saved draft found from ${saveDate.toLocaleString()}. Restore?`);
                    if (restore) {
                        getEditorContent() = data.content;
                        
                        if (data.metadata) {
                            Object.keys(data.metadata).forEach(key => {
                                const el = document.getElementById(key);
                                if (el) {
                                    if (el.type === 'checkbox') {
                                        el.checked = data.metadata[key];
                                    } else {
                                        el.value = data.metadata[key];
                                    }
                                }
                            });
                        }
                        
                        currentArticleCode = data.metadata.articleCode;
                        updateStatus('loaded');
                    }
                }
            } catch (error) {
                console.error('Failed to load auto-save:', error);
            }
        } else {
            // Initialize with new article code
            document.getElementById('articleCode').value = window.ArticlesDB.getNextCode();
        }
    }

})();

