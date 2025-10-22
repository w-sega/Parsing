let tempSourceMapData = null;
try {
    importScripts('/js/scanner.config.js', '/js/scanner.filter.js');
} catch (e) {
    console.error("【Parsing】加载扫描器脚本失败:", e);
}

const cachedScanResults = new Map();

function isHostMatch(hostname, pattern) {
    if (pattern.startsWith('*.')) {
        const baseDomain = pattern.substring(2);
        return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`);
    }
    return hostname === pattern;
}

chrome.webRequest.onCompleted.addListener(
    (details) => {
        if (details.type === 'script' && details.statusCode < 400) {
            const tabId = details.tabId;
            if (tabId > 0) {
                const storageKey = `jsList_${tabId}`;
                chrome.storage.session.get({ [storageKey]: [] }, (data) => {
                    const scripts = data[storageKey];
                    const scriptSet = new Set(scripts);
                    scriptSet.add(details.url);
                    const updatedScripts = Array.from(scriptSet);
                    chrome.storage.session.set({ [storageKey]: updatedScripts });
                });
            }
        }
    },
    {
        urls: ["<all_urls>"],
        types: ["script"]
    }
);

chrome.tabs.onRemoved.addListener((tabId) => {
    cachedScanResults.delete(tabId);
    chrome.storage.local.remove(`scanResult_${tabId}`);
    chrome.storage.session.remove(`jsList_${tabId}`);
    chrome.storage.session.remove(`requestsLog_${tabId}`);
});

async function _callGemini(prompt, apiKey) {
    if (!apiKey) {
        return { status: 'error', error: 'API密钥未设置。请在插件设置页面输入您的Gemini API密钥。' };
    }
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const result = await response.json();
        const analysisText = result.candidates[0].content.parts[0].text;
        return { status: 'ok', analysis: analysisText };
    } catch (error) {
    }
}

async function _callOpenAICompatibleApi(prompt, apiKey, apiUrl, modelName) {
    if (!apiKey) {
        return { status: 'error', error: `该模型 (${modelName}) 的API密钥未设置。` };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelName,
                messages: [{ "role": "user", "content": prompt }],
                stream: false
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API请求失败，状态码: ${response.status}. 响应: ${errorBody}`);
        }

        const result = await response.json();
        const analysisText = result.choices[0].message.content;
        return { status: 'ok', analysis: analysisText };

    } catch (error) {
        console.error(`${modelName} API 调用时发生错误:`, error);
        return { status: 'error', error: error.message };
    }
}

function _callChatGpt(prompt, apiKey) {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const modelName = 'gpt-4o-mini';
    return _callOpenAICompatibleApi(prompt, apiKey, apiUrl, modelName);
}

function _callDeepSeek(prompt, apiKey) {
    const apiUrl = 'https://api.deepseek.com/chat/completions';
    const modelName = 'deepseek-chat';
    return _callOpenAICompatibleApi(prompt, apiKey, apiUrl, modelName);
}

function _callDoubao(prompt, apiKey) {
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    const modelName = 'Doubao-pro-4k';
    return _callOpenAICompatibleApi(prompt, apiKey, apiUrl, modelName);
}


function getCustomAnalysisPrompt(customQuery, scriptContent) {
    return `你是一位顶级的JavaScript代码审查和逆向工程专家。你的任务是基于下面提供的“JS代码上下文”，来回答用户的“自定义问题”。请直接、清晰、准确地回答问题。

**JS代码上下文:**
\`\`\`javascript
${scriptContent}
\`\`\`

---

**用户的自定义问题:**
"${customQuery}"
`;
}

function getAnalysisPrompt(analysisType, scriptContent, targetUrl, pageUrl, chunkNumber = 1, totalChunks = 1) {
    let chunkingPreamble = '';
    if (totalChunks > 1) {
        chunkingPreamble = `重要指令：这是一个非常长的JavaScript文件，已被分割成 ${totalChunks} 个部分进行分析。当前这是第 ${chunkNumber} 部分。请你只专注于分析当前提供给你的代码块，并直接输出这部分代码的分析结果。不要添加任何关于“这是部分代码”或者“信息不全”之类的开场白或结束语。直接开始分析即可。\n\n`;
    }
    
    switch (analysisType) {
        case 'openapi_all_apis':
            return `${chunkingPreamble}你是一位专业的API接口解析专家。你的任务是分析以下OpenAPI (Swagger) v2或v3的JSON文件内容，并从中提取出所有定义的API端点。
你必须严格遵守以下规则：
1.  **解析路径**: 遍历JSON中的 "paths" 对象。
2.  **提取信息**: 提取URL, Method (大写), 和说明 ("summary"或"description")。
3.  **输出格式**: 必须严格按照下面的Markdown格式输出，不得有任何偏差或增减。

---
**URL**: [这里是接口的路径]
**Method**: [这里是请求方法]
**说明**: [这里是接口的说明]
**参数 / 请求体**:
\`\`\`json
{
  // --- 关键指令 ---
  // 1. **最关键的规则：解析'$ref'引用。** 如果请求体使用了'$ref' (例如 "$ref": "#/definitions/UserDto")，你的首要任务是在同一个JSON文件中找到名为 "UserDto" 的定义。
  // 2. **禁止懒惰输出：** 绝对禁止直接输出引用的名称作为值，例如 \`{"body": "UserDto"}\` 或 \`{"$ref": "#/definitions/UserDto"}\` 都是完全错误的。
  // 3. **构建完整示例：** 你必须使用找到的 "UserDto" 定义中的 'properties' 字段来构建一个完整、详细的示例JSON。
  //
  // ****【重要示例】****
  // 如果API定义如下:
  //   "post": { "parameters": [{ "in": "body", "name": "body", "schema": { "$ref": "#/definitions/User" } }] }
  // 并且在文件的definitions中存在:
  //   "User": { "type": "object", "properties": { "name": { "type": "string" }, "email": { "type": "string" } } }
  //
  // 那么你的JSON输出块【必须】是这样:
  // {
  //   "name": "string",
  //   "email": "string"
  // }
  //
  // 4. 如果是GET请求或没有Body，则生成包含所有查询参数("in":"query")和路径参数("in":"path")的JSON对象。
  // 5. 不要使用 \` (反引号) 包裹URL和Method。
}
\`\`\`

请直接开始输出第一个符合要求的API信息。如果JSON内容中没有找到任何API路径，则回答“未在此API定义文件中找到任何有效的API端点。”。

OpenAPI/Swagger JSON 内容:
\`\`\`json
${scriptContent}
\`\`\``;
        case 'all_apis':
            return `${chunkingPreamble}你是一位顶级的JavaScript逆向工程专家。你的唯一任务是分析以下JS代码，并找出其中所有**发起HTTP网络请求**的API调用。
你必须严格遵守以下规则：
1.  **只关注网络请求**：你的目标是寻找使用了 \`fetch\`、\`XMLHttpRequest\`、\`axios\` 或其他HTTP客户端库发起的真实网络请求。
2.  **忽略普通函数**：如果代码只是定义了一个普通的JavaScript函数、类或模块，而它本身没有发起网络请求，你必须**忽略它**。
3.  **提取关键信息**：对于你找到的每一个网络请求，都必须严格按照以下Markdown格式进行输出，不得有任何遗漏：

---
**URL**: \`[这里是接口的URL或URL模板]\`
**Method**: \`[这里是请求方法，如POST, GET等]\`
**说明**: \`[这里是对这个网络请求用途的简要中文说明]\`
**请求体 (Body)**:
\`\`\`json
{
  "key1": "value_type or null",
  "key2": "value_type or null"
}
\`\`\`

请直接开始输出第一个符合要求的网络请求信息。如果没有在代码块中找到任何网络请求，则回答“在当前代码块中未找到任何HTTP网络请求。”。

JavaScript 代码块:
\`\`\`javascript
${scriptContent}
\`\`\``;
        case 'encryption':
            return `${chunkingPreamble}你是一位网络安全专家，擅长流量分析。请审查以下JS代码。你的任务是: 1. 寻找任何在发送网络请求前对数据进行加密、混淆或复杂编码的逻辑。 2. 重点关注常见的加密库（如CryptoJS）或自定义的加密函数（如MD5, SHA, Base64, AES等）。 3. 如果找到，请指出是哪个函数负责加密，并提供相关代码片段。 4. 详细解释数据是如何被转换的。 5. 如果未发现加密逻辑，请明确指出请求是明文发送的。\n\nJavaScript 代码:\n\`\`\`javascript\n${scriptContent}\n\`\`\``;
        case 'xss':
            return `${chunkingPreamble}你是一位前端安全专家。请审计以下JS代码是否存在XSS（跨站脚本）漏洞风险。你的任务是: 1. 检查代码中将数据插入到DOM的所有位置。 2. 特别关注使用 .innerHTML, document.write(), 或不安全的jQuery方法（如 .html()）的地方。 3. 判断这些操作的数据源是否可能来自用户输入或API响应，并且是否经过了充分的净化（Sanitization）。 4. 对每个发现的潜在风险点，提供代码片段，解释为何存在风险，并给出修复建议（例如，使用 .textContent）。\n\nJavaScript 代码:\n\`\`\`javascript\n${scriptContent}\n\`\`\``;
        case 'permissions':
            return `${chunkingPreamble}你是一位经验丰富的Web应用架构师。用户当前正在 "${pageUrl}" 页面。你的任务是，基于以下JS代码中出现的API接口（例如 /api/login, /api/admin/config 等），推断并分析要完整使用此页面功能，可能需要什么样的用户权限或前提条件。例如：- 是否需要登录？ - 是否有区分普通用户和管理员的接口 (e.g., usertype:admin)？ - 是否依赖于特定的第三方服务认证？请给出你的专业分析。\n\nJavaScript 代码:\n\`\`\`javascript\n${scriptContent}\n\`\`\``;
        default:
            return `${chunkingPreamble}你是一位顶级的JavaScript逆向工程专家。请分析以下被压缩和混淆的JavaScript代码。用户的目标是理解与URL "${targetUrl}" 相关的API请求。你的任务是： 1. 在代码中定位到发起此API请求的函数。 2. 详细分析该函数在被调用时，传递给它的参数对象是如何被构建的。 3. 推断出这个参数对象所有可能的字段及其数据类型。 4. 基于你的分析，提供一个结构完整、字段齐全的示例JSON请求体。 5. 对关键参数字段的用途进行简要说明。\n\nJavaScript 代码:\n\`\`\`javascript\n${scriptContent}\n\`\`\``;
    }
}

async function analyzeScriptWithAI(analysisType, scriptContent, targetUrl, pageUrl) {
    if (analysisType === 'openapi_all_apis') {
        console.log("OpenAPI analysis detected. Bypassing chunking.");
        const prompt = getAnalysisPrompt(analysisType, scriptContent, targetUrl, pageUrl);
        return await callAiApi(prompt);
    }

    const CHUNK_SIZE = 30000;
    
    if (scriptContent.length <= CHUNK_SIZE) {
        const prompt = getAnalysisPrompt(analysisType, scriptContent, targetUrl, pageUrl);
        return await callAiApi(prompt);
    }

    const chunks = [];
    for (let i = 0; i < scriptContent.length; i += CHUNK_SIZE) {
        chunks.push(scriptContent.substring(i, i + CHUNK_SIZE));
    }
    
    const totalChunks = chunks.length;
    let combinedAnalysis = `[系统提示] 检测到JS文件过长，已自动分割为 ${totalChunks} 块进行分析。\n\n`;
    
    for (let i = 0; i < totalChunks; i++) {
        if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        const chunk = chunks[i];
        const chunkNumber = i + 1;
        const prompt = getAnalysisPrompt(analysisType, chunk, targetUrl, pageUrl, chunkNumber, totalChunks);
        const result = await callAiApi(prompt);
        combinedAnalysis += `--- 第 ${chunkNumber}/${totalChunks} 块分析结果 ---\n\n`;
        if (result.status === 'ok') {
            combinedAnalysis += result.analysis + '\n\n';
        } else {
            combinedAnalysis += `分析失败: ${result.error}\n\n`;
        }
    }
    
    return { status: 'ok', analysis: combinedAnalysis };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'BATCH_FETCH_TITLES':
            (async () => {
                const results = await batchFetchTitles(message.targets);
                sendResponse(results);
            })();
            return true;

        case 'TEST_UNAUTHORIZED_ACCESS':
    (async () => {
        try {
            const { apiDocContent, baseUrl } = message;
            const apiDoc = JSON.parse(apiDocContent);
            const report = await runUnauthorizedAccessTest(apiDoc, baseUrl);
            const historyEntry = {
                id: Date.now(),
                url: baseUrl,
                type: '一键未授权访问测试',
                result: report,
                status: 'ok',
                timestamp: new Date().toLocaleString()
            };
            
            const data = await chrome.storage.local.get({ aiHistory: [] });
            const newHistory = [historyEntry, ...data.aiHistory];
            await chrome.storage.local.set({ aiHistory: newHistory });

            sendResponse({ status: 'ok', results: report });

        } catch (error) {
            console.error("未授权测试时发生错误:", error);
            sendResponse({ status: 'error', error: error.message });
        }
    })();
    return true;

        case 'CHECK_SOURCEMAPS':
    (async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0] || !tabs[0].id) {
            sendResponse({ status: 'error', error: '无法找到活动标签页。' });
            return;
        }
        const tabId = tabs[0].id;

        const sendProgress = (text) => {
            chrome.runtime.sendMessage({ type: 'SOURCEMAP_SCAN_PROGRESS', text })
                .catch(e => console.log("发送进度失败, popup可能已关闭"));
        };

        const jsListKey = `jsList_${tabId}`;
        const { [jsListKey]: scripts } = await chrome.storage.session.get({ [jsListKey]: [] });

        if (!scripts || scripts.length === 0) {
            sendResponse({ status: 'ok', checked: 0 });
            return;
        }

        const sourceMapStatus = {};
        let checkedCount = 0;
        const total = scripts.length;

        await Promise.all(scripts.map(async (scriptUrl) => {
            const mapUrl = scriptUrl + '.map';
            let exists = false;
            try {
                const checkResponse = await chrome.tabs.sendMessage(tabId, {
                    type: 'FETCH_FROM_PAGE_CONTEXT', 
                    url: mapUrl,
                    options: { method: 'HEAD' } 
                });
                
                if (checkResponse && checkResponse.status === 'ok') {
                    exists = true;
                }
            } catch (e) {
                console.warn(`检查 ${mapUrl} 时出错:`, e);
            }
            sourceMapStatus[scriptUrl] = exists;
            checkedCount++;
            sendProgress(`扫描中... (${checkedCount}/${total})`);
        }));

        const statusKey = `sourceMapStatus_${tabId}`;
        await chrome.storage.session.set({ [statusKey]: sourceMapStatus });
        sendResponse({ status: 'ok', checked: total });
    })();
    return true;

        case 'API_REQUEST':
            const tabId = sender.tab.id;
            if (!tabId) break; 

            const requestData = message.data;
            requestData.id = `req_${Date.now()}_${Math.random()}`;

            try {
                const url = new URL(requestData.url);
                if (url.pathname.endsWith('swagger.json') || url.pathname.includes('/api-docs')) {
                    requestData.isApiDefinition = true;
                }
            } catch (e) { }
            
            const storageKey = `requestsLog_${tabId}`;
            chrome.storage.session.get({ [storageKey]: [] }, (data) => {
                const currentLog = data[storageKey];
                const updatedLog = [requestData, ...currentLog];
                chrome.storage.session.set({ [storageKey]: updatedLog });
            });
            break;
            
        case 'GET_SOURCE_MAP_DATA':
    if (tempSourceMapData) {
        sendResponse({ status: 'ok', ...tempSourceMapData }); 
        tempSourceMapData = null;
    } else {
        sendResponse({ status: 'error', error: '未找到可用的Source Map数据。' });
    }
    break;

        case 'GET_REQUESTS':
            (async () => {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0) {
                    sendResponse([]);
                    return;
                }
                const activeTabId = tabs[0].id;
                const storageKey = `requestsLog_${activeTabId}`;
                chrome.storage.session.get({ [storageKey]: [] }, (data) => {
                    sendResponse(data[storageKey]);
                });
            })();
            return true; 
        
        case 'GET_AI_SETTINGS':
            chrome.storage.sync.get({
                selectedModel: 'gemini',
                apiKeyGemini: '',
                apiKeyChatGpt: '',
                apiKeyDeepSeek: '',
                apiKeyDoubao: ''
            }, (settings) => {
                sendResponse(settings);
            });
            return true;

        case 'SAVE_AI_SETTINGS':
            chrome.storage.sync.set(message.settings, () => {
                sendResponse({ status: 'ok' });
            });
            return true;

        case 'SAVE_SUBDOMAIN_TARGETS':
            (async () => {
                const newTargets = message.targets || '';
                await chrome.storage.sync.set({ subdomainTargets: newTargets });

                const targetDomains = newTargets.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

                const { collectedSubdomains = [] } = await chrome.storage.local.get({ collectedSubdomains: [] });

                if (collectedSubdomains.length > 0) {
                    const filteredSubdomains = collectedSubdomains.filter(subdomain => {
                        const subLower = subdomain.toLowerCase();
                        return targetDomains.some(target => {
                            return subLower !== target && subLower.endsWith('.' + target);
                        });
                    });

                    await chrome.storage.local.set({ collectedSubdomains: filteredSubdomains });
                }
                
                sendResponse({ status: 'ok' });
            })();
            return true;

        case 'GET_SUBDOMAIN_TARGETS':
            chrome.storage.sync.get({ subdomainTargets: '' }, (data) => {
                sendResponse(data.subdomainTargets);
            });
            return true;

        case 'GET_COLLECTED_SUBDOMAINS':
            chrome.storage.local.get({ collectedSubdomains: [] }, (data) => {
                sendResponse(data.collectedSubdomains);
            });
            return true;

        case 'CLEAR_REQUESTS':
            (async () => {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0) {
                    sendResponse({ status: "error", message: "No active tab found" });
                    return;
                }
                const activeTabId = tabs[0].id;
                const storageKey = `requestsLog_${activeTabId}`;
                chrome.storage.session.set({ [storageKey]: [] }, () => {
                    sendResponse({ status: "ok" });
                });
            })();
            return true; 

        case 'GET_LAST_SCAN_RESULTS':
            (async () => {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0) {
                    sendResponse(null);
                    return;
                }
                const tabId = tabs[0].id;

                if (cachedScanResults.has(tabId)) {
                    sendResponse(cachedScanResults.get(tabId));
                    return;
                }

                const storageKey = `scanResult_${tabId}`;
                chrome.storage.local.get([storageKey], (data) => {
                    if (data[storageKey]) {
                        cachedScanResults.set(tabId, data[storageKey]);
                        sendResponse(data[storageKey]);
                    } else {
                        sendResponse(null);
                    }
                });
            })();
            return true;

        case 'START_SCAN':
            runFullScan(sendResponse);
            return true;

        case 'GET_SCRIPT_CONTENT':
            (async () => {
                try {
                    const response = await fetch(message.url);
                    if (!response.ok) {
                        throw new Error(`HTTP 错误! 状态: ${response.status}`);
                    }
                    const text = await response.text();
                    sendResponse({ status: 'ok', content: text });
                } catch (error) {
                    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                        console.log('后台直接fetch失败，尝试通过content script回退...');
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs.length === 0) {
                                sendResponse({ status: 'error', content: '回退失败: 未找到活动标签页。' });
                                return;
                            }
                            chrome.tabs.sendMessage(
                                tabs[0].id,
                                { type: 'FETCH_FROM_PAGE', url: message.url },
                                (responseFromContent) => {
                                    if (chrome.runtime.lastError) {
                                        sendResponse({ status: 'error', content: `回退失败: ${chrome.runtime.lastError.message}` });
                                    } else {
                                        sendResponse(responseFromContent);
                                    }
                                }
                            );
                        });
                    } else {
                        sendResponse({ status: 'error', content: error.toString() });
                    }
                }
            })();
            return true;

        case 'ANALYZE_SCRIPT':
            analyzeScriptWithAI(message.analysisType, message.scriptContent, message.targetUrl, message.pageUrl)
                .then(response => {
                    const historyEntry = {
                        id: Date.now(),
                        url: message.targetUrl,
                        type: message.analysisType,
                        result: response.status === 'ok' ? response.analysis : `[分析失败]\n${response.error}`,
                        status: response.status,
                        timestamp: new Date().toLocaleString()
                    };
                    
                    chrome.storage.local.get({ aiHistory: [] }, (data) => {
                        const newHistory = [historyEntry, ...data.aiHistory];
                        chrome.storage.local.set({ aiHistory: newHistory });
                    });

                    sendResponse(response);
                });
            break;

        case 'CUSTOM_ANALYZE':
            (async () => {
                const prompt = getCustomAnalysisPrompt(message.customQuery, message.scriptContent);
                const response = await callAiApi(prompt);                
                const historyEntry = {
                    id: Date.now(),
                    url: message.targetUrl, 
                    type: '自定义查询',
                    result: response.status === 'ok' ? response.analysis : `[分析失败]\n${response.error}`,
                    status: response.status,
                    timestamp: new Date().toLocaleString()
                };

                chrome.storage.local.get({ aiHistory: [] }, (data) => {
                    const newHistory = [historyEntry, ...data.aiHistory];
                    chrome.storage.local.set({ aiHistory: newHistory });
                });

                sendResponse(response);
            })();
            return true;

        case 'GET_HISTORY':
            chrome.storage.local.get({ aiHistory: [] }, (data) => {
                sendResponse(data.aiHistory);
            });
            break;

        case 'CLEAR_HISTORY':
            chrome.storage.local.set({ aiHistory: [] }, () => {
                sendResponse({status: 'ok'});
            });
            break;

        case 'GET_IGNORE_LIST':
            chrome.storage.sync.get({ ignoreList: '' }, (data) => {
                sendResponse(data.ignoreList);
            });
            break;

        case 'SAVE_IGNORE_LIST':
            chrome.storage.sync.set({ ignoreList: message.ignoreList }, () => {
                sendResponse({status: 'ok'});
            });
            break;

        case 'GET_API_KEY':
            chrome.storage.sync.get({ apiKey: '' }, (data) => {
                sendResponse(data.apiKey);
            });
            break;

        case 'SAVE_API_KEY':
            chrome.storage.sync.set({ apiKey: message.apiKey }, () => {
                sendResponse({status: 'ok'});
            });
            break;

        case 'SEND_API_REQUEST':
            (async () => {
                const { url, options } = message.data;
                const targetOrigin = new URL(url).origin;
                const ruleId = Math.floor(Math.random() * 50000) + 1;

                const rule = {
                    id: ruleId,
                    priority: 1,
                    action: {
                        type: 'modifyHeaders',
                        requestHeaders: [
                            { header: 'Origin', operation: 'set', value: targetOrigin }
                        ]
                    },
                    condition: {
                        urlFilter: url, 
                        resourceTypes: ['xmlhttprequest']
                    }
                };

                try {
                    await chrome.declarativeNetRequest.updateSessionRules({ addRules: [rule] });
                    
                    const response = await fetch(url, options);
                    const contentType = response.headers.get("content-type");
                    let data;
                    if (contentType && contentType.includes("application/json")) {
                        data = await response.json();
                    } else {
                        data = await response.text();
                    }
                    sendResponse({ status: 'ok', data: data });

                } catch (error) {
                    sendResponse({ status: 'error', error: error.toString() });
                } finally {
                    await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [ruleId] });
                }
            })();
            return true;
            
        case 'GET_LOADED_SCRIPTS':
    (async () => {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs[0] || !tabs[0].id) {
            sendResponse([]);
            return;
        }
        const tabId = tabs[0].id;
        const jsListKey = `jsList_${tabId}`;
        const statusKey = `sourceMapStatus_${tabId}`;

        const data = await chrome.storage.session.get({ [jsListKey]: [], [statusKey]: {} });

        const scripts = data[jsListKey];
        const statuses = data[statusKey];

        const responseData = scripts.map(url => ({
            url: url,
            hasSourceMap: statuses[url] || false
        }));

        sendResponse(responseData);
    })();
    return true;

        case 'SEARCH_SCRIPT_SOURCE':
            (async () => {
                const { apiUrl } = message;
                const pathname = new URL(apiUrl).pathname;

                const highPriorityKeywords = [
                    pathname,
                    pathname.startsWith('/') ? pathname.substring(1) : pathname
                ];
                const lowPriorityKeywords = [];
                const pathSegments = pathname.split('/').filter(Boolean);
                if (pathSegments.length > 0) {
                    const lastSegment = pathSegments[pathSegments.length - 1];
                    if (!highPriorityKeywords.includes(lastSegment)) {
                        lowPriorityKeywords.push(lastSegment);
                    }
                }

                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tabs[0] || !tabs[0].id) {
                    sendResponse({ status: 'error', error: '无法找到活动标签页。' });
                    return;
                }
                const tabId = tabs[0].id;
                const tabUrl = tabs[0].url;
                
                const storageKey = `jsList_${tabId}`;
                const data = await chrome.storage.session.get({ [storageKey]: [] });
                const scriptsToSearch = data[storageKey] || [];

                if (scriptsToSearch.length === 0 && !tabUrl) {
                    sendResponse({ status: 'not_found', error: '当前页面未通过网络加载任何脚本，或列表正在生成中。' });
                    return;
                }

                const priorityRegex = /(app|index)\.[a-f0-9]{8,}\.js/;
                const priorityScripts = [];
                const otherScripts = [];
                for (const url of scriptsToSearch) {
                    priorityRegex.test(url) ? priorityScripts.push(url) : otherScripts.push(url);
                }
                const orderedScriptsToSearch = [...priorityScripts, ...otherScripts];
                const scriptContentCache = new Map();

                for (const scriptUrl of orderedScriptsToSearch) {
                    try {
                        const response = await fetch(scriptUrl);
                        if (!response.ok) continue;
                        const scriptContent = await response.text();
                        scriptContentCache.set(scriptUrl, scriptContent);
                        if (highPriorityKeywords.some(keyword => scriptContent.includes(keyword))) {
                            sendResponse({ status: 'ok', source: scriptUrl });
                            return;
                        }
                    } catch (e) { console.warn(`【Parsing】搜索脚本时出错: ${scriptUrl}`, e); }
                }

                if (lowPriorityKeywords.length > 0) {
                    for (const scriptUrl of orderedScriptsToSearch) {
                        const scriptContent = scriptContentCache.get(scriptUrl);
                        if (scriptContent && lowPriorityKeywords.some(keyword => scriptContent.includes(keyword))) {
                            sendResponse({ status: 'ok', source: scriptUrl });
                            return;
                        }
                    }
                }
                
                sendResponse({ status: 'not_found', error: '在所有脚本及已捕获的JSON请求中均未找到该API路径。' });
            })();
            return true;

        case 'FETCH_AND_SHOW_SOURCEMAP':
            (async () => {
                try {
                    const originalJsUrl = message.url;
                    const mapUrl = originalJsUrl + '.map';

                    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (!tabs[0] || !tabs[0].id) {
                        throw new Error("无法找到活动标签页。");
                    }
                    const tabId = tabs[0].id;

                    const response = await chrome.tabs.sendMessage(tabId, {
                        type: 'FETCH_FROM_PAGE_CONTEXT',
                        url: mapUrl
                    });

                    if (!response || response.status !== 'ok') {
                        throw new Error(response.error || '内容脚本未能成功获取文件。');
                    }
                    
                    const mapContent = response.content;
                    if (!mapContent || !mapContent.trim().startsWith('{')) {
                        throw new Error('获取到的文件内容为空，或者不是一个有效的 Source Map (JSON) 文件。');
                    }

                    tempSourceMapData = {
                        content: mapContent,
                        url: originalJsUrl 
                    };

                    await chrome.tabs.create({ url: chrome.runtime.getURL('jsmap.html') });
                    
                    sendResponse({ status: 'ok' });

                } catch (e) {
                    console.error('Source Map 加载失败:', e);
                    sendResponse({ status: 'error', error: e.message });
                }
            })();
            return true;


            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                if (!tabs[0] || !tabs[0].id) {
                    sendResponse({ status: 'error', error: '无法找到活动标签页。' });
                    return;
                }
                const tabId = tabs[0].id;
                const tabUrl = tabs[0].url;
                
                const storageKey = `jsList_${tabId}`;
                const data = await chrome.storage.session.get({ [storageKey]: [] });
                const scriptsToSearch = data[storageKey];

                if (scriptsToSearch.length === 0 && !tabUrl) {
                    sendResponse({ status: 'not_found', error: '当前页面未通过网络加载任何脚本，或列表正在生成中。' });
                    return;
                }

                const priorityRegex = /(app|index)\.[a-f0-9]{8,}\.js/;
                const priorityScripts = [];
                const otherScripts = [];
                for (const url of scriptsToSearch) {
                    priorityRegex.test(url) ? priorityScripts.push(url) : otherScripts.push(url);
                }
                const orderedScriptsToSearch = [...priorityScripts, ...otherScripts];
                const scriptContentCache = new Map();

                for (const scriptUrl of orderedScriptsToSearch) {
                    try {
                        const response = await fetch(scriptUrl);
                        if (!response.ok) continue;
                        const scriptContent = await response.text();
                        scriptContentCache.set(scriptUrl, scriptContent);
                        if (highPriorityKeywords.some(keyword => scriptContent.includes(keyword))) {
                            sendResponse({ status: 'ok', source: scriptUrl });
                            return;
                        }
                    } catch (e) { console.warn(`【Parsing】搜索脚本时出错: ${scriptUrl}`, e); }
                }

                if (lowPriorityKeywords.length > 0) {
                    for (const scriptUrl of orderedScriptsToSearch) {
                        const scriptContent = scriptContentCache.get(scriptUrl);
                        if (scriptContent && lowPriorityKeywords.some(keyword => scriptContent.includes(keyword))) {
                            sendResponse({ status: 'ok', source: scriptUrl });
                            return;
                        }
                    }
                }

                try {
                    const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_DOCUMENT_CONTENT' });
                    if (response && response.status === 'ok') {
                        const htmlContent = response.content;
                        const allKeywords = [...highPriorityKeywords, ...lowPriorityKeywords];
                        if (allKeywords.some(keyword => htmlContent.includes(keyword))) {
                            sendResponse({ status: 'ok', source: `${tabUrl} (内联脚本)` });
                            return;
                        }
                    }
                } catch (e) {
                    console.warn(`无法从标签页 ${tabId} 获取文档内容。可能原因：页面受保护或内容脚本未注入。`, e);
                }

                const sessionData = await chrome.storage.session.get({ requestsLog: [] });
                const potentialJsonSources = sessionData.requestsLog.filter(req => {
                    try {
                        const url = new URL(req.url);
                        return url.pathname.endsWith('.json') || url.pathname.includes('api-docs');
                    } catch { return false; }
                });

                for (const source of potentialJsonSources) {
                    try {
                        const jsonUrl = source.url;
                        const jsonResponse = await fetch(jsonUrl);
                        if (!jsonResponse.ok) continue;
                        const jsonContent = await jsonResponse.text();
                        if ([...highPriorityKeywords, ...lowPriorityKeywords].some(keyword => jsonContent.includes(keyword))) {
                            sendResponse({ status: 'ok', source: jsonUrl });
                            return;
                        }
                    } catch (e) { console.warn(`【Parsing】搜索JSON源时出错: ${source.url}`, e); }
                }
                
                sendResponse({ status: 'not_found', error: '在所有脚本及已捕获的JSON请求中均未找到该API路径。' });
            });
            return true;
    }
    return true;
});

function scanContent(content, sourceUrl, resultsSet) {
    if (!content || typeof content !== 'string') return;

    for (const key in SCANNER_CONFIG.PATTERNS) {
        const patternConfig = SCANNER_CONFIG.PATTERNS[key];
        const filterFunc = SCANNER_FILTER[key.toLowerCase()];

        if (patternConfig && filterFunc) {
            if (Array.isArray(patternConfig.patterns)) {
                 patternConfig.patterns.forEach(p => {
                    try {
                        if (!p.pattern.global) {
                            console.error(`[调试] 发现非全局正则表达式! 规则来源 (key): '${key}', 规则名称 (name): '${p.name}', 正则: ${p.pattern.toString()}`);
                            return;
                        }
                        const matches = content.matchAll(p.pattern);
                        for (const match of matches) {
                            filterFunc(match[0], sourceUrl, resultsSet);
                        }
                    } catch (e) {
                        console.error(`[调试] 'matchAll' 执行失败! 规则来源 (key): '${key}', 规则名称 (name): '${p.name}', 正则: ${p.pattern.toString()}`, e);
                        throw e;
                    }
                });
            } 
            else if (patternConfig instanceof RegExp) {
                try {
                    if (!patternConfig.global) {
                         console.error(`[调试] 发现非全局正则表达式! 规则来源 (key): '${key}', 正则: ${patternConfig.toString()}`);
                         return;
                    }
                    const matches = content.matchAll(patternConfig);
                    for (const match of matches) {
                        filterFunc(match[0], sourceUrl, resultsSet);
                    }
                } catch (e) {
                    console.error(`[调试] 'matchAll' 执行失败! 规则来源 (key): '${key}', 正则: ${patternConfig.toString()}`, e);
                    throw e;
                }
            }
        }
    }
    if (SCANNER_CONFIG.FINGER && SCANNER_CONFIG.FINGER.PATTERNS && SCANNER_FILTER.finger) {
        SCANNER_CONFIG.FINGER.PATTERNS.forEach(finger => {
            if (finger.pattern.test(content)) {
                SCANNER_FILTER.finger(finger.name, finger.class, finger.type, finger.description, sourceUrl, resultsSet, finger.extType, finger.extName);
            }
        });
    }
}
async function fetchScriptContentViaContentScript(tabId, url) {
    try {
        const response = await chrome.tabs.sendMessage(tabId, {
            type: 'FETCH_FROM_PAGE_CONTEXT',
            url: url
        });

        if (response && response.status === 'ok') {
            return response.content;
        } else {
            // 如果请求失败，记录错误但返回null，避免中断整个扫描
            console.warn(`【扫描器-代理获取失败】: ${url}`, response ? response.error : '无响应');
            return null;
        }
    } catch (e) {
        console.error(`【扫描器-代理消息发送失败】: ${url}`, e);
        return null;
    }
}

async function executeScan(tab, progressCallback) {
    const settings = await chrome.storage.sync.get({ ignoreList: '', autoScanEnabled: false, subdomainTargets: '' });
    const ignoreList = settings.ignoreList ? settings.ignoreList.split('\n').filter(Boolean).map(p => p.trim()) : [];

    try {
        const tabHostname = new URL(tab.url).hostname;
        if (ignoreList.some(pattern => isHostMatch(tabHostname, pattern))) {
            const message = `页面 ${tabHostname} 已命中白名单规则，跳过信息收集。`;
            console.log(`【Parsing】${message}`);
            if (progressCallback) {
                progressCallback(message);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            return { status: 'skipped', message };
        }
    } catch (e) { /* URL 无效则忽略 */ }

    const resultsSet = {
        absoluteApis: new Map(), apis: new Map(), domains: new Map(),
        idKeys: new Map(), ips: new Map(), idcards: new Map(),
        credentials: new Map(), phones: new Map(), emails: new Map(),
        jsFiles: new Map(), companies: new Map(), urls: new Map(),
        githubUrls: new Map(), jwts: new Map(), cookies: new Map(),
        vueFiles: new Map(), imageFiles: new Map(), docFiles: new Map(),
        moduleFiles: new Map(), fingers: new Map()
    };

    try {
        if (progressCallback) progressCallback('正在获取并扫描页面HTML...');
        const htmlResponse = await chrome.tabs.sendMessage(tab.id, { type: 'GET_DOCUMENT_CONTENT' });
        if (htmlResponse && htmlResponse.status === 'ok') {
            scanContent(htmlResponse.content, tab.url + " (HTML)", resultsSet);
        }

        // ======================= BEGIN: 核心修正逻辑 =======================
        if (progressCallback) progressCallback('正在整合JS文件列表...');

        // 1. (被动监听) 从 session storage 获取 webRequest 监听到的脚本
        const storageKey = `jsList_${tab.id}`;
        const data = await chrome.storage.session.get({ [storageKey]: [] });
        const networkScripts = new Set(data[storageKey]);

        // 2. (主动抓取) 直接从页面DOM中获取当前所有<script>标签的src
        let domScripts = new Set();
        try {
            const injectionResults = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => Array.from(document.scripts).map(script => script.src).filter(Boolean)
            });
            if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                injectionResults[0].result.forEach(src => domScripts.add(src));
            }
        } catch (e) {
            console.error("【Parsing】主动抓取DOM脚本失败:", e);
        }

        // 3. 合并并去重，得到最完整的脚本列表
        const combinedScripts = new Set([...networkScripts, ...domScripts]);
        const scriptsToSearch = Array.from(combinedScripts);
        // ======================= END: 核心修正逻辑 =========================
        
        let processedCount = 0;
    for (const scriptUrl of scriptsToSearch) {
        processedCount++;

        try {
            const scriptHostname = new URL(scriptUrl).hostname;
            if (ignoreList.some(pattern => isHostMatch(scriptHostname, pattern))) {
                console.log(`【Parsing】跳过扫描白名单中的脚本: ${scriptUrl}`);
                continue; 
            }
        } catch (e) { /* URL 无效则忽略 */ }

        if (progressCallback) progressCallback(`正在扫描JS文件 (${processedCount}/${scriptsToSearch.length}): ${scriptUrl.split('/').pop()}`);

        // ====================【新增日志 - 步骤1】====================
        console.log(`[Parsing Debug] 正在扫描文件: ${scriptUrl}`);
        // ==========================================================

        const scriptFilename = scriptUrl.split('/').pop().split('?')[0];
        if (SCANNER_CONFIG.API.SKIP_JS_PATTERNS.some(regex => regex.test(scriptFilename))) {
            console.log(`【扫描器】跳过已知库: ${scriptFilename}`);
            continue;
        }

         const jsContent = await fetchScriptContentViaContentScript(tab.id, scriptUrl);

            // 确保我们成功获取到了内容再进行处理
            if (jsContent) {
                // (这里是您之前添加的日志)
                if (jsContent.includes('portal.chinaife.com.cn')) {
                }
                
                scanContent(jsContent, scriptUrl, resultsSet);
            }
        }
        
        
        if (progressCallback) progressCallback('扫描完成，正在整理结果...');
        
        const finalResults = {};
        for (const key in resultsSet) {
            finalResults[key] = Array.from(resultsSet[key].entries()).map(([value, source]) => ({ value, source }));
        }
        
        // ... (此处省略了子域名收集逻辑，保持不变) ...
        try {
            if (settings.subdomainTargets && finalResults.domains && finalResults.domains.length > 0) {
                const { collectedSubdomains = [] } = await chrome.storage.local.get({ collectedSubdomains: [] });
                const existingSubdomains = new Set(collectedSubdomains);
                const targetDomains = settings.subdomainTargets.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);

                targetDomains.sort((a, b) => b.length - a.length);
                finalResults.domains.forEach(item => {
                    const foundDomainWithPort = item.value.toLowerCase();
                    const domainForCheck = foundDomainWithPort.split(':')[0];

                    // 寻找最佳匹配 (最长的目标域名后缀)
                    let bestMatch = null;
                    for (const target of targetDomains) {
                        if (domainForCheck !== target && domainForCheck.endsWith('.' + target)) {
                            // 如果当前目标比之前找到的最佳匹配更长，则更新它
                            if (!bestMatch || target.length > bestMatch.length) {
                                bestMatch = target;
                            }
                        }
                    }

                    // 如果找到了任何一个有效的匹配项，就将其添加
                    if (bestMatch) {
                        existingSubdomains.add(foundDomainWithPort);
                    }
                });

                await chrome.storage.local.set({ collectedSubdomains: Array.from(existingSubdomains) });
            }
        } catch (e) {
            console.error("【子域名收集】处理时发生错误:", e);
        }
        
        const resultsToStore = {
            results: finalResults,
            timestamp: new Date().toLocaleString()
        };
        
        chrome.storage.local.set({ [`scanResult_${tab.id}`]: resultsToStore });
        cachedScanResults.set(tab.id, resultsToStore);
        
        return { status: 'ok', ...resultsToStore };

    } catch (e) {
        console.error("【扫描器】执行扫描时发生严重错误:", e);
        return { status: 'error', error: e.message };
    }
}

async function runFullScan(sendResponse) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0] || !tabs[0].id || !tabs[0].url) {
        sendResponse({ status: 'error', error: '无法找到活动标签页。' });
        return;
    }
    const tab = tabs[0];
    
    const sendProgress = (text) => {
        chrome.runtime.sendMessage({ type: 'SCAN_PROGRESS', text })
            .catch(e => console.log("发送进度失败, popup可能已关闭"));
    };
    const result = await executeScan(tab, sendProgress);
    sendResponse(result);
}

async function callAiApi(prompt) {
    const settings = await new Promise(resolve => {
        chrome.storage.sync.get({
            selectedModel: 'gemini',
            apiKeyGemini: '',
            apiKeyChatGpt: '',
            apiKeyDeepSeek: '',
            apiKeyDoubao: ''
        }, resolve);
    });

    const { selectedModel, apiKeyGemini, apiKeyChatGpt, apiKeyDeepSeek, apiKeyDoubao } = settings;

    switch (selectedModel) {
        case 'gemini':
            return _callGemini(prompt, apiKeyGemini);
        case 'chatgpt':
            return _callChatGpt(prompt, apiKeyChatGpt);
        case 'deepseek':
            return _callDeepSeek(prompt, apiKeyDeepSeek);
        case 'doubao':
            return _callDoubao(prompt, apiKeyDoubao);
        default:
            return { status: 'error', error: '未选择有效的AI模型。' };
    }
}


chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
        chrome.storage.sync.get({ autoScanEnabled: false }, (settings) => {
            if (settings.autoScanEnabled) {
                console.log(`【Parsing】检测到页面加载完成，自动开始扫描: ${tab.url}`);
                executeScan(tab).then(result => {
                    if (result.status === 'ok') {
                        console.log(`【Parsing】自动扫描完成: ${tab.url}`);
                    } else {
                        console.error(`【Parsing】自动扫描失败: ${result.error}`);
                    }
                });
            }
        });
    }
});

function generatePlaceholderData(parameters = [], requestBody = null) {
    const data = {
        query: {},
        path: {},
        body: {}
    };

    parameters.forEach(param => {
        const placeholder = param.schema.type === 'number' ? 1 : (param.schema.type === 'boolean' ? true : 'test');
        if (param.in === 'query') {
            data.query[param.name] = placeholder;
        } else if (param.in === 'path') {
            data.path[param.name] = placeholder;
        }
    });

    if (requestBody && requestBody.content && requestBody.content['application/json']) {
        const schema = requestBody.content['application/json'].schema;
        if (schema && schema.properties) {
            for (const key in schema.properties) {
                const prop = schema.properties[key];
                data.body[key] = prop.type === 'number' ? 1 : (prop.type === 'boolean' ? true : (prop.type === 'array' ? [] : 'test_string'));
            }
        }
    }
    
    return data;
}

async function runUnauthorizedAccessTest(apiDoc, docUrl) {
    const urlObject = new URL(docUrl);
    let baseUrl = urlObject.origin; 

    const testPromises = [];
    const endpoints = [];

    for (const path in apiDoc.paths) {
        for (const method in apiDoc.paths[path]) {
            const endpointInfo = apiDoc.paths[path][method];
            endpoints.push({ path, method, info: endpointInfo });
        }
    }

    chrome.runtime.sendMessage({ type: 'SCAN_PROGRESS', text: `准备测试 ${endpoints.length} 个接口...` });

    for (const endpoint of endpoints) {
        const { path, method, info } = endpoint;
        const data = generatePlaceholderData(info.parameters, info.requestBody);

        let finalPath = path;
        for (const key in data.path) {
            finalPath = finalPath.replace(`{${key}}`, data.path[key]);
        }

        const queryString = new URLSearchParams(data.query).toString();
        const fullUrl = `${baseUrl.replace(/\/$/, '')}/${finalPath.replace(/^\//, '')}${queryString ? '?' + queryString : ''}`;

        const fetchOptions = {
            method: method.toUpperCase(),
            headers: {
                'Content-Type': 'application/json'
            },
        };

        if (['post', 'put', 'patch'].includes(method.toLowerCase()) && Object.keys(data.body).length > 0) {
            fetchOptions.body = JSON.stringify(data.body);
        }

        testPromises.push(
            fetch(fullUrl, fetchOptions)
                .then(response => ({
                    url: fullUrl,
                    method: method.toUpperCase(),
                    status: response.status,
                    ok: response.ok
                }))
                .catch(error => ({
                    url: fullUrl,
                    method: method.toUpperCase(),
                    status: 'FetchError',
                    error: error.message
                }))
        );
    }
    
    const results = await Promise.allSettled(testPromises);
    const vulnerable = [];
    const secured = [];
    const errors = [];

    results.forEach((result, index) => {
        chrome.runtime.sendMessage({ type: 'SCAN_PROGRESS', text: `测试中... (${index + 1}/${endpoints.length})` });

        if (result.status === 'fulfilled' && result.value) {
            const res = result.value;
            if (res.status >= 200 && res.status < 300) {
                vulnerable.push(`[${res.method}] ${res.url} - 状态码: ${res.status} (成功)`);
            } else if (res.status === 401 || res.status === 403) {
                secured.push(`[${res.method}] ${res.url} - 状态码: ${res.status} (已拒绝)`);
            } else {
                errors.push(`[${res.method}] ${res.url} - 状态码: ${res.status}`);
            }
        } else {
             errors.push(`[请求失败] ${endpoints[index].method.toUpperCase()} ${endpoints[index].path} - 原因: ${result.reason || '未知'}`);
        }
    });

    let report = `未授权访问测试报告 (基于 ${baseUrl})\n`;
    report += "========================================\n\n";
    report += `🚨 发现 ${vulnerable.length} 个可能存在未授权访问的接口 🚨\n`;
    report += "----------------------------------------\n";
    report += vulnerable.length > 0 ? vulnerable.join('\n') + '\n\n' : "无。\n\n";

    report += `✅ 发现 ${secured.length} 个访问被正确拒绝的接口 ✅\n`;
    report += "----------------------------------------\n";
    report += secured.length > 0 ? secured.join('\n') + '\n\n' : "无。\n\n";

    report += `❓ 发现 ${errors.length} 个其他状态或错误的接口 ❓\n`;
    report += "----------------------------------------\n";
    report += errors.length > 0 ? errors.join('\n') : "无。\n";

    return report;
}

function fetchWithTimeout(url, options, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Request timed out'));
        }, timeout);

        fetch(url, options)
            .then(response => {
                clearTimeout(timer);
                resolve(response);
            })
            .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
    });
}

/**
 * 批量处理URL，获取其状态码和标题
 * @param {string[]} targets - 目标URL或域名数组
 * @returns {Promise<object[]>} - 结果对象数组
 */
async function batchFetchTitles(targets) {
    const titleRegex = /<title>(.*?)<\/title>/i;
    const results = [];

    // 使用 Promise.allSettled 来处理所有请求，无论成功或失败
    const promises = targets.map(async (target) => {
        let url = target;
        // 如果输入的是域名或IP，尝试添加 http://
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'http://' + url;
        }

        try {
            const response = await fetchWithTimeout(url, { method: 'GET' }, 5000); // 5秒超时
            const text = await response.text();
            const titleMatch = text.match(titleRegex);
            const title = titleMatch ? titleMatch[1].trim() : '(未找到标题)';
            return {
                originalTarget: target,
                finalUrl: response.url, // 记录最终跳转的URL
                status: response.status,
                title: title
            };
        } catch (error) {
            // 处理超时、网络错误、CORS等问题
            let status = 'Error';
            if (error.message.includes('timed out')) {
                status = 'Timeout';
            } else if (error instanceof TypeError) { // 通常是网络或CORS错误
                status = 'Network/CORS Error';
            }
            return {
                originalTarget: target,
                finalUrl: url,
                status: status,
                title: error.message
            };
        }
    });

    const settledResults = await Promise.allSettled(promises);
    
    settledResults.forEach(result => {
        if (result.status === 'fulfilled') {
            results.push(result.value);
        }
    });

    return results;
}