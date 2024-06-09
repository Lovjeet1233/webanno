document.addEventListener('DOMContentLoaded', function() {
    const colorButtons = document.querySelectorAll('button[id="fill"]');
    colorButtons.forEach(button => {
        button.addEventListener('click', function() {
            const color = this.getAttribute('data-color');
            setHighlightColor(color);
        });
    });

    document.getElementById('highlight-text').addEventListener('click', () => {
        const annotationName = document.getElementById('note').value;
        if (!annotationName) {
            alert('Please enter an annotation name.');
            return;
        }
        const colorButton = document.querySelector('button[id="fill"].active');
        if (!colorButton) {
            alert('Please select a color.');
            return;
        }
        const color = colorButton.getAttribute('data-color');
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            const tab = tabs[0];
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (annotation, color) => {
                    const selection = window.getSelection();
                    if (selection.rangeCount === 0) {
                        alert('Please select some text to highlight.');
                        return;
                    }
                    const range = selection.getRangeAt(0);
                    const span = document.createElement('span');
                    span.style.backgroundColor = color;
                    span.title = annotation;
                    range.surroundContents(span);
                },
                args: [annotationName, color]
            });
        });
    });

    document.getElementById('save-annotations').addEventListener('click', saveAnnotations);
    document.getElementById('search-annotations').addEventListener('click', searchAnnotations);
    document.getElementById('export-pdf').addEventListener('click', exportToPDF);
});

function setHighlightColor(color) {
    document.querySelectorAll('button[id="fill"]').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`button[data-color="${color}"]`).classList.add('active');
}

function saveAnnotations() {
    const annotationName = document.getElementById('note').value;
    if (!annotationName) {
        alert('Please enter an annotation name.');
        return;
    }
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        const tab = tabs[0];
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: getAnnotations
        }, (results) => {
            const annotations = results[0].result;
            chrome.storage.sync.get(['annotations'], function(result) {
                const allAnnotations = result.annotations || {};
                allAnnotations[tab.url] = allAnnotations[tab.url] || [];
                annotations.forEach(annotation => {
                    annotation.name = annotationName;
                    allAnnotations[tab.url].push(annotation);
                });
                chrome.storage.sync.set({ annotations: allAnnotations }, function() {
                    alert('Annotations saved.');
                });
            });
        });
    });
}

function getAnnotations() {
    return Array.from(document.querySelectorAll("[class^='web-annotator-highlight-']"))
        .map(span => ({
            text: span.innerText,
            annotation: span.title,
            color: span.className.split('-').pop()
        }));
}

function searchAnnotations() {
    const query = document.getElementById('search-query').value.toLowerCase();
    if (!query) {
        alert('Please enter a search query.');
        return;
    }

    chrome.storage.sync.get(['annotations'], function(result) {
        const allAnnotations = result.annotations || {};
        const searchResults = [];

        for (const url in allAnnotations) {
            allAnnotations[url].forEach(annotation => {
                if (annotation.text.toLowerCase().includes(query) ||
                    annotation.annotation.toLowerCase().includes(query) ||
                    annotation.name.toLowerCase().includes(query)) {
                    searchResults.push({
                        url: url,
                        annotation: annotation
                    });
                }
            });
        }

        displaySearchResults(searchResults);
    });
}

function displaySearchResults(results) {
    const annotationList = document.getElementById('annotation-list');
    annotationList.innerHTML = '';

    if (results.length === 0) {
        annotationList.innerHTML = '<p>No annotations found.</p>';
        return;
    }

    results.forEach(result => {
        const annotationDiv = document.createElement('div');
        annotationDiv.className = 'annotation';
        annotationDiv.innerHTML = `
            <p><strong>URL:</strong> ${result.url}</p>
            <p><strong>Text:</strong> ${result.annotation.text}</p>
            <p><strong>Annotation:</strong> ${result.annotation.annotation}</p>
            <p><strong>Name:</strong> ${result.annotation.name}</p>
        `;
        annotationList.appendChild(annotationDiv);
    });
}

function exportToPDF() {
    chrome.storage.sync.get(['annotations'], function(result) {
        const allAnnotations = result.annotations || {};
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let pageIndex = 1;
        for (const url in allAnnotations) {
            doc.text(`Page ${pageIndex}: ${url}`, 10, 10);
            const annotations = allAnnotations[url];
            annotations.forEach((annotation, index) => {
                const position = 20 + (index * 10);
                doc.text(`Text: ${annotation.text}`, 10, position);
                doc.text(`Annotation: ${annotation.annotation}`, 10, position + 10);
                doc.text(`Name: ${annotation.name}`, 10, position + 20);
            });
            if (pageIndex < Object.keys(allAnnotations).length) {
                doc.addPage();
            }
            pageIndex++;
        }

        doc.save('annotations.pdf');
    });
}
