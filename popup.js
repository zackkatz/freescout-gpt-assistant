const DEFAULT_SYSTEM_PROMPT = `You are a helpful customer support agent. Please provide clear, concise, and friendly responses to customer inquiries.

Guidelines:
- Be authoritative yet approachable in your tone
- Keep responses concise but complete
- Always reference relevant documentation links when applicable
- Use a helpful, professional tone
- If you mention documentation, include the specific URL
- Structure your response clearly with bullet points or numbered lists when helpful
- End with an offer to help further if needed

When referencing documentation, format links as: [Link Text](URL)`;

// Load saved settings when popup opens
chrome.storage.local.get(['systemPrompt', 'docsUrl', 'openaiKey', 'openaiModel', 'temperature', 'maxTokens', 'keyboardShortcut'], (result) => {
  document.getElementById('systemPrompt').value = result.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  document.getElementById('docsUrl').value = result.docsUrl || '';
  document.getElementById('openaiKey').value = result.openaiKey || '';
  document.getElementById('openaiModel').value = result.openaiModel || 'gpt-4o';
  document.getElementById('temperature').value = result.temperature || 0.7;
  document.getElementById('maxTokens').value = result.maxTokens || 1000;
  document.getElementById('keyboardShortcut').value = result.keyboardShortcut || 'Ctrl+Shift+G';
  
  // Check cache status after loading settings
  checkCacheStatus(result.docsUrl);
});

// Add event listener to restore default prompt when cleared
document.getElementById('systemPrompt').addEventListener('blur', function() {
  if (this.value.trim() === '') {
    this.value = DEFAULT_SYSTEM_PROMPT;
    // Save the restored default
    chrome.storage.local.set({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
  }
});

// Check cache status for the docs URL
function checkCacheStatus(docsUrl) {
  const statusElement = document.getElementById('cacheStatus');
  
  if (!docsUrl) {
    statusElement.textContent = 'No docs URL configured';
    statusElement.className = 'cache-status cache-not-cached';
    return;
  }
  
  const cacheKey = `docs_cache_${docsUrl}`;
  const timestampKey = `docs_timestamp_${docsUrl}`;
  
  chrome.storage.local.get([cacheKey, timestampKey], (result) => {
    const cachedDocs = result[cacheKey];
    const cachedTimestamp = result[timestampKey];
    
    if (cachedDocs && cachedTimestamp) {
      const now = Date.now();
      const ageHours = Math.floor((now - cachedTimestamp) / (1000 * 60 * 60));
      const ageText = ageHours < 1 ? 'less than 1 hour' : `${ageHours} hour${ageHours > 1 ? 's' : ''}`;
      
      statusElement.textContent = `Documentation cached (${ageText} ago)`;
      statusElement.className = 'cache-status cache-cached';
    } else {
      statusElement.textContent = 'Documentation not cached';
      statusElement.className = 'cache-status cache-not-cached';
    }
  });
}

// Clear cache button handler
document.getElementById('clearCache').onclick = () => {
  chrome.runtime.sendMessage({ action: 'clearDocsCache' }, (response) => {
    if (response && response.success) {
      const statusElement = document.getElementById('cacheStatus');
      statusElement.textContent = 'Cache cleared successfully';
      statusElement.className = 'cache-status cache-not-cached';
      
      // Refresh cache status after a brief delay
      setTimeout(() => {
        const docsUrl = document.getElementById('docsUrl').value;
        checkCacheStatus(docsUrl);
      }, 500);
    } else {
      const statusElement = document.getElementById('cacheStatus');
      statusElement.textContent = 'Error clearing cache';
      statusElement.className = 'cache-status cache-error';
    }
  });
};

// Update cache status when docs URL changes
document.getElementById('docsUrl').addEventListener('blur', function() {
  checkCacheStatus(this.value);
});

document.getElementById('save').onclick = () => {
  const systemPrompt = document.getElementById('systemPrompt').value.trim() || DEFAULT_SYSTEM_PROMPT;
  const docsUrl = document.getElementById('docsUrl').value;
  const openaiKey = document.getElementById('openaiKey').value;
  const openaiModel = document.getElementById('openaiModel').value;
  const temperature = parseFloat(document.getElementById('temperature').value) || 0.7;
  const maxTokens = parseInt(document.getElementById('maxTokens').value) || 1000;
  const keyboardShortcut = document.getElementById('keyboardShortcut').value || 'Ctrl+Shift+G';
  
  chrome.storage.local.set({ systemPrompt, docsUrl, openaiKey, openaiModel, temperature, maxTokens, keyboardShortcut }, () => {
    // Clear docs cache when settings are saved
    chrome.runtime.sendMessage({ action: 'clearDocsCache' }, (response) => {
      if (response && response.success) {
        console.log('Docs cache cleared');
      }
      alert('Settings saved!');
      
      // Update cache status after saving
      checkCacheStatus(docsUrl);
    });
  });
};