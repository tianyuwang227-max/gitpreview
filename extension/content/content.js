(function() {
  'use strict';

  let API_BASE = 'http://localhost:3000';
  let ws = null;
  let currentPreviewId = null;

  function isRepoPage() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    return parts.length >= 2 && !['settings', 'notifications', 'explore', 'marketplace'].includes(parts[0]);
  }

  function getRepoInfo() {
    const path = window.location.pathname;
    const parts = path.split('/').filter(Boolean);
    return {
      owner: parts[0],
      name: parts[1],
      fullName: `${parts[0]}/${parts[1]}`,
      url: window.location.origin + '/' + parts[0] + '/' + parts[1]
    };
  }

  function createPreviewButton() {
    const button = document.createElement('button');
    button.className = 'gitpreview-btn';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.5c-3.58 0-6.5-2.92-6.5-6.5S4.42 1.5 8 1.5s6.5 2.92 6.5 6.5-2.92 6.5-6.5 6.5zm0-11c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5S10.49 3.5 8 3.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5S6.62 5.5 8 5.5s2.5 1.12 2.5 2.5S9.38 10.5 8 10.5z"/>
      </svg>
      <span>Preview</span>
    `;
    button.title = 'Preview with GitPreview';
    return button;
  }

  function createPreviewPanel() {
    const panel = document.createElement('div');
    panel.className = 'gitpreview-panel';
    panel.innerHTML = `
      <div class="gitpreview-header">
        <h3>GitPreview</h3>
        <div class="gitpreview-header-actions">
          <select id="gitpreview-mode" class="gitpreview-select">
            <option value="auto">Auto</option>
            <option value="screenshot">Screenshot</option>
            <option value="live">Live Preview</option>
          </select>
          <button class="gitpreview-close">&times;</button>
        </div>
      </div>
      <div class="gitpreview-content">
        <div class="gitpreview-loading">
          <div class="gitpreview-spinner"></div>
          <p class="gitpreview-loading-text">Loading preview...</p>
          <div class="gitpreview-progress-container">
            <div class="gitpreview-progress-bar">
              <div class="gitpreview-progress-fill"></div>
            </div>
            <div class="gitpreview-progress-text">0%</div>
          </div>
        </div>
        <div class="gitpreview-result" style="display: none;">
          <div class="gitpreview-preview-wrapper">
            <div class="gitpreview-screenshot" style="display: none;">
              <img src="" alt="Repository preview">
            </div>
            <div class="gitpreview-iframe-wrapper" style="display: none;">
              <iframe src="" frameborder="0"></iframe>
            </div>
          </div>
          <div class="gitpreview-info">
            <div class="gitpreview-repo-name"></div>
            <div class="gitpreview-description"></div>
            <div class="gitpreview-stats"></div>
            <div class="gitpreview-tech-stack"></div>
          </div>
          <div class="gitpreview-actions">
            <a href="#" class="gitpreview-full-link" target="_blank">Open Full Preview</a>
            <button class="gitpreview-stop-btn" style="display: none;">Stop Preview</button>
          </div>
        </div>
        <div class="gitpreview-error" style="display: none;">
          <p class="gitpreview-error-message"></p>
        </div>
      </div>
    `;
    return panel;
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .gitpreview-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 600;
        line-height: 20px;
        color: #fff;
        background: linear-gradient(135deg, #238636, #2ea043);
        border: 1px solid rgba(27, 31, 36, 0.15);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        margin-left: 8px;
      }

      .gitpreview-btn:hover {
        background: linear-gradient(135deg, #2ea043, #3fb950);
        box-shadow: 0 2px 8px rgba(46, 160, 67, 0.4);
      }

      .gitpreview-btn svg {
        width: 14px;
        height: 14px;
      }

      .gitpreview-panel {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 900px;
        max-width: 90vw;
        max-height: 90vh;
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 12px;
        box-shadow: 0 16px 70px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .gitpreview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #161b22;
        border-bottom: 1px solid #30363d;
        flex-shrink: 0;
      }

      .gitpreview-header h3 {
        margin: 0;
        font-size: 16px;
        color: #e6edf3;
      }

      .gitpreview-header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .gitpreview-select {
        padding: 4px 8px;
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 6px;
        color: #e6edf3;
        font-size: 12px;
      }

      .gitpreview-close {
        background: none;
        border: none;
        color: #8b949e;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }

      .gitpreview-close:hover {
        color: #e6edf3;
      }

      .gitpreview-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }

      .gitpreview-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px;
        color: #8b949e;
      }

      .gitpreview-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #30363d;
        border-top: 3px solid #58a6ff;
        border-radius: 50%;
        animation: gitpreview-spin 1s linear infinite;
        margin-bottom: 16px;
      }

      @keyframes gitpreview-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .gitpreview-loading-text {
        margin-bottom: 16px;
      }

      .gitpreview-progress-container {
        width: 100%;
        max-width: 300px;
      }

      .gitpreview-progress-bar {
        width: 100%;
        height: 6px;
        background: #21262d;
        border-radius: 3px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .gitpreview-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #58a6ff, #3fb950);
        border-radius: 3px;
        transition: width 0.3s ease;
        width: 0%;
      }

      .gitpreview-progress-text {
        font-size: 12px;
        text-align: center;
      }

      .gitpreview-preview-wrapper {
        margin-bottom: 20px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #30363d;
      }

      .gitpreview-screenshot img {
        width: 100%;
        height: auto;
        display: block;
      }

      .gitpreview-iframe-wrapper {
        position: relative;
        width: 100%;
        height: 500px;
      }

      .gitpreview-iframe-wrapper iframe {
        width: 100%;
        height: 100%;
        border: none;
      }

      .gitpreview-repo-name {
        font-size: 18px;
        font-weight: 600;
        color: #58a6ff;
        margin-bottom: 8px;
      }

      .gitpreview-description {
        color: #8b949e;
        margin-bottom: 16px;
        line-height: 1.5;
      }

      .gitpreview-stats {
        display: flex;
        gap: 20px;
        margin-bottom: 16px;
        font-size: 14px;
      }

      .gitpreview-stat {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #8b949e;
      }

      .gitpreview-stat-value {
        font-weight: 600;
        color: #e6edf3;
      }

      .gitpreview-tech-stack {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 20px;
      }

      .gitpreview-tech-tag {
        padding: 4px 10px;
        background: #21262d;
        border: 1px solid #30363d;
        border-radius: 12px;
        font-size: 12px;
        color: #8b949e;
      }

      .gitpreview-tech-tag.language {
        background: #1f6feb22;
        border-color: #1f6feb;
        color: #58a6ff;
      }

      .gitpreview-actions {
        display: flex;
        gap: 12px;
      }

      .gitpreview-full-link {
        display: inline-block;
        padding: 8px 16px;
        background: #238636;
        color: #fff;
        text-decoration: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        transition: background 0.2s;
      }

      .gitpreview-full-link:hover {
        background: #2ea043;
      }

      .gitpreview-stop-btn {
        padding: 8px 16px;
        background: #f8514922;
        color: #f85149;
        border: 1px solid #f85149;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }

      .gitpreview-stop-btn:hover {
        background: #f8514944;
      }

      .gitpreview-error {
        text-align: center;
        padding: 40px;
        color: #f85149;
      }

      .gitpreview-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
      }

      .gitpreview-badge {
        display: inline-block;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        margin-left: 8px;
      }

      .gitpreview-badge-live {
        background: #238636;
        color: #fff;
      }

      .gitpreview-badge-screenshot {
        background: #6e7681;
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  function connectWebSocket() {
    const wsUrl = API_BASE.replace(/^http/, 'ws') + '/ws';
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('GitPreview WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('GitPreview WebSocket disconnected');
      ws = null;
    };

    ws.onerror = (error) => {
      console.error('GitPreview WebSocket error:', error);
    };
  }

  function handleWebSocketMessage(message) {
    const panel = document.querySelector('.gitpreview-panel');
    if (!panel) return;

    switch (message.type) {
      case 'progress':
        if (message.taskId === currentPreviewId) {
          updateProgressUI(panel, message.progress, message.message);
        }
        break;

      case 'completed':
        if (message.taskId === currentPreviewId) {
          showScreenshotPreview(panel, message.data);
        }
        break;

      case 'error':
        if (message.taskId === currentPreviewId) {
          showError(panel, message.message);
        }
        break;
    }
  }

  function subscribeToTask(taskId) {
    currentPreviewId = taskId;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', taskId }));
    }
  }

  function updateProgressUI(panel, progress, message) {
    const progressFill = panel.querySelector('.gitpreview-progress-fill');
    const progressText = panel.querySelector('.gitpreview-progress-text');
    const loadingText = panel.querySelector('.gitpreview-loading-text');

    if (progressFill) progressFill.style.width = `${progress}%`;
    if (progressText) progressText.textContent = `${progress}%`;
    if (loadingText && message) loadingText.textContent = message;
  }

  async function fetchPreview(repoInfo, mode) {
    const response = await fetch(`${API_BASE}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: repoInfo.url, mode }),
    });

    if (!response.ok) {
      throw new Error('Failed to start preview');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Preview failed');
    }

    return data.data;
  }

  function showScreenshotPreview(panel, data) {
    const loading = panel.querySelector('.gitpreview-loading');
    const result = panel.querySelector('.gitpreview-result');
    const screenshot = panel.querySelector('.gitpreview-screenshot');
    const iframe = panel.querySelector('.gitpreview-iframe-wrapper');

    if (data.mode === 'live' && data.url) {
      screenshot.style.display = 'none';
      iframe.style.display = 'block';
      iframe.querySelector('iframe').src = `${API_BASE}${data.url}`;

      const stopBtn = panel.querySelector('.gitpreview-stop-btn');
      stopBtn.style.display = 'inline-block';
      stopBtn.onclick = () => stopPreview(data.id);
    } else {
      screenshot.style.display = 'block';
      iframe.style.display = 'none';
      screenshot.querySelector('img').src = `${API_BASE}${data.screenshot?.imagePath || data.preview?.imagePath}`;
    }

    const repoName = panel.querySelector('.gitpreview-repo-name');
    repoName.textContent = data.repo?.fullName || 'Repository';

    if (data.mode === 'live') {
      const badge = document.createElement('span');
      badge.className = 'gitpreview-badge gitpreview-badge-live';
      badge.textContent = 'LIVE';
      repoName.appendChild(badge);
    }

    panel.querySelector('.gitpreview-description').textContent = data.repo?.description || 'No description';

    const stats = panel.querySelector('.gitpreview-stats');
    if (data.repo) {
      stats.innerHTML = `
        <span class="gitpreview-stat">
          <span>&#9733;</span>
          <span class="gitpreview-stat-value">${formatNumber(data.repo.stars)}</span>
        </span>
        <span class="gitpreview-stat">
          <span>&#9741;</span>
          <span class="gitpreview-stat-value">${formatNumber(data.repo.forks)}</span>
        </span>
        <span class="gitpreview-stat">
          <span>&#128196;</span>
          <span class="gitpreview-stat-value">${data.repo.language}</span>
        </span>
      `;
    }

    const fullLink = panel.querySelector('.gitpreview-full-link');
    if (data.mode === 'live' && data.url) {
      fullLink.href = `${API_BASE}${data.url}`;
    } else if (data.repo) {
      fullLink.href = `${API_BASE}/?url=${encodeURIComponent(data.repo.url)}`;
    }

    loading.style.display = 'none';
    result.style.display = 'block';
  }

  function showError(panel, message) {
    const error = panel.querySelector('.gitpreview-error');
    const loading = panel.querySelector('.gitpreview-loading');

    error.querySelector('.gitpreview-error-message').textContent = message;

    loading.style.display = 'none';
    error.style.display = 'block';
  }

  function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num?.toString() || '0';
  }

  async function stopPreview(id) {
    try {
      await fetch(`${API_BASE}/api/live-preview/${id}/stop`, { method: 'POST' });
      currentPreviewId = null;
    } catch (error) {
      console.error('Failed to stop preview:', error);
    }
  }

  async function handlePreviewClick() {
    const repoInfo = getRepoInfo();

    const overlay = document.createElement('div');
    overlay.className = 'gitpreview-overlay';
    document.body.appendChild(overlay);

    const panel = createPreviewPanel();
    document.body.appendChild(panel);

    const closeBtn = panel.querySelector('.gitpreview-close');
    closeBtn.addEventListener('click', () => {
      panel.remove();
      overlay.remove();
      if (currentPreviewId) {
        stopPreview(currentPreviewId);
      }
    });

    overlay.addEventListener('click', () => {
      panel.remove();
      overlay.remove();
      if (currentPreviewId) {
        stopPreview(currentPreviewId);
      }
    });

    try {
      connectWebSocket();

      const modeSelect = panel.querySelector('#gitpreview-mode');
      const mode = modeSelect.value;

      const result = await fetchPreview(repoInfo, mode);

      if (result.mode === 'live' && result.id) {
        currentPreviewId = result.id;

        if (ws && ws.readyState === WebSocket.OPEN) {
          subscribeToTask(result.id);
        }

        showScreenshotPreview(panel, result);
      } else {
        showScreenshotPreview(panel, result);
      }
    } catch (error) {
      showError(panel, error.message);
    }
  }

  function injectButton() {
    if (!isRepoPage()) return;

    const existing = document.querySelector('.gitpreview-btn');
    if (existing) return;

    const selectors = [
      '.pagehead-actions',
      '.Layout-sidebar .BorderGrid-cell',
      '#repository-container-header',
    ];

    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) break;
    }

    if (!container) return;

    const button = createPreviewButton();
    button.addEventListener('click', handlePreviewClick);

    if (container.classList.contains('pagehead-actions')) {
      const li = document.createElement('li');
      li.appendChild(button);
      container.appendChild(li);
    } else {
      container.appendChild(button);
    }
  }

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['serverUrl']);
      if (result.serverUrl) {
        API_BASE = result.serverUrl;
      }
    } catch (error) {
      console.log('Using default server URL:', API_BASE);
    }
  }

  function init() {
    injectStyles();
    injectButton();

    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(injectButton, 1000);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      await loadSettings();
      init();
    });
  } else {
    loadSettings().then(() => init());
  }
})();
