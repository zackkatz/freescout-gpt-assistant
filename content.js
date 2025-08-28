async function loadSettings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['systemPrompt', 'docsUrl', 'openaiKey', 'openaiModel', 'temperature', 'maxTokens', 'keyboardShortcut', 'enableFeedback'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Extension context error:', chrome.runtime.lastError);
          resolve({ 
            systemPrompt: '', 
            docsUrl: '', 
            openaiKey: '', 
            openaiModel: 'gpt-5', 
            temperature: 0.7, 
            maxTokens: 1000, 
            keyboardShortcut: 'Ctrl+Shift+G' 
          });
          return;
        }
        resolve({
          ...result,
          temperature: result.temperature || 0.7,
          maxTokens: result.maxTokens || 1000
        });
      });
    } catch (error) {
      console.error('Extension context invalidated:', error);
      resolve({ 
        systemPrompt: '', 
        docsUrl: '', 
        openaiKey: '', 
        openaiModel: 'gpt-4o', 
        temperature: 0.7, 
        maxTokens: 1000, 
        keyboardShortcut: 'Ctrl+Shift+G' 
      });
    }
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
    noteEditable.innerHTML = '<div style="color: #6c757d; font-style: italic;">🤖 Generating AI response...</div>';
    noteEditable.style.opacity = '0.7';
  } else if (textarea) {
    textarea.value = '🤖 Generating AI response...';
    textarea.style.opacity = '0.7';
  }
}

function clearGeneratingStatus() {
  const noteEditable = document.querySelector('.note-editable');
  const textarea = document.querySelector('textarea#body');
  
  if (noteEditable) {
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
  
  // Add feedback UI after successful injection (if enabled)
  loadSettings().then(settings => {
    if (settings.enableFeedback !== false) { // Default to true if not set
      addFeedbackUI(reply);
    }
  });
}

function addFeedbackUI(generatedResponse) {
  // Remove any existing feedback UI
  const existingFeedback = document.querySelector('.ai-feedback-container');
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  // Generate unique ID for this response
  const responseId = 'response_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  
  // Create feedback container
  const feedbackContainer = document.createElement('div');
  feedbackContainer.className = 'ai-feedback-container';
  feedbackContainer.setAttribute('data-response-id', responseId);
  
  feedbackContainer.innerHTML = `
    <div style="
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 12px;
      margin: 10px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="color: #6c757d; font-weight: 500;">How was this AI response?</span>
        <button class="feedback-btn feedback-positive" data-rating="positive" style="
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
                 ">👍 Good</button>
         <button class="feedback-btn feedback-negative" data-rating="negative" style="
           background: #dc3545;
           color: white;
           border: none;
           border-radius: 4px;
           padding: 4px 8px;
           cursor: pointer;
           font-size: 12px;
           transition: all 0.2s;
         ">👎 Needs Work</button>
      </div>
      <div class="feedback-details" style="display: none;">
        <textarea class="feedback-notes" placeholder="What could be improved? (optional)" style="
          width: 100%;
          min-height: 60px;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 12px;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 8px;
        "></textarea>
        <button class="feedback-submit" style="
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
          margin-right: 8px;
        ">Submit Feedback</button>
        <button class="feedback-cancel" style="
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
        ">Cancel</button>
      </div>
             <div class="feedback-success" style="display: none; color: #28a745; font-weight: 500;">
         ✓ Thank you for your feedback!
       </div>
    </div>
  `;
  
  // Find the best place to insert feedback UI - after the note editor panel
  const noteEditor = document.querySelector('.note-editor.note-frame.panel');
  if (noteEditor) {
    // Insert after the entire note editor panel
    noteEditor.parentNode.insertBefore(feedbackContainer, noteEditor.nextSibling);
  } else {
    // Fallback: try to find textarea and insert after its container
    const textarea = document.querySelector('textarea#body');
    if (textarea) {
      const textareaContainer = textarea.closest('.form-group') || textarea.parentNode;
      textareaContainer.parentNode.insertBefore(feedbackContainer, textareaContainer.nextSibling);
    } else {
      // Final fallback: append to conversation area
      const conversationArea = document.querySelector('.conversation-body') || document.querySelector('.thread-list');
      if (conversationArea) {
        conversationArea.appendChild(feedbackContainer);
      }
    }
  }
  
  // Add event listeners
  setupFeedbackEventListeners(feedbackContainer, responseId, generatedResponse);
}

function setupFeedbackEventListeners(container, responseId, generatedResponse) {
  const positiveBtn = container.querySelector('.feedback-positive');
  const negativeBtn = container.querySelector('.feedback-negative');
  const detailsDiv = container.querySelector('.feedback-details');
  const submitBtn = container.querySelector('.feedback-submit');
  const cancelBtn = container.querySelector('.feedback-cancel');
  const successDiv = container.querySelector('.feedback-success');
  const notesTextarea = container.querySelector('.feedback-notes');
  
  // Handle positive feedback
  positiveBtn.addEventListener('click', () => {
    handleFeedbackRating('positive', responseId, generatedResponse, container);
  });
  
  // Handle negative feedback
  negativeBtn.addEventListener('click', () => {
    handleFeedbackRating('negative', responseId, generatedResponse, container);
    // Show details form for negative feedback
    detailsDiv.style.display = 'block';
    notesTextarea.focus();
  });
  
  // Handle submit
  submitBtn.addEventListener('click', () => {
    const notes = notesTextarea.value.trim();
    submitFeedback(responseId, 'negative', notes, generatedResponse);
    detailsDiv.style.display = 'none';
    successDiv.style.display = 'block';
    positiveBtn.style.display = 'none';
    negativeBtn.style.display = 'none';
  });
  
  // Handle cancel
  cancelBtn.addEventListener('click', () => {
    detailsDiv.style.display = 'none';
    notesTextarea.value = '';
  });
  
  // Auto-hide after 30 seconds if no interaction
  setTimeout(() => {
    if (container.parentNode && !container.querySelector('.feedback-success').style.display.includes('block')) {
      container.style.opacity = '0.5';
      container.style.transition = 'opacity 0.5s';
    }
  }, 30000);
  
  // Remove after 2 minutes
  setTimeout(() => {
    if (container.parentNode) {
      container.remove();
    }
  }, 120000);
}

function handleFeedbackRating(rating, responseId, generatedResponse, container) {
  if (rating === 'positive') {
    // For positive feedback, submit immediately
    submitFeedback(responseId, rating, '', generatedResponse);
    
    // Show success message
    const successDiv = container.querySelector('.feedback-success');
    successDiv.style.display = 'block';
    container.querySelector('.feedback-positive').style.display = 'none';
    container.querySelector('.feedback-negative').style.display = 'none';
  }
  // Negative feedback is handled in the event listener to show the form
}

async function submitFeedback(responseId, rating, notes, generatedResponse) {
  try {
    // Get current context for feedback
    const threadMessages = extractThread();
    const customerInfo = extractWordPressCustomerInfo();
    
    const feedbackData = {
      id: responseId,
      timestamp: Date.now(),
      rating: rating,
      notes: notes,
      generatedResponse: generatedResponse,
      conversationContext: threadMessages.slice(-3), // Last 3 messages for context
      customerInfo: customerInfo ? {
        name: customerInfo.name,
        version: customerInfo.version,
        versionStatus: customerInfo.versionStatus
      } : null,
      url: window.location.href
    };
    
    // Store feedback locally
    const storageKey = `feedback_${responseId}`;
    await chrome.storage.local.set({[storageKey]: feedbackData});
    
    console.log('Feedback submitted:', feedbackData);
    
    // Analyze patterns if we have enough feedback
    analyzeFeedbackPatterns();
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
  }
}

async function analyzeFeedbackPatterns() {
  try {
    // Get all feedback data
    const allData = await chrome.storage.local.get(null);
    const feedbackEntries = Object.entries(allData)
      .filter(([key]) => key.startsWith('feedback_'))
      .map(([key, value]) => value)
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    if (feedbackEntries.length < 5) return; // Need at least 5 feedback entries
    
    // Analyze recent feedback (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentFeedback = feedbackEntries.filter(f => f.timestamp > thirtyDaysAgo);
    
    if (recentFeedback.length === 0) return;
    
    // Calculate metrics
    const positiveCount = recentFeedback.filter(f => f.rating === 'positive').length;
    const negativeCount = recentFeedback.filter(f => f.rating === 'negative').length;
    const successRate = positiveCount / (positiveCount + negativeCount);
    
    // Extract common issues from negative feedback
    const negativeNotes = recentFeedback
      .filter(f => f.rating === 'negative' && f.notes)
      .map(f => f.notes.toLowerCase());
    
    const commonIssues = extractCommonIssues(negativeNotes);
    
    // Store analysis results
    const analysisData = {
      timestamp: Date.now(),
      totalFeedback: recentFeedback.length,
      successRate: successRate,
      commonIssues: commonIssues,
      suggestions: generateSuggestions(commonIssues, successRate)
    };
    
    await chrome.storage.local.set({feedbackAnalysis: analysisData});
    
    console.log('Feedback analysis updated:', analysisData);
    
  } catch (error) {
    console.error('Error analyzing feedback patterns:', error);
  }
}

function extractCommonIssues(negativeNotes) {
  const issuePatterns = {
    'too_formal': ['too formal', 'stiff', 'robotic', 'cold'],
    'too_casual': ['too casual', 'unprofessional', 'informal'],
    'missing_context': ['missing context', 'generic', 'not specific', 'context'],
    'too_long': ['too long', 'verbose', 'wordy', 'lengthy'],
    'too_short': ['too short', 'brief', 'not enough detail', 'incomplete'],
    'wrong_tone': ['wrong tone', 'tone', 'attitude'],
    'technical_errors': ['wrong information', 'incorrect', 'error', 'mistake'],
    'missing_greeting': ['no greeting', 'abrupt', 'starts too quickly'],
    'missing_signature': ['no signature', 'no sign-off', 'no closing']
  };
  
  const issues = {};
  
  negativeNotes.forEach(note => {
    Object.entries(issuePatterns).forEach(([issue, patterns]) => {
      if (patterns.some(pattern => note.includes(pattern))) {
        issues[issue] = (issues[issue] || 0) + 1;
      }
    });
  });
  
  // Return issues sorted by frequency
  return Object.entries(issues)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5) // Top 5 issues
    .map(([issue, count]) => ({issue, count}));
}

function generateSuggestions(commonIssues, successRate) {
  const suggestions = [];
  
  if (successRate < 0.7) {
    suggestions.push('Consider reviewing and adjusting your system prompt for better response quality.');
  }
  
  commonIssues.forEach(({issue, count}) => {
    switch(issue) {
      case 'too_formal':
        suggestions.push('Try adding "Use a friendly, conversational tone" to your system prompt.');
        break;
      case 'too_casual':
        suggestions.push('Consider adding "Maintain a professional tone" to your system prompt.');
        break;
      case 'missing_context':
        suggestions.push('The AI might need more specific context. Try providing more details before generation.');
        break;
      case 'too_long':
        suggestions.push('Consider reducing the max tokens setting or adding "Be concise" to your system prompt.');
        break;
      case 'too_short':
        suggestions.push('Try increasing max tokens or adding "Provide detailed explanations" to your system prompt.');
        break;
      case 'wrong_tone':
        suggestions.push('Review your system prompt tone instructions and previous message analysis.');
        break;
    }
  });
  
  return suggestions.slice(0, 3); // Top 3 suggestions
}

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
  const { systemPrompt, docsUrl, openaiKey, openaiModel, temperature, maxTokens, keyboardShortcut } = await loadSettings();
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
      
      // Add documentation context to system message if available
      if (docsContext) {
        systemMessage += `\n\nRelevant documentation:\n${docsContext}`;
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

      // Build the messages array
      const messages = [
        { role: 'system', content: systemMessage }
      ];
      
      // Add all conversation messages
      messages.push(...threadMessages);
      
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
      
      // Check if using GPT-5 models
      const isGPT5 = openaiModel.startsWith('gpt-5');
      
      let requestBody;
      let apiEndpoint;
      
      if (isGPT5) {
        // GPT-5 uses the new /v1/responses API
        apiEndpoint = "https://api.openai.com/v1/responses";
        
        // Combine system prompt and conversation into input
        const fullInput = `${sanitizedSystemMessage}\n\n${sanitizedMessages.map(msg => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n\n')}`;
        
        requestBody = {
          model: openaiModel,
          input: fullInput,
          reasoning: { effort: "low" },  // Low reasoning for fast responses
          text: { verbosity: "low" },    // Low verbosity as requested
          temperature: temperature,
          max_tokens: maxTokens,
          stream: true  // Enable streaming for faster perceived response
        };
      } else {
        // Legacy models use /v1/chat/completions
        apiEndpoint = "https://api.openai.com/v1/chat/completions";
        requestBody = {
          model: openaiModel,
          messages: [
            { role: 'system', content: sanitizedSystemMessage },
            ...sanitizedMessages
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

      // For GPT-5, enable streaming
      if (isGPT5 && requestBody.stream) {
        // Streaming implementation for GPT-5
        const res = await fetch(apiEndpoint, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey.trim()}`,
            "Content-Type": "application/json; charset=utf-8"
          },
          body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
          const errorData = await res.json();
          let errorMessage = `API Error (${res.status}): `;
          if (errorData.error) {
            errorMessage += errorData.error.message || errorData.error.type || 'Unknown error';
          } else {
            errorMessage += res.statusText || 'Request failed';
          }
          throw new Error(errorMessage);
        }

        // Process server-sent events stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullReply = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.output_text_delta) {
                  fullReply += parsed.output_text_delta;
                  // Update the reply in real-time
                  injectReply(fullReply + '▌');
                }
              } catch (e) {
                // Skip invalid JSON chunks
              }
            }
          }
        }
        
        // Final injection without cursor
        injectReply(fullReply);
        
      } else {
        // Non-streaming request (for GPT-5 without streaming or legacy models)
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
          if (data.error) {
            errorMessage += data.error.message || data.error.type || 'Unknown error';
          } else {
            errorMessage += res.statusText || 'Request failed';
          }
          throw new Error(errorMessage);
        }
        
        // Extract reply based on API type
        let reply;
        if (isGPT5) {
          reply = data.output_text || data.output;
        } else {
          reply = data.choices?.[0]?.message?.content;
        }
        
        if (!reply) {
          throw new Error('No response content received from OpenAI API');
        }
        
        injectReply(reply);
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