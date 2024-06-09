console.log("Background script running");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "logAnnotation") {
        console.log(`Annotation logged: ${request.annotation}`);
        sendResponse({ status: "success" });
    }
});
