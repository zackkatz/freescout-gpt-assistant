async function loadSettings(retries = 5, delayMs = 200) {
  const keys = [
    'systemPrompt', 'docsUrl', 'openaiKey', 'openaiModel',
    'temperature', 'maxTokens', 'keyboardShortcut',
    // GPT-5 tuning keys
    'gpt5ReasoningEffort', 'gpt5TextVerbosity', 'gpt5MaxOutputTokens',
    'gpt5ServiceTier', 'gpt5ParallelToolCalls'
  ];

  const defaults = {
    systemPrompt: '',
    docsUrl: '',
    openaiKey: '',
    openaiModel: 'gpt-5',
    temperature: 0.7,
    maxTokens: 1000,
    keyboardShortcut: 'Ctrl+Shift+G'
  };

  return new Promise((resolve) => {
    const attempt = (remaining, wait) => {
      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            if (remaining > 0) {
              return setTimeout(() => attempt(remaining - 1, wait * 2), wait);
            }
            console.debug('Storage get failed; using defaults:', chrome.runtime.lastError);
            return resolve(defaults);
          }
          return resolve({
            ...defaults,
            ...result,
            temperature: result && result.temperature ? result.temperature : defaults.temperature,
            maxTokens: result && result.maxTokens ? result.maxTokens : defaults.maxTokens
          });
        });
      } catch (e) {
        if (remaining > 0) {
          return setTimeout(() => attempt(remaining - 1, wait * 2), wait);
        }
        console.debug('Storage access exception; using defaults.');
        return resolve(defaults);
      }
    };
    attempt(retries, delayMs);
  });
}

async function loadDocs(url) {
  if (!url) return [];
  
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { action: 'fetchDocs', url },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Extension context error in loadDocs:', chrome.runtime.lastError);
            resolve([]);
            return;
          }
          if (response && response.success) {
            resolve(response.docs);
          } else {
            console.error('Error loading docs:', response?.error);
            resolve([]);
          }
        }
      );
    } catch (error) {
      console.error('Extension context invalidated in loadDocs:', error);
      resolve([]);
    }
  });
}

function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  try {
    // Remove or replace problematic characters
    let sanitized = text
      // Replace null bytes and other control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Replace problematic Unicode characters that might cause JSON issues
      .replace(/[\uFFFE\uFFFF]/g, '')
      // Replace unpaired surrogates
      .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
      .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    // Test if the string can be JSON serialized
    JSON.stringify(sanitized);
    
    return sanitized;
  } catch (error) {
    console.warn('Text sanitization failed, using fallback:', error);
    // Fallback: keep only basic ASCII and common Unicode
    return text.replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, '').trim();
  }
}

function extractThread() {
  const messages = [];
  
  // Find all thread items (messages, notes, etc.)
  const threadItems = document.querySelectorAll('.thread-item');
  
  threadItems.forEach(item => {
    const content = item.querySelector('.thread-content');
    const person = item.querySelector('.thread-person');
    
    if (!content) return;
    
    const messageText = sanitizeText(content.innerText.trim());
    const personName = sanitizeText(person ? person.innerText.trim() : 'Unknown');
    
    if (item.classList.contains('thread-type-customer')) {
      messages.push({
        role: 'user',
        content: `Customer (${personName}): ${messageText}`
      });
    } else if (item.classList.contains('thread-type-message')) {
      messages.push({
        role: 'assistant',
        content: `Agent (${personName}): ${messageText}`
      });
    } else if (item.classList.contains('thread-type-note')) {
      messages.push({
        role: 'user',
        content: `Internal Note from ${personName}: ${messageText}`
      });
    }
  });
  
  // Fallback to original method if no structured messages found
  if (messages.length === 0) {
    const fallbackContent = [...document.querySelectorAll('div.thread-content')]
      .map(el => sanitizeText(el.innerText.trim()))
      .join("\n\n");
    
    if (fallbackContent) {
      messages.push({
        role: 'user',
        content: fallbackContent
      });
    }
  }
  
  return messages;
}

function showGeneratingStatus() {
  const noteEditable = document.querySelector('.note-editable');
  const textarea = document.querySelector('textarea#body');
  
  if (noteEditable) {
    // hide AI hint while generating
    const hint = noteEditable.querySelector('.ai-hint-placeholder');
    if (hint) hint.style.display = 'none';
    if (!noteEditable.style.position) noteEditable.style.position = 'relative';
    let overlay = noteEditable.querySelector('.ai-status-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'ai-status-overlay';
      overlay.style.position = 'absolute';
      overlay.style.left = '8px';
      overlay.style.top = '8px';
      overlay.style.color = '#6c757d';
      overlay.style.fontStyle = 'italic';
      overlay.style.opacity = '0.8';
      overlay.style.pointerEvents = 'none';
      overlay.textContent = '🤖 Generating AI response...';
      noteEditable.appendChild(overlay);
    } else {
      overlay.style.display = 'block';
    }
  } else if (textarea) {
    textarea.value = '🤖 Generating AI response...';
    textarea.style.opacity = '0.7';
  }
}

function clearGeneratingStatus() {
  const noteEditable = document.querySelector('.note-editable');
  const textarea = document.querySelector('textarea#body');
  
  if (noteEditable) {
    const overlay = noteEditable.querySelector('.ai-status-overlay');
    if (overlay) overlay.remove();
    noteEditable.style.opacity = '1';
  } else if (textarea) {
    textarea.style.opacity = '1';
  }
}

function injectReply(reply) {
  // Clear any generating status first
  clearGeneratingStatus();
  
  // FreeScout uses Summernote WYSIWYG editor
  const noteEditable = document.querySelector('.note-editable');
  const textarea = document.querySelector('textarea#body');
  
  if (noteEditable) {
    // Clear existing content and insert new reply
    noteEditable.innerHTML = '';
    
    // Convert markdown to HTML: links, bold text, and line breaks
    let htmlReply = reply
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    
    noteEditable.innerHTML = htmlReply;
    
    // Trigger input events to notify Summernote of changes
    noteEditable.dispatchEvent(new Event('input', { bubbles: true }));
    noteEditable.dispatchEvent(new Event('keyup', { bubbles: true }));
    
    // Also update the hidden textarea if it exists (convert HTML back to plain text)
    if (textarea) {
      const plainTextReply = reply
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold asterisks for plain text
      textarea.value = plainTextReply;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    
    // Focus the editor
    noteEditable.focus();
    
    console.log('Reply injected into Summernote editor with HTML formatting');
  } else if (textarea) {
    // Fallback to textarea if Summernote not found
    textarea.value = reply;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.focus();
    console.log('Reply injected into textarea fallback');
  } else {
    console.error('Could not find reply editor');
  }
  
  // Feedback system removed for simplicity
}

// --- AI hint placeholder in editor ---
function initAIHintPlaceholder() {
  try {
    const noteEditable = document.querySelector('.note-editable');
    const textarea = document.querySelector('textarea#body');
    
    const withShortcut = (cb) => {
      try {
        loadSettings().then(settings => {
          const s = (settings && settings.keyboardShortcut) ? settings.keyboardShortcut : 'Ctrl+Shift+G';
          // Display hint as Ctrl/Cmd for cross-platform clarity
          const display = s.replace(/^Ctrl\+/, 'Ctrl/Cmd+');
          cb(display);
        }).catch(() => cb('Ctrl/Cmd+Shift+G'));
      } catch (_) {
        cb('Ctrl/Cmd+Shift+G');
      }
    };

    if (noteEditable) {
      if (!noteEditable.style.position) noteEditable.style.position = 'relative';
      let hint = noteEditable.querySelector('.ai-hint-placeholder');
      if (!hint) {
        hint = document.createElement('div');
        hint.className = 'ai-hint-placeholder';
        hint.style.position = 'absolute';
        hint.style.left = '8px';
        hint.style.top = '8px';
        hint.style.color = '#6c757d';
        hint.style.opacity = '0.6';
        hint.style.fontStyle = 'italic';
        hint.style.zIndex = '2';
        hint.style.pointerEvents = 'none';
        hint.style.userSelect = 'none';
        withShortcut((shortcutText) => {
          hint.textContent = `Tip: Press ${shortcutText} to generate with AI`;
        });
        noteEditable.appendChild(hint);
      }

      const isEmpty = () => {
        const html = (noteEditable.innerHTML || '')
          .replace(/<br\s*\/?>/gi, '')
          .replace(/&nbsp;/gi, '')
          .replace(/\s+/g, '')
          .trim();
        return html.length === 0;
      };
      const toggle = () => { hint.style.display = isEmpty() ? 'block' : 'none'; };
      noteEditable.addEventListener('input', toggle);
      noteEditable.addEventListener('keyup', toggle);
      noteEditable.addEventListener('paste', toggle);
      noteEditable.addEventListener('focus', toggle, true);
      // Ensure visible by default; events will hide it when content appears
      hint.style.display = 'block';
    } else if (textarea) {
      // Fallback for plain textarea
      if (!textarea.placeholder || textarea.placeholder.indexOf('Tip:') === -1) {
        withShortcut((shortcutText) => {
          textarea.placeholder = `Tip: Press ${shortcutText} to generate with AI`;
        });
      }
    }
  } catch (e) {
    console.warn('AI hint placeholder init failed:', e);
  }
}

// Attempt to mount hint after DOM settles
setTimeout(initAIHintPlaceholder, 800);

// Also observe DOM changes to re-init when editor is replaced
try {
  const mo = new MutationObserver(() => {
    if (document.querySelector('.note-editable') && !document.querySelector('.note-editable .ai-hint-placeholder')) {
      initAIHintPlaceholder();
    }
  });
  mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
} catch(_) {}

// Feedback system removed

function parseKeyboardShortcut(shortcutString) {
  const defaultShortcut = 'Ctrl+Shift+G';
  const shortcut = shortcutString || defaultShortcut;
  const parts = shortcut.toLowerCase().split('+').map(s => s.trim());
  
  return {
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts[parts.length - 1].toUpperCase()
  };
}

function getCurrentUserName() {
  const navUser = document.querySelector('span.nav-user');
  if (navUser) {
    return navUser.textContent.trim();
  }
  return null;
}

function analyzeUserTone(threadMessages, currentUser) {
  if (!currentUser) return '';
  
  // Find messages from the current user
  const userMessages = threadMessages.filter(msg => 
    msg.role === 'assistant' && 
    msg.content.includes(`Agent (${currentUser}):`)
  );
  
  if (userMessages.length === 0) return '';
  
  // Extract just the message content without the "Agent (Name):" prefix
  const userReplies = userMessages.map(msg => 
    msg.content.replace(`Agent (${currentUser}): `, '')
  );
  
  if (userReplies.length === 0) return '';
  
  return `\n\nBased on ${currentUser}'s previous responses in this conversation, please match their communication style and tone. Here are their previous replies:\n${userReplies.map((reply, i) => `${i + 1}. ${reply}`).join('\n')}`;
}

function extractWordPressCustomerInfo() {
  const wpWidget = document.querySelector('#wordpress-freescout');
  if (!wpWidget) return null;

  const customerInfo = {};

  try {
    // Extract customer name and basic info
    const userLink = wpWidget.querySelector('a[href*="user-edit.php"]');
    if (userLink) {
      customerInfo.name = sanitizeText(userLink.textContent.trim());
    }

    // Extract basic customer details from the first list
    const basicInfoList = wpWidget.querySelector('.wordpress-orders-list');
    if (basicInfoList) {
      const listItems = basicInfoList.querySelectorAll('li');
      listItems.forEach(item => {
        const label = item.querySelector('label');
        if (label) {
          const labelText = sanitizeText(label.textContent.trim());
          const value = sanitizeText(item.textContent.replace(label.textContent, '').trim());
          
          switch (labelText) {
            case 'Registered':
              customerInfo.registered = value;
              break;
            case 'Actve CRM':
              customerInfo.activeCRM = value;
              break;
            case 'Last License Check':
              customerInfo.lastLicenseCheck = value;
              break;
            case 'Version':
              const versionSpan = item.querySelector('.label');
              if (versionSpan) {
                customerInfo.version = sanitizeText(versionSpan.textContent.trim());
                customerInfo.versionStatus = versionSpan.classList.contains('label-danger') ? 'outdated' : 'current';
              }
              break;
          }
        }
      });
    }

    // Extract active integrations
    const integrationsSection = Array.from(wpWidget.querySelectorAll('h5')).find(h5 => 
      h5.textContent.includes('Active Integrations')
    );
    if (integrationsSection) {
      const integrationsContainer = integrationsSection.nextElementSibling;
      if (integrationsContainer && integrationsContainer.classList.contains('label-cloud')) {
        const integrations = Array.from(integrationsContainer.querySelectorAll('.label')).map(label => 
          label.textContent.trim()
        );
        customerInfo.activeIntegrations = integrations;
      }
    }

    // Extract CRM tags
    const tagsSection = Array.from(wpWidget.querySelectorAll('h5')).find(h5 => 
      h5.textContent.includes('Tags')
    );
    if (tagsSection) {
      const tagsContainer = tagsSection.nextElementSibling;
      if (tagsContainer && tagsContainer.classList.contains('label-cloud')) {
        const tags = Array.from(tagsContainer.querySelectorAll('.label')).map(label => 
          label.textContent.trim()
        );
        customerInfo.crmTags = tags;
      }
    }

    // Extract recent orders (limit to 3 most recent)
    const ordersSection = Array.from(wpWidget.querySelectorAll('h5')).find(h5 => 
      h5.textContent.includes('EDD Orders')
    );
    if (ordersSection) {
      const ordersList = ordersSection.nextElementSibling;
      if (ordersList) {
        const orders = Array.from(ordersList.querySelectorAll('.list-group-item')).slice(0, 3).map(orderItem => {
          const order = {};
          
          // Order status
          const statusLabel = orderItem.querySelector('.label');
          if (statusLabel) {
            order.status = statusLabel.textContent.trim();
          }
          
          // Order number and amount
          const orderLink = orderItem.querySelector('a[href*="edd-payment-history"]');
          if (orderLink) {
            order.number = orderLink.textContent.trim();
          }
          
          // Extract amount (look for $ pattern)
          const amountMatch = orderItem.textContent.match(/\$[\d,]+\.?\d*/);
          if (amountMatch) {
            order.amount = amountMatch[0];
          }
          
          // Product name
          const productItem = orderItem.querySelector('.edd-order-items-list li');
          if (productItem) {
            order.product = productItem.textContent.trim().replace(/\s*-\s*\$[\d,]+\.?\d*/, '');
          }
          
          // Order date
          const orderMeta = orderItem.querySelector('.edd-order-meta');
          if (orderMeta) {
            const dateMatch = orderMeta.textContent.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
              order.date = dateMatch[0];
            }
          }
          
          return order;
        });
        customerInfo.recentOrders = orders;
      }
    }

    // Extract license information
    const licensesSection = Array.from(wpWidget.querySelectorAll('h5')).find(h5 => 
      h5.textContent.includes('EDD Licenses')
    );
    if (licensesSection) {
      const licensesList = licensesSection.nextElementSibling;
      if (licensesList) {
        const licenseItems = licensesList.querySelectorAll('.list-group-item');
        if (licenseItems.length > 0) {
          const license = {};
          const firstLicense = licenseItems[0];
          
          // License status
          const statusLabel = firstLicense.querySelector('.label');
          if (statusLabel) {
            license.status = statusLabel.textContent.trim();
          }
          
          // License number
          const licenseLink = firstLicense.querySelector('a[href*="edd-licenses"]');
          if (licenseLink) {
            license.number = licenseLink.textContent.trim();
          }
          
          // License key
          const licenseKey = firstLicense.querySelector('code');
          if (licenseKey) {
            license.key = licenseKey.textContent.trim();
          }
          
          // Active sites count
          const sitesList = firstLicense.querySelector('.edd-order-items-list');
          if (sitesList) {
            const sites = sitesList.querySelectorAll('li');
            license.activeSites = sites.length;
            // Get first few site URLs for context
            license.sampleSites = Array.from(sites).slice(0, 3).map(site => 
              site.querySelector('a') ? site.querySelector('a').textContent.trim() : site.textContent.trim()
            );
          }
          
          // Expiration date
          const orderMeta = firstLicense.querySelector('.edd-order-meta');
          if (orderMeta && orderMeta.textContent.includes('Expires')) {
            const expirationMatch = orderMeta.textContent.match(/Expires (\d{2}\/\d{2}\/\d{4})/);
            if (expirationMatch) {
              license.expires = expirationMatch[1];
            }
          }
          
          customerInfo.license = license;
        }
      }
    }

    return customerInfo;
  } catch (error) {
    console.error('Error extracting WordPress customer info:', error);
    return null;
  }
}

function formatCustomerInfoForPrompt(customerInfo) {
  if (!customerInfo) return '';

  let customerContext = '\n\n--- CUSTOMER INFORMATION ---\n';
  
  if (customerInfo.name) {
    customerContext += `Customer Name: ${customerInfo.name}\n`;
  }
  
  if (customerInfo.registered) {
    customerContext += `Registered: ${customerInfo.registered}\n`;
  }
  
  if (customerInfo.activeCRM) {
    customerContext += `CRM: ${customerInfo.activeCRM}\n`;
  }
  
  if (customerInfo.version) {
    customerContext += `Current Version: ${customerInfo.version}`;
    if (customerInfo.versionStatus === 'outdated') {
      customerContext += ' (OUTDATED - recommend updating)';
    }
    customerContext += '\n';
  }
  
  if (customerInfo.lastLicenseCheck) {
    customerContext += `Last License Check: ${customerInfo.lastLicenseCheck}\n`;
  }
  
  if (customerInfo.activeIntegrations && customerInfo.activeIntegrations.length > 0) {
    customerContext += `Active Integrations: ${customerInfo.activeIntegrations.join(', ')}\n`;
  }
  
  if (customerInfo.crmTags && customerInfo.crmTags.length > 0) {
    customerContext += `CRM Tags: ${customerInfo.crmTags.join(', ')}\n`;
  }
  
  if (customerInfo.license) {
    customerContext += `\nLicense Information:\n`;
    customerContext += `- Status: ${customerInfo.license.status || 'Unknown'}\n`;
    if (customerInfo.license.expires) {
      customerContext += `- Expires: ${customerInfo.license.expires}\n`;
    }
    if (customerInfo.license.activeSites) {
      customerContext += `- Active Sites: ${customerInfo.license.activeSites}\n`;
    }
    if (customerInfo.license.sampleSites && customerInfo.license.sampleSites.length > 0) {
      customerContext += `- Sample Sites: ${customerInfo.license.sampleSites.join(', ')}\n`;
    }
  }
  
  if (customerInfo.recentOrders && customerInfo.recentOrders.length > 0) {
    customerContext += `\nRecent Orders:\n`;
    customerInfo.recentOrders.forEach((order, index) => {
      customerContext += `${index + 1}. ${order.status || 'Unknown'} - ${order.number || 'N/A'} - ${order.amount || 'N/A'}`;
      if (order.product) {
        customerContext += ` - ${order.product}`;
      }
      if (order.date) {
        customerContext += ` (${order.date})`;
      }
      customerContext += '\n';
    });
  }
  
  customerContext += '\nUse this customer information to provide personalized support and relevant recommendations.\n';
  
  return customerContext;
}

function extractExistingContext() {
  const noteEditable = document.querySelector('.note-editable');
  const textarea = document.querySelector('textarea#body');
  
  let existingContext = '';
  
  if (noteEditable) {
    // Extract text content from the WYSIWYG editor
    existingContext = sanitizeText(noteEditable.innerText.trim());
  } else if (textarea) {
    // Extract from textarea
    existingContext = sanitizeText(textarea.value.trim());
  }
  
  // Only return context if it's not empty and not the generating status message
  if (existingContext && !existingContext.includes('🤖 Generating AI response...')) {
    return existingContext;
  }
  
  return '';
}

document.addEventListener('keydown', async (e) => {
  const { systemPrompt, docsUrl, openaiKey, openaiModel, temperature, maxTokens, keyboardShortcut,
    gpt5ReasoningEffort, gpt5TextVerbosity, gpt5MaxOutputTokens, gpt5ServiceTier, gpt5ParallelToolCalls } = await loadSettings();
  const shortcut = parseKeyboardShortcut(keyboardShortcut);
  
  const matchesShortcut = 
    ((shortcut.ctrl && e.ctrlKey) || (shortcut.meta && e.metaKey)) &&
    (shortcut.shift === e.shiftKey) &&
    (shortcut.alt === e.altKey) &&
    e.key.toUpperCase() === shortcut.key;

  if (matchesShortcut) {
    try {
      // Validate API key first
      if (!openaiKey || openaiKey.trim() === '') {
        injectReply('Error: No OpenAI API key configured. Please set your API key in the extension settings.');
        return;
      }
      
      // Extract any existing context from the textarea before showing generating status
      const existingContext = extractExistingContext();
      
      // Show generating status immediately
      showGeneratingStatus();
      
      const docs = await loadDocs(docsUrl);
      const threadMessages = extractThread();
      const currentUser = getCurrentUserName();
      const customerInfo = extractWordPressCustomerInfo();
      
      // Build documentation context from actual content
      let docsContext = '';
      if (docs && docs.length > 0) {
        docsContext = docs.map(doc => {
          let docText = `## ${doc.title}\n`;
          if (doc.url) docText += `URL: ${doc.url}\n`;
          if (doc.content) docText += `${doc.content.trim()}\n`;
          return docText;
        }).join('\n---\n');
      }

  // Build the system message
  let systemMessage = systemPrompt || 'You are a helpful customer support agent.';
      
      // Add user name instruction if available
      if (currentUser) {
        systemMessage += `\n\nYour name is ${currentUser}. End your response with an appropriate brief sign-off using your name (e.g., "Best, ${currentUser}" or "Cheers, ${currentUser}"). Do not include any company signature as it will be automatically appended.`;
      }
      
      // Add documentation context to system message if available (llms.txt)
      if (docsContext) {
        systemMessage += `\n\nRelevant documentation (from llms.txt):\n${docsContext}`;
      }

      // Targeted documentation fetch based on conversation keywords
      const targetedDocs = await fetchTargetedDocs(threadMessages);
      if (targetedDocs && targetedDocs.length > 0) {
        const targetedBlock = targetedDocs.map(d => `# ${d.title || d.url}\nURL: ${d.url}\n${(d.text || '').slice(0, 3000)}`).join('\n---\n');
        systemMessage += `\n\nRelevant documentation (targeted):\n${targetedBlock}`;
      }
      
      // Add customer information if available
      const customerContext = formatCustomerInfoForPrompt(customerInfo);
      if (customerContext) {
        systemMessage += customerContext;
      }
      
      // Add existing context if available
      if (existingContext) {
        systemMessage += `\n\n--- ADDITIONAL CONTEXT ---\nThe agent has provided the following context/notes to consider when generating the response:\n${existingContext}\n\nPlease incorporate this context appropriately into your response.`;
      }
      
      // Analyze and match user's tone from previous messages
      const toneAnalysis = analyzeUserTone(threadMessages, currentUser);
      if (toneAnalysis) {
        systemMessage += toneAnalysis;
      }
      
      systemMessage += '\n\nRespond concisely and helpfully to the customer based on the conversation history.';
      systemMessage += '\n\nCitations policy: When producing structured output, include citations only for authoritative pages (prefer wpfusion.com; include vendor docs like woocommerce.com only when directly relevant). Do not invent links. Leave citations empty if none are needed.';

      // Build the messages array
      const messages = [
        { role: 'system', content: systemMessage },
        ...threadMessages
      ];
      
      // Add a final instruction if we have conversation history
      if (threadMessages.length > 0) {
        messages.push({
          role: 'user',
          content: 'Please provide a helpful response to continue this conversation.'
        });
      }

      // Sanitize all message content before sending to API
      const sanitizedMessages = messages.map(msg => ({
        ...msg,
        content: sanitizeText(msg.content)
      }));
      
      // Also sanitize the system message
      const sanitizedSystemMessage = sanitizeText(systemMessage);
      
      // Conversation messages without system to avoid duplication across APIs
      const conversationMessages = sanitizedMessages.filter(m => m.role !== 'system');
      
      // Check if using GPT-5 models
      const isGPT5 = openaiModel.startsWith('gpt-5');
      
      let requestBody;
      let apiEndpoint;
      
      if (isGPT5) {
        // GPT-5 uses the new /v1/responses API (non-streaming for stability)
        apiEndpoint = "https://api.openai.com/v1/responses";

        // Use structured messages for Responses API input
        const inputMessages = [
          { role: 'system', content: sanitizedSystemMessage },
          ...conversationMessages
        ];

        // Build request via dedicated GPT-5 helper for easy experimentation
        if (typeof window.GPT5 === 'object' && typeof window.GPT5.buildRequest === 'function') {
          const overrides = {
            reasoningEffort: gpt5ReasoningEffort || 'minimal',
            textVerbosity: gpt5TextVerbosity || 'low',
            parallelToolCalls: gpt5ParallelToolCalls !== false,
            // Structured outputs schema: answer + citations
            responseFormatJSONSchema: buildStructuredSchema(),
            // Prompt caching: stable key derived from prompt + docs
            promptCacheKey: await computePromptCacheKey(sanitizedSystemMessage)
          };
          if (typeof gpt5MaxOutputTokens === 'number') overrides.maxOutputTokens = gpt5MaxOutputTokens;
          if (gpt5ServiceTier) overrides.serviceTier = gpt5ServiceTier;
          requestBody = window.GPT5.buildRequest({ model: openaiModel, input: inputMessages, overrides });
        } else {
          // Fallback (should not happen): minimal compatible request
          requestBody = { model: openaiModel, input: inputMessages };
        }
      } else {
        // Legacy models use /v1/chat/completions
        apiEndpoint = "https://api.openai.com/v1/chat/completions";
        requestBody = {
          model: openaiModel,
          messages: [
            { role: 'system', content: sanitizedSystemMessage },
            ...conversationMessages
          ],
          temperature: temperature,
          max_tokens: maxTokens
        };
      }
      
      // Validate JSON serialization
      try {
        JSON.stringify(requestBody);
      } catch (jsonError) {
        throw new Error(`JSON serialization failed: ${jsonError.message}. This usually indicates malformed UTF-8 characters in the conversation.`);
      }

      // Single non-streaming request for all models
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey.trim()}`,
          "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();
      
      // Check for API errors
      if (!res.ok) {
        let errorMessage = `API Error (${res.status}): `;
        if (data && data.error) {
          errorMessage += data.error.message || data.error.type || 'Unknown error';
        } else {
          errorMessage += res.statusText || 'Request failed';
        }
        throw new Error(errorMessage);
      }
      
      // Extract reply based on API type
      let reply;
      let structured = null;
      if (isGPT5) {
        if (typeof window.GPT5 === 'object' && typeof window.GPT5.extractReply === 'function') {
          reply = window.GPT5.extractReply(data);
        } else {
          reply = (data && typeof data.output_text === 'string') ? data.output_text : '';
        }
        // Try to parse structured JSON (answer + citations)
        if (reply && typeof reply === 'string' && reply.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(reply);
            if (parsed && (parsed.answer || parsed.citations)) {
              structured = parsed;
            }
          } catch(_) {}
        }
      } else {
        reply = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      }
      
      if ((!reply || (typeof reply === 'string' && reply.trim() === '')) && !structured) {
        throw new Error('No response content received from OpenAI API');
      }
      
      if (structured && structured.answer) {
        const finalText = formatStructuredAnswer(structured);
        injectReply(finalText);
      } else {
        injectReply(typeof reply === 'string' ? reply : String(reply));
      }
    } catch (error) {
      console.error('Error generating response:', error);
      clearGeneratingStatus();
      
      // Enhanced error message for UTF-8 issues
      let errorMessage = 'Error generating AI response: ';
      if (error.message) {
        errorMessage += error.message;
        
        // Specific guidance for UTF-8 issues
        if (error.message.includes('malformed') || error.message.includes('UTF-8') || error.message.includes('JSON serialization')) {
          errorMessage += '\n\n🔧 This appears to be a text encoding issue. The conversation may contain special characters that need to be cleaned. Please try refreshing the page and trying again.';
        }
      } else {
        errorMessage += 'Unknown error occurred';
      }
      errorMessage += '\n\nPlease check your settings and try again.';
      
      injectReply(errorMessage);
    }
  }
});

// Build JSON schema for structured outputs (answer + citations)
function buildStructuredSchema() {
  return {
    name: 'wp_fusion_support_reply',
    schema: {
      type: 'object',
      properties: {
        answer: { type: 'string', description: 'The support reply text formatted for the customer.' },
        citations: {
          type: 'array',
          description: 'List of documentation links cited to support the answer. Only include authoritative links.',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              title: { type: 'string' }
            },
            required: ['url','title'],
            additionalProperties: false
          }
        }
      },
      required: ['answer','citations'],
      additionalProperties: false
    },
    strict: true
  };
}

// Compute a stable prompt cache key for the current prompt/docs
async function computePromptCacheKey(prompt) {
  const input = `v1|${prompt}`;
  try {
    if (window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder().encode(input);
      const digest = await crypto.subtle.digest('SHA-256', enc);
      return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_) {}
  // Fallback: simple hash
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return `fnv1a_${(h >>> 0).toString(16)}`;
}

// Convert structured answer to final text with citations in Markdown
function formatStructuredAnswer(obj) {
  const ans = (obj.answer || '').trim();
  const cites = Array.isArray(obj.citations) ? obj.citations : [];
  if (!cites.length) return ans;
  const tail = '\n\nSources:\n' + cites.map(c => {
    const url = c.url || '';
    const title = (c.title && c.title.trim()) || url;
    return `- [${title}](${url})`;
  }).join('\n');
  return ans + tail;
}

// Fetch targeted docs based on keywords in the conversation
async function fetchTargetedDocs(messages) {
  try {
    const text = (messages || []).map(m => (m && m.content) || '').join(' ').toLowerCase();
    const mappings = [
      { key: /woocommerce|woo\b/, url: 'https://wpfusion.com/documentation/ecommerce/woocommerce/', title: 'WooCommerce Integration' },
      { key: /easy\s*digital\s*downloads|\bedd\b/, url: 'https://wpfusion.com/documentation/ecommerce/easy-digital-downloads/', title: 'Easy Digital Downloads Integration' },
      { key: /gravity\s*forms|gravityforms|gf\b/, url: 'https://wpfusion.com/documentation/lead-generation/gravity-forms/', title: 'Gravity Forms Integration' },
      { key: /learndash/, url: 'https://wpfusion.com/documentation/learning-management/learndash/', title: 'LearnDash Integration' }
    ];
    const candidates = mappings.filter(m => m.key.test(text)).slice(0, 2);
    if (!candidates.length) return [];
    const results = [];
    for (const c of candidates) {
      const res = await new Promise(resolve => {
        try {
          chrome.runtime.sendMessage({ action: 'fetchPageText', url: c.url, maxChars: 8000 }, (r) => {
            if (chrome.runtime.lastError || !r || !r.success) return resolve(null);
            resolve({ url: r.url, title: r.title || c.title, text: r.text || '' });
          });
        } catch (e) {
          resolve(null);
        }
      });
      if (res && res.text) results.push(res);
    }
    return results;
  } catch (e) {
    console.warn('Targeted docs fetch failed:', e);
    return [];
  }
}
