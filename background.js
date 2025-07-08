// Track all arXiv tabs with their URLs
const arxivTabs = new Map(); // tabId: {url, title}

// Check if URL is from arXiv
function isArXivUrl(url) {
    try {
        const host = new URL(url).hostname;
        const path = new URL(url).pathname;

        const isArxiv =
            (host.endsWith("arxiv.org") || host.endsWith(".arxiv.org")) &&
            (path.includes("abs") || path.includes("pdf"));
        console.log(isArxiv);
        return isArxiv;
    } catch {
        return false;
    }
}

function loadURL(url) {
    url = new URL(url).pathname;
    let lstPart;

    urlParts = url.split("/");
    lstPart = urlParts.pop();

    return lstPart;

    // let paperObj;
}

// Update tab status and store arXiv tabs
function updateTabStatus(tab) {
    if (isArXivUrl(tab.url)) {
        arxivId = loadURL(tab.url);
        if (!tab.xmlData) {
            var paperInfo = {};
            getPaperById(arxivId).then(result => {
                paperInfo['response'] = result['response'];
                paperInfo['bibtex'] = result['bibtex'];
            });
            // console.log(paperInfo);
            arxivTabs.set(tab.id, {
                url: tab.url,
                title: tab.title,
                xmldata: paperInfo,
            });
        }

        // chrome.action.enable(tab.id);
    } else {
        arxivTabs.delete(tab.id);
        // chrome.action.disable(tab.id);
    }
}




// get the tabs' info
async function getPaperById(arxivId) {
    // Remove version number if present (e.g., 1234.5678v3 → 1234.5678)
    // const baseId = arxivId.split('v')[0];
    if (arxivId) {
        const baseId = arxivId.split("v")[0];
        const url = `http://export.arxiv.org/api/query?id_list=${baseId}`;
        // console.log(url);
        const bibtex = `https://arxiv.org/bibtex/${baseId}`;

        try {
            const response = await fetch(url);
            const xmlData = await response.text();
            // const papers = parseArxivXml(xmlData);
            const bibtexResponse = await fetch(bibtex);
            const bibtexData = await bibtexResponse.text();
            // console.log(bibtexData);

            return {
                // paper: papers[0],
                response: xmlData,
                bibtex: bibtexData,
            };

            // return papers.length > 0 ? papers[0] : null;
        } catch (error) {
            console.error("Error fetching paper with id:", arxivId, " ", error);
            return null;
        }
    }
}

// Listeners for tab changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === "complete") {
        updateTabStatus(tab);
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    arxivTabs.delete(tabId);
});

// Get all arXiv tabs when popup requests them
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getArXivTabs") {
        chrome.windows.getAll({ populate: true }, (windows) => {
            const allTabs = windows.flatMap((w) => w.tabs);
            const arxivTabData = Array.from(arxivTabs.entries()).map(
                ([tabId, data]) => ({
                    tabId,
                    ...data,
                    active: allTabs.some((t) => t.active && t.id === tabId),
                })
            );
            sendResponse({ arxivTabs: arxivTabData });
            // console.log(arxivTabData);
        });
        return true; // Keep message channel open for async response
    }
});

// Initialize on startup
chrome.windows.getAll({ populate: true }, (windows) => {
    windows.forEach((window) => {
        window.tabs.forEach((tab) => updateTabStatus(tab));
    });
});

function openRawJsonInNewTab(jsonData) {
    // const jsonString = JSON.stringify(jsonData, null, 2);
    const url = "data:text/plain," + encodeURIComponent(jsonData);
    chrome.tabs.create({ url: url });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openJson") {
        openRawJsonInNewTab(request.data);
    }
});