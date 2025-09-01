const DEFAULT_SYSTEM_PROMPT = `You are a helpful customer support agent for [Company Name]. Please provide clear, concise, and friendly responses to customer inquiries.

Guidelines:
- Be authoritative yet approachable in your tone
- Keep responses concise but complete
- Always reference relevant documentation links when applicable
- Use a helpful, professional tone
- If you mention documentation, include the specific URL
- Structure your response clearly with bullet points or numbered lists when helpful
- Do not make use of markdown headings
- You can make tasteful use of emojis
- End with an offer to help further if needed

When referencing documentation, format links as: [Link Text](URL)`;

// Load saved settings when popup opens
chrome.storage.local.get([
  'systemPrompt', 'docsUrl', 'openaiKey', 'openaiModel',
  'temperature', 'maxTokens', 'keyboardShortcut',
  'gpt5ReasoningEffort', 'gpt5TextVerbosity', 'gpt5MaxOutputTokens',
  'gpt5ServiceTier', 'gpt5ParallelToolCalls'
], (result) => {
  document.getElementById('systemPrompt').value = result.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  document.getElementById('docsUrl').value = result.docsUrl || '';
  document.getElementById('openaiKey').value = result.openaiKey || '';
  document.getElementById('openaiModel').value = result.openaiModel || 'gpt-5';
  document.getElementById('temperature').value = result.temperature || 0.7;
  document.getElementById('maxTokens').value = result.maxTokens || 1000;
  document.getElementById('keyboardShortcut').value = result.keyboardShortcut || 'Ctrl+Shift+G';
  // GPT-5 defaults
  (document.getElementById('gpt5ReasoningEffort') || {}).value = result.gpt5ReasoningEffort || 'high';
  (document.getElementById('gpt5TextVerbosity') || {}).value = result.gpt5TextVerbosity || 'medium';
  const mo = (typeof result.gpt5MaxOutputTokens === 'number') ? result.gpt5MaxOutputTokens : '';
  if (document.getElementById('gpt5MaxOutputTokens')) document.getElementById('gpt5MaxOutputTokens').value = mo;
  (document.getElementById('gpt5ServiceTier') || {}).value = (typeof result.gpt5ServiceTier === 'string') ? result.gpt5ServiceTier : '';
  if (document.getElementById('gpt5ParallelToolCalls')) document.getElementById('gpt5ParallelToolCalls').checked = result.gpt5ParallelToolCalls !== false;
  
  // Check cache status after loading settings
  checkCacheStatus(result.docsUrl);
  
  // Feedback removed
});

// Add event listener to restore default prompt when cleared
document.getElementById('systemPrompt').addEventListener('blur', function() {
  if (this.value.trim() === '') {
    this.value = DEFAULT_SYSTEM_PROMPT;
    // Save the restored default
    chrome.storage.local.set({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
  }
});

// Feedback removed

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

// Feedback system removed

// Feedback removed

// Feedback removed

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
  // GPT-5 tuning
  const gpt5ReasoningEffort = document.getElementById('gpt5ReasoningEffort')?.value || 'high';
  const gpt5TextVerbosity = document.getElementById('gpt5TextVerbosity')?.value || 'medium';
  const gpt5MaxOutputTokensRaw = document.getElementById('gpt5MaxOutputTokens')?.value || '';
  const gpt5MaxOutputTokens = gpt5MaxOutputTokensRaw === '' ? null : parseInt(gpt5MaxOutputTokensRaw, 10);
  const gpt5ServiceTier = document.getElementById('gpt5ServiceTier')?.value || '';
  const gpt5ParallelToolCalls = document.getElementById('gpt5ParallelToolCalls')?.checked !== false;

  chrome.storage.local.set({
    systemPrompt, docsUrl, openaiKey, openaiModel, temperature, maxTokens, keyboardShortcut,
    gpt5ReasoningEffort, gpt5TextVerbosity, gpt5MaxOutputTokens, gpt5ServiceTier, gpt5ParallelToolCalls
  }, () => {
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
