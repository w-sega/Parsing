
document.addEventListener('DOMContentLoaded', () => {
    const navButtons = {
        requests: document.getElementById('nav-requests'),
        history: document.getElementById('nav-history'),
        scripts: document.getElementById('nav-scripts'),
        scanner: document.getElementById('nav-scanner'),
        sender: document.getElementById('nav-sender'),
        subdomain: document.getElementById('nav-subdomain'),
        quickFunctions: document.getElementById('nav-quick-functions'),
        settings: document.getElementById('nav-settings'),
    };
    const views = {
        requests: document.getElementById('view-requests'),
        history: document.getElementById('view-history'),
        scripts: document.getElementById('view-scripts'),
        scanner: document.getElementById('view-scanner'),
        sender: document.getElementById('view-sender'),
        subdomain: document.getElementById('view-subdomain'),
        quickFunctions: document.getElementById('view-quick-functions'),
        settings: document.getElementById('view-settings'),
    };
    const requestsContainer = document.getElementById('requests-container');
    const historyContainer = document.getElementById('history-container');
    const ignoreListTextarea = document.getElementById('ignore-list-textarea');
    const scriptsContainer = document.getElementById('scripts-container');

    const aiModelSelect = document.getElementById('ai-model-select');
    const apiKeyContainers = document.querySelectorAll('.api-key-container');

    const scanSourcemapsBtn = document.getElementById('scan-sourcemaps-btn');
    const scanSourcemapsStatus = document.getElementById('scan-sourcemaps-status');

    aiModelSelect.addEventListener('change', () => {
        const selectedModel = aiModelSelect.value;
        apiKeyContainers.forEach(container => {
            if (container.id === `${selectedModel}-key-container`) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        });
    });
    
    const startScanBtn = document.getElementById('start-scan-btn');
    const scanStatus = document.getElementById('scan-status');
    const scanResultsContainer = document.getElementById('scan-results-container');

    const senderListContainer = document.getElementById('sender-list-container');
    const clearSenderListBtn = document.getElementById('clear-sender-list-btn');
    const senderSearchInput = document.getElementById('sender-search-input');
    const sendAllRequestsBtn = document.getElementById('send-all-requests-btn');
    const senderAllStatus = document.getElementById('sender-all-status');

    const clearRequestsBtn = document.getElementById('clear-requests-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsStatus = document.getElementById('settings-status');
    const apiKeyInput = document.getElementById('api-key-input');
    const modal = document.getElementById('script-modal');
    const scriptContentEl = document.getElementById('script-content');
    const closeBtn = document.querySelector('.close-btn');
    const aiButtonsContainer = document.getElementById('ai-buttons-container');
    const aiResultContainer = document.getElementById('ai-result-container');
    const aiResultEl = document.getElementById('ai-result');
    const copyAiResultBtn = document.getElementById('copy-ai-result-btn');

    const aiResultTitle = document.getElementById('ai-result-title');

    const customAiQueryContainer = document.getElementById('custom-ai-query-container');
    const customAiInput = document.getElementById('custom-ai-input');
    const sendCustomAiBtn = document.getElementById('send-custom-ai-btn');

    const batchTitleTextarea = document.getElementById('batch-title-urls-textarea');
    const batchTitleBtn = document.getElementById('batch-title-fetch-btn');
    const batchTitleClearBtn = document.getElementById('batch-title-clear-btn');
    const batchTitleStatus = document.getElementById('batch-title-status');
    const batchTitleResultsContainer = document.getElementById('batch-title-results-container');
    const TITLE_FETCH_HISTORY_KEY = 'titleFetchHistory';

    function loadTitleFetchHistory() {
        chrome.storage.local.get({ [TITLE_FETCH_HISTORY_KEY]: [] }, (data) => {
            const history = data[TITLE_FETCH_HISTORY_KEY];
            if (history.length > 0) {
                renderTitleResults(history);
                batchTitleStatus.textContent = `已加载 ${history.length} 条历史记录。`;
            }
        });
    }

    batchTitleBtn.addEventListener('click', () => {
        const targets = batchTitleTextarea.value.trim().split('\n').filter(Boolean);
        if (targets.length === 0) {
            batchTitleStatus.textContent = '请输入目标地址！';
            return;
        }
        batchTitleBtn.disabled = true;
        batchTitleBtn.textContent = '探测中...';
        batchTitleStatus.textContent = `准备探测 ${targets.length} 个目标...`;
        
        chrome.runtime.sendMessage({
            type: 'BATCH_FETCH_TITLES',
            targets: targets
        }, (newResults) => {
            chrome.storage.local.get({ [TITLE_FETCH_HISTORY_KEY]: [] }, (data) => {
                const combinedHistory = [...data[TITLE_FETCH_HISTORY_KEY], ...newResults];
                chrome.storage.local.set({ [TITLE_FETCH_HISTORY_KEY]: combinedHistory }, () => {
                    renderTitleResults(combinedHistory);
                    batchTitleBtn.disabled = false;
                    batchTitleBtn.textContent = '开始探测';
                    batchTitleStatus.textContent = `探测完成！当前共 ${combinedHistory.length} 条记录。`;
                });
            });
        });
    });

    batchTitleClearBtn.addEventListener('click', () => {
        if (confirm('确定要清空所有探测记录吗？')) {
            chrome.storage.local.set({ [TITLE_FETCH_HISTORY_KEY]: [] }, () => {
                batchTitleResultsContainer.innerHTML = '';
                batchTitleStatus.textContent = '所有探测记录已清空。';
            });
        }
    });

    function renderTitleResults(results) {
        batchTitleResultsContainer.innerHTML = '';
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">目标地址</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 100px;">状态码</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">标题</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        results.forEach(result => {
            const tr = document.createElement('tr');
            const statusColor = result.status.toString().startsWith('2') ? '#2e7d32' : 
                                result.status.toString().startsWith('3') ? '#ed6c02' : '#d32f2f';
            tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px; word-break: break-all;">
                    <a href="${result.finalUrl}" target="_blank">${escapeHtml(result.originalTarget)}</a>
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: ${statusColor};">
                    ${escapeHtml(result.status)}
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; word-break: break-all;">
                    ${escapeHtml(result.title)}
                </td>
            `;
            tbody.appendChild(tr);
        });
        batchTitleResultsContainer.appendChild(table);
    }
    

    scanResultsContainer.addEventListener('click', (event) => {
    if (!event.target.classList.contains('copy-btn')) return;

    const button = event.target;
    const category = button.dataset.category;
    const type = button.dataset.type;

    

    function renderTitleResults(results) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">目标地址</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; width: 100px;">状态码</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">标题</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        results.forEach(result => {
            const tr = document.createElement('tr');
            
            const statusColor = result.status.toString().startsWith('2') ? '#2e7d32' : 
                                result.status.toString().startsWith('3') ? '#ed6c02' : '#d32f2f';

            tr.innerHTML = `
                <td style="border: 1px solid #ddd; padding: 8px; word-break: break-all;">
                    <a href="${result.finalUrl}" target="_blank">${escapeHtml(result.originalTarget)}</a>
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: ${statusColor};">
                    ${escapeHtml(result.status)}
                </td>
                <td style="border: 1px solid #ddd; padding: 8px; word-break: break-all;">
                    ${escapeHtml(result.title)}
                </td>
            `;
            tbody.appendChild(tr);
        });
        batchTitleResultsContainer.appendChild(table);
    }

    chrome.runtime.sendMessage({ type: 'GET_LAST_SCAN_RESULTS' }, (response) => {
        if (!response || !response.results || !response.results[category]) return;

        (async () => {
            const items = response.results[category];
            let textToCopy = '';

            if (type === 'url') {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });

                if (!tabs[0] || !tabs[0].url) {
                    alert('无法获取当前标签页的URL来生成链接。');
                    return;
                }

                const pageUrl = new URL(tabs[0].url);
                textToCopy = items.map(item => new URL(item.value, pageUrl.origin).href).join('\n');
                
            } else {
                textToCopy = items.map(item => item.value).join('\n');
            }

            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalText = button.innerHTML;
                button.innerHTML = '✔ 已复制';
                button.disabled = true;
                setTimeout(() => {
                    button.innerHTML = originalText;
                    button.disabled = false;
                }, 2000);
            });
        })();
    });
});


    let currentScriptContent = '';
    let currentTargetUrl = '';
    let fullAiAnalysisResult = '';
    let loadedHistory = [];
    let senderApiList = [];
    const MAX_DISPLAY_LENGTH = 50000;

    Object.keys(navButtons).forEach(key => {
        navButtons[key].addEventListener('click', () => {
            Object.values(navButtons).forEach(btn => btn.classList.remove('active'));
            Object.values(views).forEach(view => view.classList.remove('active'));
            navButtons[key].classList.add('active');
            views[key].classList.add('active');

            if (key === 'history') loadHistory();
            if (key === 'settings') loadSettings();
            if (key === 'requests') loadRequests();
            if (key === 'scripts') loadScripts();
            if (key === 'sender') {
                senderSearchInput.value = '';
                renderSenderList(senderApiList);
            }
            if (key === 'subdomain') {
                loadSubdomainView();
            }
            if (key === 'scanner') {
                 chrome.runtime.sendMessage({ type: 'GET_LAST_SCAN_RESULTS' }, (response) => {
                    if (response && response.results) {
                        renderScanResults(response.results);
                        scanStatus.textContent = `上次扫描完成于: ${response.timestamp}`;
                    } else {
                        scanResultsContainer.innerHTML = '';
                        scanStatus.textContent = '点击上方按钮开始扫描。';
                    }
                });
            }
        });
    });

    function escapeHtml(unsafe) {
        const safeString = String(unsafe); 
    return safeString.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

    function getLatestAuthToken() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'GET_REQUESTS' }, (requestsLog) => {
                if (!requestsLog || requestsLog.length === 0) {
                    resolve(null);
                    return;
                }
                for (let i = requestsLog.length - 1; i >= 0; i--) {
                    const request = requestsLog[i];
                    if (request.headers) {
                        const authKey = Object.keys(request.headers).find(key => key.toLowerCase() === 'authorization');
                        if (authKey) {
                            resolve(request.headers[authKey]);
                            return;
                        }
                    }
                }
                resolve(null);
            });
        });
    }

    async function addApisToSenderList(apis) {
        if (!apis || apis.length === 0) {
            alert("未能解析出任何有效的API。");
            return;
        }

        const latestToken = await getLatestAuthToken();

        if (latestToken) {
            apis.forEach(api => {
                if (!api.headers) {
                    api.headers = {};
                }
                const authKey = Object.keys(api.headers).find(key => key.toLowerCase() === 'authorization');
                if (!authKey) {
                    api.headers['Authorization'] = latestToken;
                }
            });
        }
        
        senderApiList.unshift(...apis);
        alert('已添加到发包器列表顶部！');
        navButtons.sender.click();

        if (modal.style.display === 'block') {
            closeModal();
        }
    }

function renderScanResults(results) {
    scanResultsContainer.innerHTML = '';
    if (!results || Object.keys(results).length === 0) {
        scanResultsContainer.innerHTML = '<p>未发现任何敏感信息或有效资产。</p>';
        return;
    }

    const categoryTitles = {
        absoluteApis: 'API接口', apis: 'API接口 (base)',
        domains: '域名', jsFiles: 'JS文件', ips: 'IP地址',
        idKeys: '密钥ID', credentials: '账号 & 密码',
        phones: '手机号', emails: '邮箱地址', idcards: '身份证号',
        companies: '公司名称', urls: '其他URL', githubUrls: 'GitHub链接',
        jwts: 'JWT令牌', cookies: 'Cookie信息', vueFiles: 'Vue文件',
        imageFiles: '音视频图片', docFiles: '文档资源', moduleFiles: '模块文件',
        fingers: '技术指纹'
    };

    const listStyleCategories = ['githubUrls', 'vueFiles', 'docFiles', 'credentials', 'idKeys', 'cookies'];

    for (const category in results) {
        const items = results[category];
        if (items && items.length > 0) {
            const card = document.createElement('details');
            card.className = 'scan-category-card';
            card.open = true;

            const summary = document.createElement('summary');
            summary.className = 'scan-card-header';

            let actionButtons = `<button class="copy-btn" data-category="${category}">❐ 复制全部</button>`;
            if (category === 'absoluteApis' || category === 'apis') {
                actionButtons += `<button class="copy-btn" data-category="${category}" data-type="url">🔗 复制URL</button>`;
            }
            
            const title = categoryTitles[category] || category;
            
            summary.innerHTML = `
                <div class="summary-wrapper">
                    <div class="summary-title-group">
                        <span class="summary-arrow"></span>
                        <h3 class="scan-card-title">${title} <span>(${items.length})</span></h3>
                    </div>
                    <div class="scan-card-actions">${actionButtons}</div>
                </div>
            `;

            const contentContainer = document.createElement('div');
            contentContainer.className = 'scan-card-content';
            
            const isListStyle = listStyleCategories.includes(category);
            if (isListStyle) {
                contentContainer.classList.add('list-style');
            }

            items.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = isListStyle ? 'scan-item-list-item' : 'scan-item-tag';
                itemEl.textContent = item.value;
                contentContainer.appendChild(itemEl);
            });
            
            card.appendChild(summary);
            card.appendChild(contentContainer);
            scanResultsContainer.appendChild(card);
        }
    }
}

    scanSourcemapsBtn.addEventListener('click', () => {
        scanSourcemapsStatus.textContent = '开始扫描...';
        scanSourcemapsBtn.disabled = true;
        scanSourcemapsBtn.textContent = '扫描中...';

        chrome.runtime.sendMessage({ type: 'CHECK_SOURCEMAPS' }, (response) => {
            if (response && response.status === 'ok') {
                scanSourcemapsStatus.textContent = `扫描完成，共检查 ${response.checked} 个脚本。`;
            } else {
                scanSourcemapsStatus.textContent = `扫描失败: ${response.error || '未知错误'}`;
            }
            scanSourcemapsBtn.disabled = false;
            scanSourcemapsBtn.textContent = '重新扫描js.map是否存在';
            loadScripts(); 
        });
    });

     chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SCAN_PROGRESS') {
            scanStatus.textContent = message.text;
        } else if (message.type === 'SOURCEMAP_SCAN_PROGRESS') {
            scanSourcemapsStatus.textContent = message.text;
        }
        return true;
    });

    startScanBtn.addEventListener('click', () => {
        scanStatus.textContent = '扫描初始化...';
        scanResultsContainer.innerHTML = '';
        startScanBtn.disabled = true;
        startScanBtn.textContent = '扫描中...';
        
        chrome.runtime.sendMessage({ type: 'START_SCAN' }, (response) => {
            if (response && response.status === 'ok') {
                renderScanResults(response.results);
                scanStatus.textContent = `扫描完成！发现 ${Object.values(response.results).flat().length} 条信息。`;
            } else {
                scanStatus.textContent = `扫描失败: ${response.error || '未知错误'}`;
            }
            startScanBtn.disabled = false;
            startScanBtn.textContent = '重新扫描当前页面资产';
        });
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'SCAN_PROGRESS') {
            scanStatus.textContent = message.text;
        }
        return true;
    });

    const subdomainTargetsInput = document.getElementById('subdomain-targets-input');
    const saveSubdomainTargetsBtn = document.getElementById('save-subdomain-targets-btn');
    const collectedSubdomainsContainer = document.getElementById('collected-subdomains-container');
    const subdomainStatus = document.getElementById('subdomain-status');

    function loadSubdomainView() {
        chrome.runtime.sendMessage({ type: 'GET_SUBDOMAIN_TARGETS' }, (response) => {
            if (response) {
                subdomainTargetsInput.value = response;
            }
        });

        chrome.runtime.sendMessage({ type: 'GET_COLLECTED_SUBDOMAINS' }, (response) => {
            collectedSubdomainsContainer.innerHTML = '';
            if (response && response.length > 0) {
                collectedSubdomainsContainer.textContent = response.join('\n');
            } else {
                collectedSubdomainsContainer.textContent = '暂无记录。';
            }
        });
    }

    saveSubdomainTargetsBtn.addEventListener('click', () => {
        const targets = subdomainTargetsInput.value;
        chrome.runtime.sendMessage({ type: 'SAVE_SUBDOMAIN_TARGETS', targets }, () => {
            subdomainStatus.textContent = '保存成功!';
            setTimeout(() => { subdomainStatus.textContent = ''; }, 2000);
            loadSubdomainView();
        });
    });

    function loadRequests() {
    const API_DOC_PATTERNS = [
        '/api-docs', 'swagger.json', 'openapi.json', 
        'swagger.yaml', 'openapi.yaml', 'swagger.yml', 'openapi.yml',
        '/swagger/v1', '/swagger/ui', '/graphql'
    ];

    chrome.runtime.sendMessage({ type: 'GET_REQUESTS' }, (requests) => {
        requestsContainer.innerHTML = '';
        const requestsToRender = requests && Array.isArray(requests) ? [...requests] : [];

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url) {
                const currentUrl = tabs[0].url;

                const isApiDoc = API_DOC_PATTERNS.some(pattern => currentUrl.includes(pattern));

                if (isApiDoc) {
                    const alreadyExists = requestsToRender.some(req => req.url === currentUrl);
                    if (!alreadyExists) {
                        const apiDocRequest = {
                            id: `doc_${Date.now()}`,
                            url: currentUrl,
                            method: 'GET',
                            initiator: '直接访问 (Direct Navigation)',
                            payload: null,
                            isApiDefinition: true
                        };
                        requestsToRender.unshift(apiDocRequest);
                    }
                }
            }
            requestsToRender.forEach(renderRequest);
        });
    });
}

    function loadHistory() {
        chrome.runtime.sendMessage({ type: 'GET_HISTORY' }, (response) => {
            historyContainer.innerHTML = '';
            if (response && Array.isArray(response)) {
                loadedHistory = response;
                response.forEach(renderHistoryItem);
            }
        });
    }
    
    function loadSettings() {
        chrome.runtime.sendMessage({ type: 'GET_IGNORE_LIST' }, (response) => {
            ignoreListTextarea.value = response || '';
        });
        chrome.runtime.sendMessage({ type: 'GET_AI_SETTINGS' }, (settings) => {
            if (settings) {
                aiModelSelect.value = settings.selectedModel || 'gemini';
                aiModelSelect.dispatchEvent(new Event('change'));

                document.getElementById('api-key-input-gemini').value = settings.apiKeyGemini || '';
                document.getElementById('api-key-input-chatgpt').value = settings.apiKeyChatGpt || '';
                document.getElementById('api-key-input-deepseek').value = settings.apiKeyDeepSeek || '';
                document.getElementById('api-key-input-doubao').value = settings.apiKeyDoubao || '';
                chrome.storage.sync.get({ autoScanEnabled: false }, (settings) => {
        if (document.getElementById('auto-scan-checkbox')) {
            document.getElementById('auto-scan-checkbox').checked = settings.autoScanEnabled;
        }
    });

            }
        });
    }

    function openAnalysisModal(initiatorUrl, targetApiUrl = null) {
    if (!initiatorUrl) {
        alert('来源不确定或不是一个有效的URL，无法直接分析。');
        return;
    }

    scriptContentEl.innerHTML = '正在加载文件内容...';
    openModal();

    document.getElementById('js-analysis-buttons').style.display = 'block';
    document.getElementById('openapi-analysis-buttons').style.display = 'none';

    chrome.runtime.sendMessage({ type: 'GET_SCRIPT_CONTENT', url: initiatorUrl }, (response) => {
        if (response && response.status === 'ok') {
            currentScriptContent = response.content;
            currentTargetUrl = targetApiUrl || initiatorUrl;

            let displayContent = response.content;
            if (displayContent.length > MAX_DISPLAY_LENGTH) {
                displayContent = displayContent.substring(0, MAX_DISPLAY_LENGTH) + '\n\n... (内容过长，已截断显示)';
            }

            let formattedCode = escapeHtml(displayContent);
            if (targetApiUrl) {
                formattedCode = formattedCode.replace(/;/g, ';\n').replace(/{/g, '{\n').replace(/}/g, '}\n');
                const urlToHighlight = targetApiUrl.split('?')[0];
                const safeUrl = urlToHighlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(safeUrl, 'g');
                formattedCode = formattedCode.replace(regex, `<span class="highlight">${escapeHtml(urlToHighlight)}</span>`);
            }

            scriptContentEl.innerHTML = formattedCode;

            aiButtonsContainer.style.display = 'block';
            customAiQueryContainer.style.display = 'block';
        } else {
            scriptContentEl.textContent = `加载失败: ${response.content}`;
        }
    });
}

    function renderRequest(data) {
    const item = document.createElement('div');
    item.className = 'request-item';

    const urlEl = document.createElement('div');
    urlEl.className = 'url';

    if (data.isApiDefinition) {
        urlEl.textContent = `[API Definition] ${data.url}`;
        urlEl.style.fontWeight = 'bold';
        urlEl.style.color = 'var(--accent-blue)';
    } else {
        urlEl.textContent = `[${data.method}] ${data.url}`;
    }
    item.appendChild(urlEl);

    const initiatorEl = document.createElement('div');
    initiatorEl.className = 'initiator';
    initiatorEl.id = `initiator-${data.id}`;
    initiatorEl.textContent = `来源: ${data.initiator}`;
    item.appendChild(initiatorEl);

    if (!data.isApiDefinition && data.payload !== null && data.payload !== undefined) {
        const payloadTitle = document.createElement('h4');
        payloadTitle.textContent = '请求体 (Payload):';
        item.appendChild(payloadTitle);
        const payloadEl = document.createElement('pre');
        payloadEl.textContent = JSON.stringify(data.payload, null, 2);
        item.appendChild(payloadEl);
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px';

    const analyzeBtn = document.createElement('button');
    analyzeBtn.textContent = data.isApiDefinition ? '分析此API接口文档' : '分析来源JS';
    analyzeBtn.onclick = () => {
        const initiatorUrl = (() => {
            if (data.isApiDefinition) return data.url;
            const currentInitiatorText = document.getElementById(`initiator-${data.id}`).textContent;
            const initiatorUrlMatch = currentInitiatorText.match(/https?:\/\/.+/);
            return initiatorUrlMatch ? initiatorUrlMatch[0].replace(')','') : null;
        })();

        openAnalysisModal(initiatorUrl, data.url);

        if (data.isApiDefinition) {
             setTimeout(() => {
                document.getElementById('js-analysis-buttons').style.display = 'none';
                document.getElementById('openapi-analysis-buttons').style.display = 'block';
            }, 100);
        }
    };
    buttonContainer.appendChild(analyzeBtn);

    if (!data.isApiDefinition) {
        const sendToSenderBtn = document.createElement('button');
        sendToSenderBtn.textContent = '发送到发包器';
        sendToSenderBtn.style.marginLeft = "8px";
        sendToSenderBtn.onclick = () => {
            const apiData = { url: data.url, method: data.method, headers: data.headers || {}, body: data.payload ? JSON.stringify(data.payload, null, 2) : '' };
            addApisToSenderList([apiData]);
        };
        buttonContainer.appendChild(sendToSenderBtn);

        const searchBtn = document.createElement('button');
        searchBtn.textContent = '强制搜索来源';
        searchBtn.className = 'search-source-btn';
        searchBtn.dataset.requestId = data.id;
        searchBtn.dataset.apiUrl = data.url;
        searchBtn.style.marginLeft = "8px";
        buttonContainer.appendChild(searchBtn);
    }

    item.appendChild(buttonContainer);
    requestsContainer.append(item);
}
    
requestsContainer.addEventListener('click', (event) => {
    if (!event.target.classList.contains('search-source-btn')) return;
    
    const button = event.target;
    const { requestId, apiUrl } = button.dataset;
    const initiatorEl = document.getElementById(`initiator-${requestId}`);
    
    if (!initiatorEl) return;
    
    const originalText = initiatorEl.textContent;
    initiatorEl.textContent = '来源: 正在所有脚本中搜索，请稍候...';
    button.disabled = true;

    chrome.runtime.sendMessage({ type: 'SEARCH_SCRIPT_SOURCE', apiUrl }, (response) => {
        if (!response) {
            initiatorEl.textContent = `来源: 搜索失败 (后台无响应)`;
            button.disabled = false;
            return;
        }

        if (response.status === 'ok') {
            initiatorEl.textContent = `来源: ${response.source}`;
        } else {
            initiatorEl.textContent = `来源: (搜索失败) ${response.error}`;
            setTimeout(() => {
                if (initiatorEl.textContent.includes('搜索失败')) {
                   initiatorEl.textContent = originalText;
                }
            }, 3000);
        }
        button.disabled = false;
    });
});

    function renderHistoryItem(item) {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="url">${item.type} on ${item.url}</div>
            <div class="history-meta">${item.timestamp}</div>
            <button class="send-to-sender-btn" data-history-id="${item.id}">发送全部到发包器</button>
            <button class="history-copy-btn" data-history-id="${item.id}">复制结果</button>
            <details>
                <summary>查看/隐藏 AI分析结果</summary>
                <pre>${escapeHtml(item.result)}</pre>
            </details>
        `;
        historyContainer.appendChild(historyItem);
    }
    
    function parseAllApis(aiText) {
        const apis = [];
        const blocks = aiText.split('---');
        const urlRegex = /(?:\*\*URL\*\*):\s*`?([^`\s]+)`?/i;
        const methodRegex = /(?:\*\*Method\*\*):\s*`?(\w+)/i;
        const bodyRegex = /```json\n([\s\S]*?)\n```/;
        for (const block of blocks) {
            if (block.trim() === '') continue;
            const urlMatch = block.match(urlRegex);
            const methodMatch = block.match(methodRegex);
            const bodyMatch = block.match(bodyRegex);
            if (urlMatch && bodyMatch) {
                apis.push({
                    url: urlMatch[1].trim(),
                    method: methodMatch ? methodMatch[1].trim().toUpperCase() : 'POST',
                    body: bodyMatch[1].trim(),
                    headers: {}
                });
            }
        }
        return apis;
    }
    
    function renderSenderList(apisToRender) {
        senderListContainer.innerHTML = '';
        apisToRender.forEach((api) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'sender-item';
            const headersValue = (api.headers && Object.keys(api.headers).length > 0)
                ? escapeHtml(JSON.stringify(api.headers, null, 2))
                : '';

            itemDiv.innerHTML = `
                <div class="sender-grid">
                    <label>Method:</label>
                    <input type="text" class="sender-method-input" value="${escapeHtml(api.method)}">
                    <label>URL:</label>
                    <input type="text" class="sender-url-input" style="width: 98%;" value="${escapeHtml(api.url)}">
                    <label>Headers:</label>
                    <textarea class="sender-headers-textarea" style="height: 80px;" placeholder='请输入JSON格式的Headers'>${headersValue}</textarea>
                    <label>Body:</label>
                    <textarea class="sender-body-textarea" style="height: 150px;">${escapeHtml(api.body)}</textarea>
                </div>
                <button class="sender-item-send-btn">发送请求</button>
                <hr>
                <h4>响应:</h4>
                <pre class="sender-response-pre"></pre>
            `;
            senderListContainer.appendChild(itemDiv);
        });
    }

    function openModal() { modal.style.display = 'block'; }
    function closeModal() {
        modal.style.display = 'none';
        aiButtonsContainer.style.display = 'none';
        aiResultContainer.style.display = 'none';
        customAiQueryContainer.style.display = 'none';
        customAiInput.value = '';
        scriptContentEl.textContent = '';
        aiResultEl.textContent = '';
        currentScriptContent = '';
        currentTargetUrl = '';
        fullAiAnalysisResult = '';
    }
    closeBtn.onclick = closeModal;
    window.onclick = function(event) { if (event.target == modal) closeModal(); }
    
    aiButtonsContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            const analysisType = event.target.dataset.type;
            aiResultContainer.style.display = 'block';
            aiResultTitle.textContent = 'AI 分析结果:';
            aiResultEl.textContent = `AI正在分析中 (${event.target.textContent})...`;
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const currentPageUrl = tabs[0] ? tabs[0].url : window.location.href;
                chrome.runtime.sendMessage({
                    type: 'ANALYZE_SCRIPT',
                    analysisType: analysisType,
                    scriptContent: currentScriptContent,
                    targetUrl: currentTargetUrl,
                    pageUrl: currentPageUrl
                }, (aiResponse) => {
                    if (aiResponse && aiResponse.status === 'ok') {
                        fullAiAnalysisResult = aiResponse.analysis;
                        aiResultEl.textContent = aiResponse.analysis;
                    } else {
                        aiResultEl.textContent = `AI分析失败: ${aiResponse.error}`;
                    }
                });
            });
        }
    });

    const modalContent = document.querySelector('.modal-content');

modalContent.addEventListener('click', (event) => {
    if (event.target.id === 'btn-unauthorized-test') {
        
        aiResultContainer.style.display = 'block';
        aiResultTitle.textContent = '未授权访问测试结果:';
        aiResultEl.textContent = '正在准备测试环境，请稍候...';

        if (!currentScriptContent) {
            aiResultEl.textContent = '错误：无法获取API文档内容，请重新打开此窗口。';
            return;
        }

        chrome.runtime.sendMessage({
            type: 'TEST_UNAUTHORIZED_ACCESS',
            apiDocContent: currentScriptContent, 
            baseUrl: currentTargetUrl       
        }, (response) => {
            if (response && response.status === 'ok') {
                aiResultEl.textContent = response.results;
                fullAiAnalysisResult = response.results;
            } else {
                aiResultEl.textContent = `测试失败: ${response.error || '未知错误'}`;
            }
        });
    }
});


    sendCustomAiBtn.addEventListener('click', () => {
        const customQuery = customAiInput.value.trim();
        if (!customQuery) {
            alert('请输入您的问题或要分析的代码片段。');
            return;
        }
        aiResultContainer.style.display = 'block';
        aiResultTitle.textContent = 'AI 分析结果:';
        aiResultEl.textContent = 'AI正在分析您的自定义请求...';
        chrome.runtime.sendMessage({
            type: 'CUSTOM_ANALYZE',
            customQuery: customQuery,
            scriptContent: currentScriptContent,
            targetUrl: currentTargetUrl
        }, (aiResponse) => {
            if (aiResponse && aiResponse.status === 'ok') {
                fullAiAnalysisResult = aiResponse.analysis;
                aiResultEl.textContent = aiResponse.analysis;
            } else {
                aiResultEl.textContent = `AI分析失败: ${aiResponse.error}`;
            }
        });
    });

    copyAiResultBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(fullAiAnalysisResult).then(() => {
            copyAiResultBtn.textContent = '复制成功!';
            setTimeout(() => { copyAiResultBtn.textContent = '复制完整结果'; }, 2000);
        });
    });

    aiResultContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('send-to-sender-btn')) {
            const apis = parseAllApis(fullAiAnalysisResult);
            addApisToSenderList(apis);
        }
    });

    historyContainer.addEventListener('click', (event) => {
        const button = event.target;
        if (!button.dataset.historyId) return;
        const itemId = Number(button.dataset.historyId);
        const historyItem = loadedHistory.find(h => h.id === itemId);
        if (!historyItem) return;
        if (button.classList.contains('send-to-sender-btn')) {
            const apis = parseAllApis(historyItem.result);
            addApisToSenderList(apis);
        } else if (button.classList.contains('history-copy-btn')) {
            navigator.clipboard.writeText(historyItem.result).then(() => {
                button.textContent = '复制成功!';
                setTimeout(() => { button.textContent = '复制结果'; }, 2000);
            });
        }
    });

    async function sendSingleRequest(senderItem) {
        if (!senderItem) return;

        let url = senderItem.querySelector('.sender-url-input').value;
        const method = senderItem.querySelector('.sender-method-input').value.toUpperCase();
        const body = senderItem.querySelector('.sender-body-textarea').value;
        const headersText = senderItem.querySelector('.sender-headers-textarea').value;
        const responsePre = senderItem.querySelector('.sender-response-pre');
        const sendButton = senderItem.querySelector('.sender-item-send-btn');

        if (!url) {
            responsePre.textContent = '错误: URL不能为空。';
            return;
        }
        
        // 确保URL是完整的
        if (url.startsWith('/')) {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0] || !tabs[0].url) {
                responsePre.textContent = '错误: 无法获取当前标签页URL来补全请求地址。';
                return;
            }
            const pageOrigin = new URL(tabs[0].url).origin;
            url = pageOrigin + url;
        }

        let headers = {};
        if (headersText.trim()) {
            try {
                headers = JSON.parse(headersText);
            } catch (e) {
                responsePre.textContent = '错误: Headers不是有效的JSON格式。';
                return;
            }
        }

        const options = { method, headers };
        if (method !== 'GET' && method !== 'HEAD') {
            try {
                if (body.trim()) {
                    options.body = JSON.stringify(JSON.parse(body));
                    const contentTypeKey = Object.keys(headers).find(k => k.toLowerCase() === 'content-type');
                    if (!contentTypeKey) {
                        headers['Content-Type'] = 'application/json';
                    }
                }
            } catch (e) {
                responsePre.textContent = '错误: 请求体不是有效的JSON格式。';
                return;
            }
        }
        
        responsePre.textContent = '请求发送中...';
        if (sendButton) sendButton.disabled = true;

        return new Promise(resolve => {
            chrome.runtime.sendMessage({ type: 'SEND_API_REQUEST', data: { url, options } }, (response) => {
                if (response.status === 'ok') {
                    responsePre.textContent = typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data;
                } else {
                    responsePre.textContent = `请求失败: ${response.error}`;
                }
                if (sendButton) sendButton.disabled = false;
                resolve(); // 请求完成，Promise解决
            });
        });
    }

    sendAllRequestsBtn.addEventListener('click', async () => {
        const senderItems = senderListContainer.querySelectorAll('.sender-item');
        if (senderItems.length === 0) {
            senderAllStatus.textContent = '列表为空。';
            return;
        }

        sendAllRequestsBtn.disabled = true;
        sendAllRequestsBtn.textContent = '请求中...';
        
        let count = 0;
        // 使用 for...of 循环配合 await 来确保请求按顺序一个一个发送
        for (const item of senderItems) {
            count++;
            senderAllStatus.textContent = `正在发送第 ${count} / ${senderItems.length} 个请求...`;
            await sendSingleRequest(item);
            // 可以在每个请求后加入短暂延迟，防止请求过快
            if (count < senderItems.length) {
                await new Promise(resolve => setTimeout(resolve, 200)); // 延迟200毫秒
            }
        }

        senderAllStatus.textContent = `全部 ${senderItems.length} 个请求已发送完毕！`;
        sendAllRequestsBtn.disabled = false;
        sendAllRequestsBtn.textContent = '一键请求全部';
    });

    // 单个发送按钮的事件监听（现在它只调用新函数）
    senderListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('sender-item-send-btn')) {
            const senderItem = event.target.closest('.sender-item');
            sendSingleRequest(senderItem);
        }
    });
    
    senderSearchInput.addEventListener('input', () => {
        const searchTerm = senderSearchInput.value.toLowerCase().trim();
        if (!searchTerm) {
            renderSenderList(senderApiList);
            return;
        }
        const filteredList = senderApiList.filter(api => 
            api.url.toLowerCase().includes(searchTerm) ||
            api.method.toLowerCase().includes(searchTerm)
        );
        renderSenderList(filteredList);
    });

    clearSenderListBtn.addEventListener('click', () => {
        senderApiList = [];
        senderSearchInput.value = '';
        renderSenderList(senderApiList);
    });

    clearRequestsBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_REQUESTS' }, () => {
            loadRequests();
        });
    });

    clearHistoryBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ type: 'CLEAR_HISTORY' }, () => {
            loadHistory();
        });
    });

    saveSettingsBtn.addEventListener('click', () => {
        const ignoreList = ignoreListTextarea.value;
        chrome.runtime.sendMessage({ type: 'SAVE_IGNORE_LIST', ignoreList });

        const settings = {
            selectedModel: aiModelSelect.value,
            apiKeyGemini: document.getElementById('api-key-input-gemini').value.trim(),
            apiKeyChatGpt: document.getElementById('api-key-input-chatgpt').value.trim(),
            apiKeyDeepSeek: document.getElementById('api-key-input-deepseek').value.trim(),
            apiKeyDoubao: document.getElementById('api-key-input-doubao').value.trim()
        };

        chrome.runtime.sendMessage({ type: 'SAVE_AI_SETTINGS', settings }, () => {
            settingsStatus.textContent = '保存成功!';
            setTimeout(() => { settingsStatus.textContent = ''; }, 2000);
            const autoScanEnabled = document.getElementById('auto-scan-checkbox').checked;
    settings.autoScanEnabled = autoScanEnabled; 

    chrome.runtime.sendMessage({ type: 'SAVE_AI_SETTINGS', settings }, () => {
        settingsStatus.textContent = '保存成功!';
        setTimeout(() => { settingsStatus.textContent = ''; }, 2000);
    });

        });
    });

    requestsContainer.addEventListener('click', (event) => {
        if (!event.target.classList.contains('search-source-btn')) return;
        
        const button = event.target;
        const { requestId, apiUrl } = button.dataset;
        const initiatorEl = document.getElementById(`initiator-${requestId}`);
        
        if (!initiatorEl) return;
        
        const originalText = initiatorEl.textContent;
        initiatorEl.textContent = '来源: 正在所有脚本中搜索，请稍候...';
        button.disabled = true;

        chrome.runtime.sendMessage({ type: 'SEARCH_SCRIPT_SOURCE', apiUrl }, (response) => {
            if (!response) {
                initiatorEl.textContent = `来源: 搜索失败 (后台无响应)`;
                button.disabled = false;
                return;
            }

            if (response.status === 'ok') {
                initiatorEl.textContent = `来源: ${response.source}`;
            } else {
                initiatorEl.textContent = `来源: (搜索失败) ${response.error}`;
                setTimeout(() => {
                    if (initiatorEl.textContent.includes('搜索失败')) {
                       initiatorEl.textContent = originalText;
                    }
                }, 3000);
            }
            button.disabled = false;
        });
    });
    function loadScripts() {
        scriptsContainer.innerHTML = '正在加载脚本列表...';
        chrome.runtime.sendMessage({ type: 'GET_LOADED_SCRIPTS' }, (response) => {
            scriptsContainer.innerHTML = '';
            if (response && Array.isArray(response) && response.length > 0) {
                let foundCount = 0;
                response.forEach(script => {
                    renderScriptItem(script);
                    if (script.hasSourceMap) {
                        foundCount++;
                    }
                });
                scanSourcemapsStatus.textContent = `在 ${response.length} 个脚本中发现 ${foundCount} 个js.map。`;
            } else {
                scriptsContainer.innerHTML = '<p>未能加载脚本列表或当前页面没有加载脚本。</p>';
                scanSourcemapsStatus.textContent = '';
            }
        });
    }

function renderScriptItem(script) { 
        const item = document.createElement('div');
        item.className = 'request-item';
        item.style.padding = '12px';

        const urlEl = document.createElement('div');
        urlEl.className = 'url';
        urlEl.style.wordBreak = 'break-all';
        urlEl.textContent = escapeHtml(script.url);
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '10px';

        const analyzeBtn = document.createElement('button');
        analyzeBtn.textContent = '分析此JS';
        analyzeBtn.className = 'analyze-script-btn';
        analyzeBtn.dataset.scriptUrl = script.url;
        buttonContainer.appendChild(analyzeBtn);

        if (script.hasSourceMap) {
            const sourcemapBtn = document.createElement('button');
            sourcemapBtn.textContent = '使用jsmap_inspector查看js.map';
            sourcemapBtn.style.marginLeft = "8px";
            sourcemapBtn.className = 'view-sourcemap-btn';
            sourcemapBtn.dataset.scriptUrl = script.url;
            buttonContainer.appendChild(sourcemapBtn);
        }
        
        item.appendChild(urlEl);
        item.appendChild(buttonContainer);
        
        scriptsContainer.appendChild(item);
    }
    
    scriptsContainer.addEventListener('click', (event) => {
    const target = event.target;
    const scriptUrl = target.dataset.scriptUrl;

    if (target.classList.contains('view-sourcemap-btn')) {
        const originalText = target.textContent;
        target.textContent = '加载中...';
        target.disabled = true;

        chrome.runtime.sendMessage({ type: 'FETCH_AND_SHOW_SOURCEMAP', url: scriptUrl }, (response) => {
            if (response && response.status === 'ok') {
            } else {
                alert(`加载js.map失败！\n\n原因: ${response ? response.error : '未知错误，请检查开发者工具控制台。'}`);
            }
            target.textContent = originalText;
            target.disabled = false;
        });
    } else if (target.classList.contains('analyze-script-btn')) {
        openAnalysisModal(scriptUrl, null);
    }
});
const batchOpenUrlsBtn = document.getElementById('batch-open-urls-btn');
    const batchOpenUrlsTextarea = document.getElementById('batch-open-urls-textarea');
    const batchOpenStatus = document.getElementById('batch-open-status');

    batchOpenUrlsBtn.addEventListener('click', () => {
        const urlsToOpen = batchOpenUrlsTextarea.value.trim().split('\n');
        let openedCount = 0;

        urlsToOpen.forEach(line => {
            let url = line.trim();
            if (url) {
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                
                chrome.tabs.create({ url: url, active: false });
                openedCount++;
            }
        });

        if (openedCount > 0) {
            batchOpenStatus.textContent = `成功打开 ${openedCount} 个页面!`;
            setTimeout(() => { batchOpenStatus.textContent = ''; }, 3000);
        }
    });
    const statusEl = document.getElementById('enhancement-status');

    function executePageScript(func, successMessage) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0] || !tabs[0].id) {
                statusEl.textContent = '错误: 无法获取当前标签页!';
                return;
            }
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: func
            }, (injectionResults) => {
                if (chrome.runtime.lastError) {
                    statusEl.textContent = `错误: ${chrome.runtime.lastError.message}`;
                } else if (injectionResults && injectionResults[0] && injectionResults[0].result !== undefined) {
                    const count = injectionResults[0].result;
                    statusEl.textContent = `${successMessage} (影响了 ${count} 个目标)`;
                }
                setTimeout(() => { statusEl.textContent = ''; }, 3000);
            });
        });
    }


    function revealElementsFunc() {
        let count = 0;
        document.querySelectorAll('body *').forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
                el.style.setProperty('display', 'revert', 'important');
                el.style.setProperty('visibility', 'visible', 'important');
                el.style.setProperty('opacity', '1', 'important');
                count++;
            }
        });
        return count; 
    }

    function enableInputsFunc() {
        const elements = document.querySelectorAll('[disabled], [readonly]');
        elements.forEach(el => {
            el.removeAttribute('disabled');
            el.removeAttribute('readonly');
        });
        return elements.length; 
    }

    function restoreInteractionsFunc() {
        ['contextmenu', 'copy', 'cut', 'paste'].forEach(eventName => {
            document.addEventListener(eventName, e => e.stopPropagation(), true);
        });
        document.querySelectorAll('*').forEach(el => {
            el.style.setProperty('user-select', 'auto', 'important');
            el.style.setProperty('-webkit-user-select', 'auto', 'important');
        });
        return '文本选择及4类事件'; 
    }

    function removeOverlaysFunc() {
        let count = 0;
        document.querySelectorAll('body *').forEach(el => {
            try {
                const style = window.getComputedStyle(el);
                if ((style.position === 'fixed' || style.position === 'absolute') &&
                    parseInt(style.zIndex, 10) > 1000 &&
                    (parseInt(style.width, 10) >= window.innerWidth * 0.8 || parseInt(style.height, 10) >= window.innerHeight * 0.8)
                   ) {
                    el.style.setProperty('display', 'none', 'important');
                    count++;
                }
            } catch (e) { /* 忽略错误 */ }
        });
        return count;
    }

    document.getElementById('btn-reveal-elements').addEventListener('click', () => {
        executePageScript(revealElementsFunc, '显示元素成功');
    });

    document.getElementById('btn-enable-inputs').addEventListener('click', () => {
        executePageScript(enableInputsFunc, '启用输入项成功');
    });

    document.getElementById('btn-restore-interactions').addEventListener('click', () => {
        executePageScript(restoreInteractionsFunc, '交互限制已解除');
    });

    document.getElementById('btn-remove-overlays').addEventListener('click', () => {
        executePageScript(removeOverlaysFunc, '移除遮罩成功');
    });
    loadTitleFetchHistory();
    loadRequests();
});