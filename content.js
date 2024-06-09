console.log("Content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "highlightText") {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        const annotation = request.annotation;
        const color = request.color;

        if (selectedText && annotation) {
            const range = selection.getRangeAt(0);
            highlightRange(range, annotation, color);
            sendResponse({status: "success"});
        } else {
            sendResponse({status: "failure", message: "No text selected or no annotation provided"});
        }
    }
});

function highlightRange(range, annotation, color) {
    const startContainer = range.startContainer;

    if (startContainer.nodeType === Node.TEXT_NODE) {
        const span = document.createElement('span');
        span.className = `web-annotator-highlight-${color}`;
        span.title = annotation;
        range.surroundContents(span);
    } else {
        alert('Invalid selection. Please try selecting only text.');
    }
}
