async function loadSettings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['systemPrompt', 'docsUrl', 'openaiKey', 'openaiModel', 'temperature', 'maxTokens', 'keyboardShortcut'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Extension context error:', chrome.runtime.lastError);
          resolve({ 
            systemPrompt: '', 
            docsUrl: '', 
            openaiKey: '', 
            openaiModel: 'gpt-4o', 
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

function extractThread() {
  const messages = [];
  
  // Find all thread items (messages, notes, etc.)
  const threadItems = document.querySelectorAll('.thread-item');
  
  threadItems.forEach(item => {
    const content = item.querySelector('.thread-content');
    const person = item.querySelector('.thread-person');
    
    if (!content) return;
    
    const messageText = content.innerText.trim();
    const personName = person ? person.innerText.trim() : 'Unknown';
    
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
      .map(el => el.innerText.trim())
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
      customerInfo.name = userLink.textContent.trim();
    }

    // Extract basic customer details from the first list
    const basicInfoList = wpWidget.querySelector('.wordpress-orders-list');
    if (basicInfoList) {
      const listItems = basicInfoList.querySelectorAll('li');
      listItems.forEach(item => {
        const label = item.querySelector('label');
        if (label) {
          const labelText = label.textContent.trim();
          const value = item.textContent.replace(labelText, '').trim();
          
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
                customerInfo.version = versionSpan.textContent.trim();
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

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: messages,
          temperature: temperature,
          max_tokens: maxTokens
        })
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
      
      const reply = data.choices?.[0]?.message?.content;
      if (!reply) {
        throw new Error('No response content received from OpenAI API');
      }
      
      injectReply(reply);
    } catch (error) {
      console.error('Error generating response:', error);
      clearGeneratingStatus();
      
      // Provide detailed error message to help with troubleshooting
      let errorMessage = 'Error generating AI response: ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Unknown error occurred';
      }
      errorMessage += '\n\nPlease check your settings and try again.';
      
      injectReply(errorMessage);
    }
  }
});