# Article Language Redirect Fix

## Problem
When changing language on article pages, only the UI title changed but the page didn't redirect to the translated article. This was because `lang-switcher.js` was handling the click event and just updating UI text instead of redirecting.

## Root Cause
Both `lang-switcher.js` and `lang-redirector.js` were adding click handlers to the language options, but `lang-switcher.js` was running its handler and preventing the redirect.

## Solution
Modified `lang-switcher.js` to detect article pages and skip adding click handlers on them:

1. **Detect Article Pages**: Check for `data-article-code` attribute on body element
2. **Skip Click Handlers**: Don't add language change handlers on article pages
3. **Let Redirector Handle**: Allow `lang-redirector.js` to handle all clicks on article pages
4. **Update Display Only**: Still update the language dropdown button text to match current article language

## How It Works Now

### On Article Pages (e.g., ART001-az.html):
1. Page loads with `data-article-code="ART001"` and `data-current-lang="az"`
2. `lang-switcher.js` initializes:
   - Detects it's an article page
   - Sets dropdown button to show "AZ" 
   - **Does NOT add click handlers** (logs: "Article page detected - language redirector will handle clicks")
3. `lang-redirector.js` initializes:
   - Adds click handlers to language options
   - When user clicks a language:
     - Logs: "Language option clicked: tr (current: az)"
     - Redirects to: `/blog/articles/ART001-tr.html`

### On Blog Pages (blog.html):
1. `lang-switcher.js` initializes normally
2. Adds click handlers that update content via `blog-multilang.js`
3. No redirect - content filters by language

## Files Modified
- `js/lang/lang-switcher.js`: Added article page detection and conditional handler registration
- `js/lang-redirector.js`: Improved logging and event handling

## Testing
1. Open any article page (e.g., `/blog/articles/ART001-az.html`)
2. Open browser console
3. Click language dropdown - you should see:
   ```
   Initializing language switcher (article page - will redirect)
   Found 4 language options
   Article page detected - language redirector will handle clicks
   Article page - using current language: az
   Setting up article language switcher for: ART001 current lang: az
   ```
4. Click a different language (e.g., English) - you should see:
   ```
   Language option clicked: en (current: az)
   Redirecting to: /blog/articles/ART001-en.html
   ```
5. Page redirects to the English version

## Key Changes in lang-switcher.js

```javascript
// Check if this is an article page
const isArticlePage = document.body.dataset.articleCode || null;

// Only add click handlers if NOT on an article page
if (!isArticlePage) {
    langOptions.forEach(option => {
        option.addEventListener('click', (event) => {
            // Handle language change
            setLanguage(selectedLang);
        });
    });
} else {
    console.log('Article page detected - language redirector will handle clicks');
}
```

This ensures clean separation of concerns:
- Article pages = redirect to translated file
- Blog/index pages = update content dynamically
