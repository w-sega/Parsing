document.addEventListener('DOMContentLoaded', () => {
    const treeView = document.getElementById('treeView');
    const preview = document.getElementById('preview');
    const searchInput = document.getElementById('searchInput');
    const fileInput = document.getElementById('fileInput');

    const aiPanel = document.getElementById('ai-panel');
    const aiButtonsContainer = document.getElementById('ai-buttons-container');
    const sendCustomAiBtn = document.getElementById('send-custom-ai-btn');
    const customAiInput = document.getElementById('custom-ai-input');
    const aiResultContainer = document.getElementById('ai-result-container');
    const aiResultEl = document.getElementById('ai-result');
    const copyAiResultBtn = document.getElementById('copy-ai-result-btn');

    let fileContents = {};
    let originalScriptUrl = ''; 
    let currentPreviewContent = ''; 
    let fullAiAnalysisResult = '';

    aiPanel.style.display = 'none';

    chrome.runtime.sendMessage({ type: 'GET_SOURCE_MAP_DATA' }, (response) => {
        if (chrome.runtime.lastError) {
            preview.innerHTML = `<i>加载失败: ${chrome.runtime.lastError.message}</i>`;
            fileInput.addEventListener('change', handleFileSelect);
            return;
        }
        if (response && response.status === 'ok' && response.content) {
            originalScriptUrl = response.url;
            processMapContent(response.content);
            fileInput.style.display = 'none';
        } else {
            const errorMessage = response ? response.error : '无法从后台获取数据。';
            preview.innerHTML = `<i>加载失败: ${errorMessage}<br>请通过“JS列表”重新打开，或手动选择一个 .map 文件。</i>`;
            fileInput.addEventListener('change', handleFileSelect);
        }
    });

    
    function processMapContent(content) {
        try {
            const jsmap = JSON.parse(content);
            const sources = jsmap.sources || [];
            const sourcesContent = jsmap.sourcesContent || [];
            fileContents = {};
            sources.forEach((src, idx) => {
                fileContents[src] = sourcesContent[idx] || "(No content)";
            });
            renderTree(buildTree(sources));
        } catch (err) {
            alert("无效的 .js.map 文件内容。");
            console.error(err);
        }
    }
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            processMapContent(event.target.result);
        };
        reader.readAsText(file);
    }
    function buildTree(paths) {
        const root = {};
        for (const path of paths) {
            const cleanedPath = path.replace(/^webpack:\/\/\/\.?\//, '');
            const parts = cleanedPath.split('/').filter(p => p && p !== '.');
            let current = root;
            for (const part of parts) {
                if (!current[part]) current[part] = {};
                current = current[part];
            }
        }
        return root;
    }
    function renderTree(tree, parent = treeView) {
        parent.innerHTML = '';
        const ul = document.createElement('ul');
        parent.appendChild(ul);
        renderNode(tree, ul, '');
    }
    function renderNode(node, container, currentPath) {
        for (const key in node) {
            const li = document.createElement('li');
            const newPath = currentPath ? `${currentPath}/${key}` : key;
            if (Object.keys(node[key]).length === 0) {
                const span = document.createElement('span');
                span.textContent = key;
                span.className = 'file';
                span.onclick = () => {
                    const originalPathKey = Object.keys(fileContents).find(k => k.endsWith(newPath));
                    previewFile(originalPathKey || newPath);
                };
                li.appendChild(span);
            } else {
                const folder = document.createElement('span');
                folder.textContent = key;
                folder.className = 'folder';
                const subUL = document.createElement('ul');
                subUL.classList.add('hidden');
                folder.onclick = () => subUL.classList.toggle('hidden');
                li.appendChild(folder);
                renderNode(node[key], subUL, newPath);
                li.appendChild(subUL);
            }
            container.appendChild(li);
        }
    }
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase();
        const items = treeView.querySelectorAll('li > span');
        items.forEach(span => {
            const li = span.parentElement;
            const text = span.textContent.toLowerCase();
            li.style.display = text.includes(term) ? '' : 'none';
        });
    });
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
    }

    function previewFile(path) {
        const content = fileContents[path];
        if (content !== undefined) {
            currentPreviewContent = content;

            aiPanel.style.display = 'flex';
            aiResultContainer.style.display = 'none'; 

            const ext = path.split('.').pop().toLowerCase();
            let lang = 'plaintext';
            if (['js', 'jsx', 'mjs'].includes(ext)) lang = 'javascript';
            else if (ext === 'html') lang = 'html';
            else if (ext === 'ts') lang = 'typescript';
            else if (ext === 'json') lang = 'json';
            else if (ext === 'css') lang = 'css';
            preview.innerHTML = `<pre><code class="language-${lang}">${escapeHtml(content)}</code></pre>`;
            if (window.hljs) {
                hljs.highlightAll();
            }
        } else {
            preview.innerHTML = `<b>Content not found for path:</b> ${escapeHtml(path)}`;
            aiPanel.style.display = 'none';
        }
    }


    aiButtonsContainer.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            const analysisType = event.target.dataset.type;
            runAiAnalysis(analysisType);
        }
    });

    sendCustomAiBtn.addEventListener('click', () => {
        const customQuery = customAiInput.value.trim();
        if (!customQuery) return alert('请输入您的问题。');
        runAiAnalysis('custom', customQuery);
    });

    function runAiAnalysis(type, query = '') {
        if (!currentPreviewContent) {
            alert("没有可供分析的代码内容。");
            return;
        }

        aiResultContainer.style.display = 'block';
        aiResultEl.textContent = 'AI 正在分析中，请稍候...';

        const message = {
            scriptContent: currentPreviewContent,
            targetUrl: originalScriptUrl 
        };

        if (type === 'custom') {
            message.type = 'CUSTOM_ANALYZE';
            message.customQuery = query;
        } else {
            message.type = 'ANALYZE_SCRIPT';
            message.analysisType = type;
        }

        chrome.runtime.sendMessage(message, (aiResponse) => {
            if (aiResponse && aiResponse.status === 'ok') {
                fullAiAnalysisResult = aiResponse.analysis;
                aiResultEl.textContent = aiResponse.analysis;
            } else {
                aiResultEl.textContent = `AI分析失败: ${aiResponse.error || '未知错误'}`;
            }
        });
    }

    copyAiResultBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(fullAiAnalysisResult).then(() => {
            copyAiResultBtn.textContent = '复制成功!';
            setTimeout(() => { copyAiResultBtn.textContent = '复制结果'; }, 2000);
        });
    });
});

 const resizer = document.getElementById('resizer');
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'ns-resize'; 
        e.preventDefault(); 
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;

        const containerRect = aiPanel.parentElement.getBoundingClientRect();
        const newAiPanelHeight = containerRect.bottom - e.clientY;
        const minHeight = 100;
        const maxHeight = containerRect.height * 0.8; 
        
        if (newAiPanelHeight >= minHeight && newAiPanelHeight <= maxHeight) {
            aiPanel.style.height = `${newAiPanelHeight}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = ''; 
    });