try {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('/js/injector.js');
    script.onload = function() {
        chrome.storage.sync.get(['ignoreList'], (result) => {
            const ignoreList = result.ignoreList ? result.ignoreList.split('\n').filter(Boolean) : [];
            window.postMessage({ type: '__API_SNIFFER_SET_IGNORE_LIST__', ignoreList: ignoreList }, '*');
        });
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);

    window.addEventListener('message', function(event) {
        if (event.source === window && event.data && event.data.type === '__API_SNIFFER_REQUEST__') {
            chrome.runtime.sendMessage({ type: 'API_REQUEST', data: event.data.detail });
        }
    });
} catch (e) {
    console.error("【Parsing】注入或监听脚本时发生错误:", e);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_FROM_PAGE_CONTEXT') {
        const requestId = `req_${Date.now()}_${Math.random()}`;

        const responseListener = (event) => {
            if (event.source === window && event.data && event.data.type === '__PARSING_REQUEST_RESPONSE__' && event.data.requestId === requestId) {
                window.removeEventListener('message', responseListener); 
                sendResponse(event.data);
            }
        };
        
        window.addEventListener('message', responseListener);

        window.postMessage({
            type: '__PARSING_MAKE_REQUEST__',
            url: message.url,
            options: message.options || {},
        requestId: requestId
    }, '*');

    return true;
}

    if (message.type === 'GET_DOCUMENT_CONTENT') {
        sendResponse({
            status: 'ok',
            content: document.documentElement.outerHTML
        });
        return true;
    }
});