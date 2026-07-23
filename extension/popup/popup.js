document.addEventListener('DOMContentLoaded', async () => {
  const serverUrlInput = document.getElementById('serverUrl');
  const saveBtn = document.getElementById('saveBtn');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const message = document.getElementById('message');

  const stored = await chrome.storage.sync.get(['serverUrl']);
  if (stored.serverUrl) {
    serverUrlInput.value = stored.serverUrl;
  }

  await checkConnection();

  saveBtn.addEventListener('click', async () => {
    const url = serverUrlInput.value.trim();
    if (!url) {
      showMessage('Please enter a server URL', 'error');
      return;
    }

    await chrome.storage.sync.set({ serverUrl: url });
    showMessage('Settings saved!', 'success');

    await checkConnection();
  });

  async function checkConnection() {
    const url = serverUrlInput.value.trim();

    statusDot.className = 'status-dot';
    statusText.textContent = 'Checking connection...';

    try {
      const response = await fetch(`${url}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          statusDot.className = 'status-dot';
          statusText.textContent = 'Connected to GitPreview';
          return;
        }
      }

      throw new Error('Invalid response');
    } catch (error) {
      statusDot.className = 'status-dot offline';
      statusText.textContent = 'Cannot connect to server';
    }
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `message ${type}`;
    message.style.display = 'block';

    setTimeout(() => {
      message.style.display = 'none';
    }, 3000);
  }
});
