// Background script placeholder
chrome.runtime.onInstalled.addListener(() => {
  console.log("FreeScout GPT Assistant installed.");
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchDocs') {
    fetchDocsWithCache(request.url)
      .then(docs => sendResponse({ success: true, docs }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  } else if (request.action === 'clearDocsCache') {
    clearDocsCache()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'fetchPageText') {
    fetchPageTextWithCache(request.url, request.maxChars || 8000, request.ttlMs || (24*60*60*1000))
      .then(payload => sendResponse({ success: true, ...payload }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function fetchDocsWithCache(url) {
  if (!url) return [];
  
  // Check cache first
  const cacheKey = `docs_cache_${url}`;
  const timestampKey = `docs_timestamp_${url}`;
  
  try {
    const result = await chrome.storage.local.get([cacheKey, timestampKey]);
    const cachedDocs = result[cacheKey];
    const cachedTimestamp = result[timestampKey];
    
    // Check if cache is valid (less than 24 hours old)
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    if (cachedDocs && cachedTimestamp && (now - cachedTimestamp) < oneDayInMs) {
      console.log('Using cached docs for:', url);
      return cachedDocs;
    }
    
    // Cache is invalid or doesn't exist, fetch fresh data
    console.log('Fetching fresh docs for:', url);
    const docs = await fetchDocs(url);
    
    // Store in cache with timestamp
    await chrome.storage.local.set({
      [cacheKey]: docs,
      [timestampKey]: now
    });
    
    return docs;
  } catch (error) {
    console.error('Error with docs cache:', error);
    // Fallback to direct fetch if cache fails
    return await fetchDocs(url);
  }
}

async function clearDocsCache() {
  try {
    // Get all storage keys
    const allItems = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allItems).filter(key => 
      key.startsWith('docs_cache_') || key.startsWith('docs_timestamp_')
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log('Cleared docs cache:', keysToRemove.length, 'items');
    }
  } catch (error) {
    console.error('Error clearing docs cache:', error);
  }
}

async function fetchDocs(url) {
  if (!url) return [];
  
  try {
    // Add cache-busting query parameter
    const urlWithCacheBuster = url + (url.includes('?') ? '&' : '?') + `cb=${Date.now()}`;
    
    const response = await fetch(urlWithCacheBuster, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const text = await response.text();
    const docs = [];
    const lines = text.split('\n');
    let currentDoc = null;
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        if (currentDoc) docs.push(currentDoc);
        currentDoc = { title: line.slice(2).trim(), content: '', url: '' };
      } else if (line.startsWith('URL: ') && currentDoc) {
        currentDoc.url = line.slice(5).trim();
      } else if (currentDoc && line.trim()) {
        currentDoc.content += line + '\n';
      }
    }
    
    if (currentDoc) docs.push(currentDoc);
    return docs;
  } catch (error) {
    console.error('Error fetching docs:', error);
    return [];
  }
}

// Fetch and cache arbitrary HTML pages, return plain text and <title>
async function fetchPageTextWithCache(url, maxChars, ttlMs) {
  if (!url) throw new Error('No URL provided');
  const cacheKey = `page_cache_${url}`;
  const timeKey = `page_cache_ts_${url}`;
  try {
    const stored = await chrome.storage.local.get([cacheKey, timeKey]);
    const ts = stored[timeKey];
    const now = Date.now();
    if (stored[cacheKey] && ts && (now - ts) < ttlMs) {
      return stored[cacheKey];
    }

    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    let html = await resp.text();
    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    // Strip scripts/styles and tags
    html = html.replace(/<script[\s\S]*?<\/script>/gi, '')
               .replace(/<style[\s\S]*?<\/style>/gi, '');
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxChars);
    const payload = { url, title, text };
    await chrome.storage.local.set({ [cacheKey]: payload, [timeKey]: now });
    return payload;
  } catch (e) {
    console.error('Error fetching page text:', e);
    throw e;
  }
}

// Feedback utilities removed
