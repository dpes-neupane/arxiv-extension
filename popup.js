document.addEventListener("DOMContentLoaded", async () => {
  const statusElement = document.getElementById("status");
  const tabsListElement = document.getElementById("arxivTabsList");
  const refreshButton = document.getElementById("refreshTabs");
  const arxivTabCount = document.getElementById("arxivTabCount");
  const downloadButton = document.getElementById("downloadSelected");
  let checkBoxes = [];
  let counter = 0;
  loadArXivTabs();

  downloadButton.disabled = true;
  downloadButton.addEventListener("click", downloadSelected);
  // Check current tab status
  chrome.tabs.query({ active: true, currentWindow: true }, ([currentTab]) => {
    const isArXiv = currentTab.url && isArXivUrl(currentTab.url);

    updateStatusUI(isArXiv);
  });

  // Load arXiv tabs

  // Refresh button
  refreshButton.addEventListener("click", loadArXivTabs);

  // Helper functions
  function isArXivUrl(url) {
    return url && new URL(url).hostname.includes("arxiv.org");
  }

  function loadURL(url) {
    url = new URL(url).pathname;
    let lstPart;

    urlParts = url.split("/");
    lstPart = urlParts.pop();

    return lstPart;

    // let paperObj;
  }

  function updateStatusUI(isArXiv) {
    statusElement.textContent = isArXiv
      ? "Active on arXiv page"
      : "Not on arXiv.org";
    statusElement.dataset.active = isArXiv;
  }

  function loadArXivTabs() {
    chrome.runtime.sendMessage({ action: "getArXivTabs" }, (response) => {
      renderTabsList(response.arxivTabs);
    });
  }

  function parseArxivXml(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    // console.log(xmlString);
    // console.log(xmlDoc);
    // Handle potential parsing errors
    const parserError = xmlDoc.getElementsByTagName("parsererror");
    console.log(parserError);
    if (parserError.length > 0) {
      throw new Error("Failed to parse XML: " + parserError[0].textContent);
    }

    const entries = xmlDoc.getElementsByTagName("entry");
    return Array.from(entries).map((entry) => {
      // Safely get elements with null checks
      const getId = () => {
        const idElement = entry.getElementsByTagName("id")[0];
        return idElement ? idElement.textContent : null;
      };

      const getTitle = () => {
        const titleElement = entry.getElementsByTagName("title")[0];
        return titleElement
          ? titleElement.textContent.replace(/\n/g, "").trim()
          : "Untitled";
      };

      const getSummary = () => {
        const summaryElement = entry.getElementsByTagName("summary")[0];
        return summaryElement ? summaryElement.textContent.trim() : "";
      };

      const getAuthors = () => {
        const authorElements = entry.getElementsByTagName("author");
        return Array.from(authorElements).map((author) => {
          const nameElement = author.getElementsByTagName("name")[0];
          return nameElement ? nameElement.textContent : "Unknown author";
        });
      };

      const getLinks = () => {
        const linkElements = entry.getElementsByTagName("link");
        return Array.from(linkElements).reduce((acc, link) => {
          const rel = link.getAttribute("rel");
          const href = link.getAttribute("href");
          if (rel && href) {
            acc[rel] = href;
            if (link.getAttribute("title") === "pdf") {
              acc.pdf = href;
            }
          }
          return acc;
        }, {});
      };

      const links = getLinks();

      return {
        id: getId(),
        title: getTitle(),
        summary: getSummary(),
        authors: getAuthors(),
        published:
          entry.getElementsByTagName("published")[0]?.textContent || null,
        updated: entry.getElementsByTagName("updated")[0]?.textContent || null,
        pdfUrl: links.pdf || links.alternate || null,
        primaryCategory:
          entry
            .getElementsByTagName("arxiv:primary_category")[0]
            ?.getAttribute("term") || null,
        categories: Array.from(entry.getElementsByTagName("category"))
          .map((cat) => cat.getAttribute("term"))
          .filter(Boolean),
        links: links, // Include all links for reference
      };
    });
  }

  //   function loadURL(url) {
  //     url = new URL(url).pathname;
  //     let lstPart;

  //     urlParts = url.split("/");
  //     lstPart = urlParts.pop();

  //     return lstPart;

  //     // let paperObj;
  //   }

  function getPaperById(tabData) {
    // Remove version number if present (e.g., 1234.5678v3 → 1234.5678)
    var xmlData = tabData["xmldata"];
    var bibtexData = tabData["bibtex"];
    const papers = parseArxivXml(xmlData);
    if (papers.length > 0) {
      return {
        paper: papers[0],
        bibtex: bibtexData,
      };
    }
    // const baseId = arxivId.split('v')[0];
    // if (arxivId) {
    //     const baseId = arxivId.split('v')[0];
    //     const url = `http://export.arxiv.org/api/query?id_list=${baseId}`;
    //     // console.log(url);
    //     const bibtex = `https://arxiv.org/bibtex/${baseId}`;

    //     try {
    //         const response = await fetch(url);
    //         const xmlData = await response.text();
    // const bibtexResponse = await fetch(bibtex);
    // const bibtexData = await bibtexResponse.text();
    // console.log(bibtexData);

    // return papers.length > 0 ? papers[0] : null;
    // } catch (error) {
    //     console.error('Error fetching paper:', error);
    //     return null;
    // }

    // }
  }

  function downloadCSV(data, filename = "data.csv") {
    // Convert array of objects to CSV string
    const csvContent = [
      Object.keys(data[0]).join("||"), // Header row
      ...data.map((item) => Object.values(item).join("||")),
    ].join("\n");
    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadSelected() {
    let data = [];
    for (i = 0; i < checkBoxes.length; i++) {
      if (checkBoxes[i].checked) {
        paperInfo = {
          id: checkBoxes[i].getAttribute("id"),
          title: checkBoxes[i].getAttribute("data"),
          authors: checkBoxes[i].getAttribute("paper-authors").split(","),
          published: checkBoxes[i].getAttribute("paper-published"),
          pdfUrl: checkBoxes[i].getAttribute("paper-pdfLink"),
          summary: checkBoxes[i]
            .getAttribute("paper-summary")
            .replaceAll("\n", " "),
        };
        data.push(paperInfo);
      }
    }
    downloadCSV(data);
    // console.log(data);
  }

  function renderTabsList(tabs) {
    tabsListElement.innerHTML = "";
    if (tabs.length === 0) {
      tabsListElement.innerHTML =
        '<li class="no-tabs">No arXiv tabs found</li>';
      return;
    }
    const bibtex = new Map();
    tabs.forEach((tab) => {
      const li = document.createElement("li");
      li.className = tab.active ? "active" : "";
      arxivId = loadURL(tab.url);
      const a = document.createElement("a");
      const checkBox = document.createElement("input");
      // bibtex button
      const bib = document.createElement("button");
      bib.setAttribute("class", "bibtexButton");
      bib.style.display = "none";
      checkBox.style.display = "none";
      a.href = "#";
      // a.textContent = tab.title || tab.url;
      a.title = tab.url;
      a.addEventListener("click", () => {
        chrome.tabs.update(tab.tabId, { active: true });
        // Close popup after switching
      });
      result = getPaperById(tab);

      paper = result["paper"];
      bibtex.set(tab.tabId, result["bibtex"]);
      //   console.log(bibtex);
      //   console.log(result["bibtex"]);
      //   console.log("............");
      if (paper) {
        checkBox.setAttribute("type", "checkbox");
        checkBox.setAttribute("class", "paperCB");
        a.innerHTML = `<h3>${paper.title}</h3>`;
        checkBox.style.display = "inline";

        checkBox.setAttribute("id", arxivId);
        checkBox.setAttribute("data", paper.title);
        checkBox.setAttribute("paper-summary", paper.summary);
        checkBox.setAttribute("paper-pdfLink", paper.pdfUrl);
        checkBox.setAttribute("paper-published", paper.published);
        checkBox.setAttribute("paper-authors", paper.authors);
        checkBox.addEventListener("change", function () {
          if (checkBox.checked) {
            downloadButton.disabled = false;
            counter++;
          } else {
            counter--;
          }
          if (counter <= 0) {
            downloadButton.disabled = true;
          }
        });
      }
      if (bibtex) {
        // bibtex = bibtex.replaceAll("\n", " ");
        // console.log(bibtex);
        // console.log("He");
        bib.style.display = "inline";
        bib.innerText = "BibTex";
        bib.id = tab.tabId;

        // console.log(bibdata);
        bib.addEventListener("click", function () {
          bibdata = bibtex.get(parseInt(bib.id));
          console.log(tab.tabId);
          chrome.runtime.sendMessage({
            action: "openJson",
            data: bibdata,
          });
        });
      }

      li.appendChild(bib);
      li.appendChild(checkBox);
      li.appendChild(a);
      tabsListElement.appendChild(li);
      checkBoxes.push(checkBox);
    });
    arxivTabCount.innerText = tabs.length;
  }
});
