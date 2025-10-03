// Table of Contents Generator
document.addEventListener('DOMContentLoaded', function() {
    const articleContent = document.querySelector('.article-content');
    const tocContainer = document.querySelector('.article-toc');
    
    if (!articleContent || !tocContainer) return;
    
    // Find all headings in the article
    const headings = articleContent.querySelectorAll('h2, h3');
    
    if (headings.length === 0) return;
    
    // Create TOC structure
    const tocList = document.createElement('ul');
    const tocItems = [];
    
    headings.forEach((heading, index) => {
        // Create ID for heading if it doesn't exist
        if (!heading.id) {
            heading.id = `heading-${index}`;
        }
        
        // Create TOC item
        const li = document.createElement('li');
        const a = document.createElement('a');
        
        a.href = `#${heading.id}`;
        a.textContent = heading.textContent;
        a.className = heading.tagName.toLowerCase() === 'h2' ? 'toc-h2' : 'toc-h3';
        
        // Smooth scroll on click
        a.addEventListener('click', function(e) {
            e.preventDefault();
            const targetHeading = document.querySelector(this.getAttribute('href'));
            if (targetHeading) {
                targetHeading.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
        
        li.appendChild(a);
        tocList.appendChild(li);
        tocItems.push({ element: a, heading: heading });
    });
    
    // Add TOC title and list to container
    const tocTitle = document.createElement('h3');
    tocTitle.textContent = 'Table of Contents';
    tocContainer.appendChild(tocTitle);
    tocContainer.appendChild(tocList);
    
    // Intersection Observer for active state
    const observerOptions = {
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const tocItem = tocItems.find(item => item.heading === entry.target);
            if (tocItem) {
                if (entry.isIntersecting) {
                    // Remove active class from all items
                    tocItems.forEach(item => item.element.classList.remove('active'));
                    // Add active class to current item
                    tocItem.element.classList.add('active');
                }
            }
        });
    }, observerOptions);
    
    // Observe all headings
    headings.forEach(heading => observer.observe(heading));
}); 