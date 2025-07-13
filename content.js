// Content script - runs in the context of web pages
console.log('Content script loaded');

// Interact with the DOM of the page
// Check if we're on an arXiv page (though manifest should ensure this)
if (window.location.hostname.includes('arxiv.org')) {
    console.log('arXiv extension active on:', window.location.href);

    // Your arXiv-specific functionality here
    function enhancearXivPage() {
        // Example: Add a border to the title

        let title = document.querySelector('.title');
        let abstract = document.querySelector(".abstract");
        let auths = [];
        if (title) {
            title = title.textContent.replace("Title:", "");
        }
        let authors = document.querySelector(".authors");
        if (authors) {
            authors = authors.querySelectorAll("a");
            for (i = 0; i < authors.length; i++) {
                auths.push(authors[i].innerText);
            }
            // console.log(auths);
        }
        if (abstract) {

            abstract = abstract.textContent.replace("Abstract:", "");
        }

    }

    // Run when page loads
    enhancearXivPage();

    // Also run when dynamic content loads (for SPA navigation)
    const observer = new MutationObserver(enhancearXivPage);
    observer.observe(document.body, { childList: true, subtree: true });
} else {
    console.log('Not an arXiv page, extension inactive');
}