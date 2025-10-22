(function() {
    let ignoreList = null;
    let requestBuffer = [];

    const originalFetch = window.fetch;

    function isHostMatch(hostname, pattern) {
        if (pattern.startsWith('*.')) {
            const baseDomain = pattern.substring(2);
            return hostname.endsWith(`.${baseDomain}`) || hostname === baseDomain;
        }
        return hostname === pattern;
    }

    window.addEventListener('message', function(event) {
        if (event.source === window && event.data && event.data.type === '__API_SNIFFER_SET_IGNORE_LIST__') {
            ignoreList = event.data.ignoreList || [];
            processBuffer();
        }
    });

    function processBuffer() {
        requestBuffer.forEach(data => processRequest(data));
        requestBuffer = [];
    }

    function processRequest(data) {
        if (ignoreList === null) {
            requestBuffer.push(data);
            return;
        }
        try {
            const requestHostname = new URL(data.url).hostname;
            if (ignoreList.some(pattern => pattern && isHostMatch(requestHostname, pattern.trim()))) return;
        } catch (e) {}

        let initiator = '未知来源，建议使用强制搜索';
        const stackLines = data.stack.split('\n');
        const GENERIC_KEYWORDS = ['injector.js', 'chunk-libs', 'chunk-vendors', 'axios', 'umi.js', 'react', 'vue'];
        const candidateScripts = [];
        for (let i = 2; i < stackLines.length; i++) {
            const line = stackLines[i];
            if (line.includes('chrome-extension://')) continue;
            const match = line.match(/(https?:\/\/[^:]+\.js)/);
            if (match) {
                const url = match[0];
                if (!candidateScripts.includes(url)) candidateScripts.push(url);
            }
        }
        if (candidateScripts.length > 0) {
            const primarySource = candidateScripts[0];
            const isPrimarySourceGeneric = GENERIC_KEYWORDS.some(keyword => primarySource.includes(keyword));
            if (candidateScripts.length === 1 && isPrimarySourceGeneric) {
                initiator = `vue/react项目来源js不确定，建议使用强制搜索来源 (通用模块: ${primarySource})`;
            } else {
                initiator = primarySource;
            }
        }
        data.initiator = initiator;
        window.postMessage({ type: '__API_SNIFFER_REQUEST__', detail: data }, '*');
    }

    window.fetch = async function(...args) {
        const isInternal = (args[1] && args[1].isInternalParsingRequest);
        if (isInternal) {
            const newOptions = { ...args[1] };
            delete newOptions.isInternalParsingRequest;
            const newArgs = [args[0], newOptions];
            return originalFetch.apply(this, newArgs);
        }

        const options = args[0] instanceof Request ? args[0] : (args[1] || {});
        const method = (options.method || 'GET').toUpperCase();
        if (method === 'OPTIONS') return originalFetch.apply(this, args);

        let url = args[0] instanceof Request ? args[0].url : args[0];
        if (typeof url === 'string' && !url.startsWith('http')) {
            url = new URL(url, window.location.origin).href;
        }

        if (typeof url === 'string') {
            let payload = null;
            if (options.body) {
                try {
                    if (options.body instanceof ReadableStream) {
                        const clonedRequest = new Request(url, { ...options });
                        payload = await clonedRequest.json();
                    } else if (typeof options.body === 'string') {
                        payload = JSON.parse(options.body);
                    }
                } catch (e) {
                    payload = "无法解析的请求体";
                }
            }
            let headers = {};
            if (options.headers) {
                if (options.headers instanceof Headers) {
                    options.headers.forEach((value, key) => { headers[key] = value; });
                } else {
                    headers = { ...options.headers };
                }
            }
            processRequest({ url, method, payload, headers, stack: new Error().stack });
        }
        return originalFetch.apply(this, args);
    };

    const originalXhrOpen = XMLHttpRequest.prototype.open;
    const originalXhrSend = XMLHttpRequest.prototype.send;
    const originalSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._requestMethod = method;
        this._rawUrl = url;
        this._requestHeaders = {};
        return originalXhrOpen.apply(this, [method, url, ...rest]);
    };

    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        this._requestHeaders[header] = value;
        return originalSetRequestHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(body) {
        let url = this._rawUrl;
        const method = (this._requestMethod || 'N/A').toUpperCase();
        if (typeof url === 'string' && !url.startsWith('http')) {
            url = new URL(url, window.location.origin).href;
        }
        if (method !== 'OPTIONS' && url && typeof url === 'string') {
            let payload = null;
            if (body) {
                try {
                    payload = JSON.parse(body);
                } catch (e) {
                    payload = (typeof body === 'string') ? body : "无法解析的请求体";
                }
            }
            const headers = this._requestHeaders || {};
            processRequest({ url, method, payload, headers, stack: new Error().stack });
        }
        return originalXhrSend.apply(this, arguments);
    };

    window.addEventListener('message', function(event) {
        if (event.source !== window || !event.data || event.data.type !== '__PARSING_MAKE_REQUEST__') {
            return;
        }
        const { url, requestId, options } = event.data; 
        fetch(url, { ...options, isInternalParsingRequest: true }) 
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            if (options && options.method === 'HEAD') {
                return ''; 
            }
            return response.text();
        })
        .then(content => {
            window.postMessage({
                type: '__PARSING_REQUEST_RESPONSE__',
                requestId: requestId,
                status: 'ok',
                content: content
            }, '*');
        })
            .catch(error => {
                window.postMessage({
                    type: '__PARSING_REQUEST_RESPONSE__',
                    requestId: requestId,
                    status: 'error',
                    error: error.toString()
                }, '*');
            });
    });
})();