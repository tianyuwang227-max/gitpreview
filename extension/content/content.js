(function() {
  'use strict';

  const API_BASE = 'http://localhost:3000';

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
        <button class="gitpreview-close">&times;</button>
      </div>
      <div class="gitpreview-content">
        <div class="gitpreview-loading">
          <div class="gitpreview-spinner"></div>
          <p>Loading preview...</p>
        </div>
        <div class="gitpreview-result" style="display: none;">
          <div class="gitpreview-screenshot">
            <img src="" alt="Repository preview">
          </div>
          <div class="gitpreview-info">
            <div class="gitpreview-repo-name"></div>
            <div class="gitpreview-description"></div>
            <div class="gitpreview-stats"></div>
            <div class="gitpreview-tech-stack"></div>
          </div>
          <div class="gitpreview-actions">
            <a href="#" class="gitpreview-full-link" target="_blank">Open Full Preview</a>
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
        width: 800px;
        max-width: 90vw;
        max-height: 90vh;
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 12px;
        box-shadow: 0 16px 70px rgba(0, 0, 0, 0.5);
        z-index: 10000;
        overflow: hidden;
      }

      .gitpreview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #161b22;
        border-bottom: 1px solid #30363d;
      }

      .gitpreview-header h3 {
        margin: 0;
        font-size: 16px;
        color: #e6edf3;
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
        max-height: calc(90vh - 60px);
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

      .gitpreview-screenshot {
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
    `;
    document.head.appendChild(style);
  }

  async function fetchPreview(repoInfo) {
    const response = await fetch(`${API_BASE}/api/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: repoInfo.url, async: true })
    });

    if (!response.ok) {
      throw new Error('Failed to start preview');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Preview failed');
    }

    return data.data.taskId;
  }

  async function pollTaskStatus(taskId, maxAttempts = 60) {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(`${API_BASE}/api/tasks/${taskId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to get status');
      }

      const { status, result, error, progress } = data.data;

      if (status === 'completed' && result) {
        return result;
      }

      if (status === 'failed') {
        throw new Error(error || 'Preview failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Timeout waiting for preview');
  }

  function showPreview(panel, data) {
    const result = panel.querySelector('.gitpreview-result');
    const loading = panel.querySelector('.gitpreview-loading');

    const screenshot = result.querySelector('.gitpreview-screenshot img');
    screenshot.src = `${API_BASE}${data.screenshot.imagePath}`;

    result.querySelector('.gitpreview-repo-name').textContent = data.repo.fullName;
    result.querySelector('.gitpreview-description').textContent = data.repo.description || 'No description';

    const stats = result.querySelector('.gitpreview-stats');
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

    const techStack = result.querySelector('.gitpreview-tech-stack');
    if (data.analysis?.techStack) {
      const tags = [];
      if (data.analysis.techStack.languages) {
        data.analysis.techStack.languages.forEach(lang => {
          tags.push(`<span class="gitpreview-tech-tag language">${lang.name}</span>`);
        });
      }
      if (data.analysis.techStack.frameworks) {
        data.analysis.techStack.frameworks.forEach(fw => {
          tags.push(`<span class="gitpreview-tech-tag">${fw}</span>`);
        });
      }
      techStack.innerHTML = tags.join('');
    }

    const fullLink = result.querySelector('.gitpreview-full-link');
    fullLink.href = `${API_BASE}/?url=${encodeURIComponent(data.repo.url)}`;

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
    });

    overlay.addEventListener('click', () => {
      panel.remove();
      overlay.remove();
    });

    try {
      const taskId = await fetchPreview(repoInfo);
      const result = await pollTaskStatus(taskId);
      showPreview(panel, result);
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
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
