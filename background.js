// Track all arXiv tabs with their URLs
const arxivTabs = new Map(); // tabId: {url, title}

// Check if URL is from arXiv
function isArXivUrl(url) {
    try {
        const host = new URL(url).hostname;
        const path = new URL(url).pathname;

        const isArxiv = (host.endsWith('arxiv.org') || host.endsWith('.arxiv.org')) && (path.includes("abs") || path.includes("pdf"));
        console.log(isArxiv);
        return isArxiv;
    } catch {
        return false;
    }
}

// Update tab status and store arXiv tabs
function updateTabStatus(tab) {
    if (isArXivUrl(tab.url)) {
        arxivTabs.set(tab.id, {
            url: tab.url,
            title: tab.title
        });
        // chrome.action.enable(tab.id);
    } else {
        arxivTabs.delete(tab.id);
        // chrome.action.disable(tab.id);
    }
}

// Listeners for tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
        updateTabStatus(tab);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    arxivTabs.delete(tabId);
});

// Get all arXiv tabs when popup requests them
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getArXivTabs') {
        chrome.windows.getAll({ populate: true }, (windows) => {
            const allTabs = windows.flatMap(w => w.tabs);
            const arxivTabData = Array.from(arxivTabs.entries())
                .map(([tabId, data]) => ({
                    tabId,
                    ...data,
                    active: allTabs.some(t => t.active && t.id === tabId)
                }));
            sendResponse({ arxivTabs: arxivTabData });
        });
        return true; // Keep message channel open for async response
    }
});

// Initialize on startup
chrome.windows.getAll({ populate: true }, (windows) => {
    windows.forEach(window => {
        window.tabs.forEach(tab => updateTabStatus(tab));
    });
});


function openRawJsonInNewTab(jsonData) {
    // const jsonString = JSON.stringify(jsonData, null, 2);
    const url = 'data:text/plain,' + encodeURIComponent(jsonData);
    chrome.tabs.create({ url: url });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openJson") {
        openRawJsonInNewTab(request.data);
    }
});