// Prevent multiple injections
if (window.hasRunYouTubeTranscriptExtractor) {
  console.log('Content script already loaded, skipping');
  // Re-register listener in case it was lost
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractTranscript') {
      extractTranscript()
        .then(transcript => {
          // Cache the transcript
          const videoId = new URLSearchParams(window.location.search).get('v');
          if (videoId) {
            const cacheKey = `transcript_${videoId}`;
            chrome.storage.local.set({
              [cacheKey]: {
                data: transcript.data,
                text: transcript.text,
                timestamp: Date.now()
              }
            });
          }
          sendResponse({ success: true, transcript: transcript.data, transcriptText: transcript.text });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    } else if (request.action === 'showAISummary') {
      // Open the AI summary panel with the provided transcript
      handleSummarizeClick(request.transcript)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
  });
} else {
  window.hasRunYouTubeTranscriptExtractor = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractTranscript') {
      extractTranscript()
        .then(transcript => {
          // Cache the transcript
          const videoId = new URLSearchParams(window.location.search).get('v');
          if (videoId) {
            const cacheKey = `transcript_${videoId}`;
            chrome.storage.local.set({
              [cacheKey]: {
                data: transcript.data,
                text: transcript.text,
                timestamp: Date.now()
              }
            });
          }
          sendResponse({ success: true, transcript: transcript.data, transcriptText: transcript.text });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    } else if (request.action === 'showAISummary') {
      // Open the AI summary panel with the provided transcript
      handleSummarizeClick(request.transcript)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
  });

  console.log('YouTube Transcript Extractor content script loaded');

  // Watch for page changes (since YouTube is a SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      if (url.includes('youtube.com/watch')) {
        setTimeout(injectAIUI, 2000);
      }
    }
  }).observe(document, { subtree: true, childList: true });


  // Initial injection
  if (location.href.includes('youtube.com/watch')) {
    setTimeout(injectAIUI, 2000);
  }

  // Keyboard shortcut: Ctrl+S (Mac) or Ctrl+Alt+S (Windows)
  document.addEventListener('keydown', (event) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;

    let shouldTrigger = false;

    if (isMac && event.ctrlKey && event.key === 's' && !event.metaKey && !event.altKey) {
      // Mac: Ctrl+S (Control key, not Command)
      shouldTrigger = true;
    } else if (isWindows && event.ctrlKey && event.altKey && event.key === 's' && !event.metaKey) {
      // Windows: Ctrl+Alt+S
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      event.preventDefault();
      const panel = document.getElementById('yt-ai-summary-panel');
      if (panel) {
        if (panel.style.display === 'flex') {
          // Close panel if already open
          panel.style.display = 'none';
        } else {
          // Open panel and trigger summarization
          handleSummarizeClick();
        }
      }
    }
  });
}

async function injectAIUI() {
  if (document.getElementById('yt-transcript-ai-button')) return;

  // Find the action buttons row
  const actionButtons = document.querySelector('#top-level-buttons-computed, #menu-container #top-level-buttons-computed');
  if (!actionButtons) return;

  const aiBtn = document.createElement('button');
  aiBtn.id = 'yt-transcript-ai-button';
  aiBtn.setAttribute('aria-label', 'Summarize with AI');
  aiBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" class="yt-ai-btn-icon">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
    </svg>
    <span class="yt-ai-btn-text">Summarize with AI</span>
  `;

  aiBtn.className = 'yt-ai-summarize-btn';

  aiBtn.onclick = () => handleSummarizeClick();

  actionButtons.appendChild(aiBtn);
  injectSummaryPanel();
}

function injectSummaryPanel() {
  if (document.getElementById('yt-ai-summary-panel')) return;

  // Get video title and channel image from page
  const videoTitle = document.querySelector('h1.ytd-watch-metadata yt-formatted-string')?.textContent || 'this video';
  const channelImg = document.querySelector('ytd-video-owner-renderer img#img')?.src || '';

  const panel = document.createElement('div');
  panel.id = 'yt-ai-summary-panel';
  panel.innerHTML = `
    <div id="yt-ai-summary-header">
      <div class="header-content">
        ${channelImg ? `<img src="${channelImg}" class="header-channel-img">` : `
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#FF0000">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        `}
        <div class="header-video-title">Summary of <strong>${videoTitle}</strong></div>
      </div>
      <div class="header-actions">
        <button id="yt-ai-summary-copy" title="Copy summary">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
        <button id="yt-ai-summary-close" title="Close">×</button>
      </div>
    </div>
    <div id="yt-ai-summary-messages">
      <div id="yt-ai-summary-status">Click "Summarize with AI" to begin...</div>
      <div id="yt-ai-summary-text" class="markdown-body"></div>
    </div>
    <div id="yt-ai-chat-input" style="display: none;">
      <div class="chat-input-controls">
        <label class="transcript-toggle">
          <input type="checkbox" id="yt-search-full-transcript">
          <span>Search Full Transcript</span>
        </label>
      </div>
      <div class="chat-input-row">
        <textarea id="yt-chat-textarea" placeholder="Ask a follow-up question..." rows="1"></textarea>
        <button id="yt-chat-send" title="Send message">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  const textarea = document.getElementById('yt-chat-textarea');
  const sendBtn = document.getElementById('yt-chat-send');
  const messagesContainer = document.getElementById('yt-ai-summary-messages');

  // Auto-expand textarea
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  });

  // Handle send on Enter (but allow Shift+Enter for new lines)
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSend();
    }
  });

  sendBtn.onclick = handleChatSend;

  function appendContextInfo(text) {
    const div = document.createElement('div');
    div.className = 'chat-message context-info';
    div.innerHTML = `<div class="context-bubble">${text}</div>`;
    messagesContainer.appendChild(div);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  async function handleChatSend() {
    const query = textarea.value.trim();
    if (!query) return;

    // Clear and reset textarea
    textarea.value = '';
    textarea.style.height = 'auto';

    // Add user message to UI
    appendChatMessage('user', query);

    const searchFullTranscript = document.getElementById('yt-search-full-transcript').checked;
    if (searchFullTranscript) {
      appendContextInfo('Searching full transcript context...');
    }

    // Disable input while generating
    textarea.disabled = true;
    sendBtn.disabled = true;

    try {
      const settings = await chrome.storage.local.get(['apiKey', 'model']);
      const apiKey = settings.apiKey || (typeof CONFIG !== 'undefined' ? CONFIG.OPENROUTER_API_KEY : '');
      const model = settings.model || (typeof CONFIG !== 'undefined' ? CONFIG.DEFAULT_MODEL : 'google/gemini-2.0-flash-001');

      if (!apiKey) throw new Error('API Key missing');

      // Get current transcript
      const videoId = new URLSearchParams(window.location.search).get('v');
      const cacheKey = `transcript_${videoId}`;
      const cachedData = await chrome.storage.local.get(cacheKey);
      const transcriptText = cachedData[cacheKey]?.text || '';

      const summaryText = document.getElementById('yt-summary-data-hidden')?.textContent || document.getElementById('yt-ai-summary-text').innerText;

      // Prepare conversation history
      const history = Array.from(messagesContainer.querySelectorAll('.chat-message'))
        .filter(el => !el.classList.contains('context-info'))
        .map(el => ({
          role: el.classList.contains('user') ? 'user' : 'assistant',
          content: el.querySelector('.message-bubble')?.innerText || ''
        }))
        .filter(msg => msg.content);

      // Create assistant message bubble for streaming
      const assistantMsgDiv = appendChatMessage('assistant', '');
      const bubble = assistantMsgDiv.querySelector('.message-bubble');
      bubble.innerHTML = '<div style="opacity: 0.5;">Thinking...</div>';

      const messages = [
        { "role": "system", "content": PROMPTS.CHAT_SYSTEM },
        { "role": "assistant", "content": `SUMMARY CONTEXT: ${summaryText}` }
      ];

      if (searchFullTranscript && transcriptText) {
        messages.push({ "role": "system", "content": `VIDEO TRANSCRIPT: ${transcriptText.substring(0, 40000)}` });
      }

      messages.push(...history);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/arushdixit/youtube-transcript-extractor",
          "X-Title": "YouTube Transcript Extractor"
        },
        body: JSON.stringify({
          "model": model,
          "messages": messages,
          "stream": true
        })
      });

      if (!response.ok) throw new Error('API request failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      bubble.innerHTML = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                fullText += content;
                bubble.innerHTML = renderSimpleMarkdown(fullText);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
              }
            } catch (e) { }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      appendChatMessage('assistant', 'Sorry, I encountered an error: ' + error.message);
    } finally {
      textarea.disabled = false;
      sendBtn.disabled = false;
      textarea.focus();
    }
  }

  function appendChatMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${role}`;

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';
    bubble.innerHTML = renderSimpleMarkdown(text);

    const timestamp = document.createElement('div');
    timestamp.className = 'message-timestamp';
    timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgDiv.appendChild(bubble);
    msgDiv.appendChild(timestamp);
    messagesContainer.appendChild(msgDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return msgDiv;
  }

  document.getElementById('yt-ai-summary-close').onclick = () => {
    panel.style.display = 'none';
  };

  document.getElementById('yt-ai-summary-copy').onclick = async () => {
    const textDiv = document.getElementById('yt-ai-summary-text');
    const text = textDiv.innerText;
    const copyBtn = document.getElementById('yt-ai-summary-copy');
    const originalContent = copyBtn.innerHTML;

    try {
      await navigator.clipboard.writeText(text);
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#2ba640">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
      `;
      setTimeout(() => copyBtn.innerHTML = originalContent, 2000);
    } catch (e) {
      console.error('Failed to copy summary:', e);
    }
  };

  // Make panel draggable
  const header = document.getElementById('yt-ai-summary-header');
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  // Restore saved position
  chrome.storage.local.get(['panelPosition'], (result) => {
    if (result.panelPosition) {
      panel.style.right = 'auto';
      panel.style.left = result.panelPosition.x + 'px';
      panel.style.top = result.panelPosition.y + 'px';
    }
  });

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    panel.classList.add('dragging');

    const rect = panel.getBoundingClientRect();
    initialX = e.clientX - rect.left;
    initialY = e.clientY - rect.top;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    // Keep panel within viewport
    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;

    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(0, Math.min(currentY, maxY));

    panel.style.right = 'auto';
    panel.style.left = currentX + 'px';
    panel.style.top = currentY + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      panel.classList.remove('dragging');

      // Save position
      chrome.storage.local.set({
        panelPosition: {
          x: currentX || parseInt(panel.style.left) || 20,
          y: currentY || parseInt(panel.style.top) || 80
        }
      });
    }
  });
}

async function handleSummarizeClick(cachedTranscript = null) {
  const panel = document.getElementById('yt-ai-summary-panel');
  const status = document.getElementById('yt-ai-summary-status');
  const textDiv = document.getElementById('yt-ai-summary-text');

  panel.style.display = 'flex';
  status.textContent = 'Preparing summary...';
  textDiv.textContent = '';

  try {
    let transcriptText = cachedTranscript;

    // If no cached transcript provided, check storage or extract
    if (!transcriptText) {
      const videoId = new URLSearchParams(window.location.search).get('v');
      const cacheKey = `transcript_${videoId}`;
      const cachedData = await chrome.storage.local.get(cacheKey);

      if (cachedData[cacheKey]) {
        // Use cached transcript
        transcriptText = cachedData[cacheKey].text;
        console.log('Using cached transcript');
      } else {
        // Extract new transcript
        status.textContent = 'Extracting transcript...';
        const transcript = await extractTranscript();
        transcriptText = transcript.text;

        // Cache it
        await chrome.storage.local.set({
          [cacheKey]: {
            data: transcript.data,
            text: transcript.text,
            timestamp: Date.now()
          }
        });
      }
    }

    // Get settings from storage first
    const settings = await chrome.storage.local.get(['apiKey', 'model']);
    const apiKey = settings.apiKey || (typeof CONFIG !== 'undefined' ? CONFIG.OPENROUTER_API_KEY : '');
    const modelToUse = settings.model || (typeof CONFIG !== 'undefined' ? CONFIG.DEFAULT_MODEL : 'google/gemini-2.0-flash-001');

    if (!apiKey) {
      throw new Error('API Key missing. Please set it in the extension options.');
    }

    // Check if we have a cached summary for this video
    const videoId = new URLSearchParams(window.location.search).get('v');
    const summaryCacheKey = `summary_${videoId}_${modelToUse}`;
    const cachedSummaryData = await chrome.storage.local.get(summaryCacheKey);

    if (cachedSummaryData[summaryCacheKey]) {
      // Use cached summary
      console.log('Using cached summary');
      status.textContent = 'Loaded from cache';
      textDiv.innerHTML = renderSimpleMarkdown(cachedSummaryData[summaryCacheKey].summary);

      // Add regenerate option
      status.innerHTML = 'Loaded from cache • <span style="color: #FF0000; cursor: pointer; text-decoration: underline;" id="regenerate-summary">Regenerate</span>';
      document.getElementById('regenerate-summary').onclick = async () => {
        // Clear cache and regenerate
        await chrome.storage.local.remove(summaryCacheKey);
        handleSummarizeClick(transcriptText);
      };

      // Show chat interface
      const chatInput = document.getElementById('yt-ai-chat-input');
      if (chatInput) {
        chatInput.style.display = 'block';
      }
      return;
    }

    status.textContent = 'Generating summary using AI...';

    const summary = await getAISummary(transcriptText, apiKey, modelToUse, textDiv, status);

    // Cache the summary
    await chrome.storage.local.set({
      [summaryCacheKey]: {
        summary: summary,
        timestamp: Date.now()
      }
    });

    status.textContent = 'Summary generated successfully!';

    // Show chat interface and add summary to context
    const chatInput = document.getElementById('yt-ai-chat-input');
    if (chatInput) {
      chatInput.style.display = 'block';
      // Add hidden summary marker for chat engine
      const summaryMarker = document.createElement('div');
      summaryMarker.id = 'yt-summary-data-hidden';
      summaryMarker.style.display = 'none';
      summaryMarker.textContent = summary;
      panel.appendChild(summaryMarker);
    }
  } catch (error) {
    status.textContent = 'Error: ' + error.message;
    status.style.color = '#cc0000';
    console.error('Summarization failed:', error);
  }
}

async function getAISummary(transcriptText, apiKey, model, textDiv, status) {

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/arushdixit/youtube-transcript-extractor",
      "X-Title": "YouTube Transcript Extractor"
    },
    body: JSON.stringify({
      "model": model,
      "messages": [
        { "role": "system", "content": PROMPTS.SUMMARY_SYSTEM },
        { "role": "user", "content": `Transcript:\n${transcriptText}\n\nVideo URL: ${window.location.href}` }
      ],
      "stream": true
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'API Error');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  status.textContent = 'Streaming response...';
  textDiv.innerHTML = '<div style="opacity: 0.7;">Generating...</div>';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices[0]?.delta?.content;
          if (content) {
            fullText += content;
            // Update display in real-time
            textDiv.innerHTML = renderSimpleMarkdown(fullText);
            // Auto-scroll to bottom
            textDiv.parentElement.scrollTop = textDiv.parentElement.scrollHeight;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }
  }

  return fullText;
}

function renderSimpleMarkdown(text) {
  if (!text) return '';

  try {
    // 1. Pre-process LaTeX to avoid marked interference
    let processedText = text;
    const mathBlocks = [];

    // Replace display blocks \[ ... \] and $$ ... $$
    processedText = processedText.replace(/(\\\[[\s\S]*?\\\])|(\$\$[\s\S]*?\$\$)/g, (match) => {
      const formula = match.startsWith('\\\[') ? match.slice(2, -2) : match.slice(2, -2);
      const id = `@@MATHBLOCK${mathBlocks.length}@@`;
      mathBlocks.push({ id, formula, display: true });
      return id;
    });

    // Replace inline blocks \( ... \) and $ ... $
    processedText = processedText.replace(/(\\\([\s\S]*?\\\))|(\$[\s\S]*?\$)/g, (match) => {
      const formula = match.startsWith('\\\(') ? match.slice(2, -2) : match.slice(1, -1);
      const id = `@@MATHBLOCK${mathBlocks.length}@@`;
      mathBlocks.push({ id, formula, display: false });
      return id;
    });

    // 2. Render Markdown
    let html = marked.parse(processedText, {
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false
    });

    // 3. Post-process: Replace markers with rendered KaTeX
    mathBlocks.forEach(item => {
      try {
        const rendered = typeof katex !== 'undefined'
          ? katex.renderToString(item.formula, { displayMode: item.display, throwOnError: false })
          : `<code class="math">${item.formula}</code>`;
        html = html.replace(item.id, rendered);
      } catch (e) {
        html = html.replace(item.id, item.formula);
      }
    });

    return html;
  } catch (e) {
    console.error('Markdown/Math parsing error:', e);
    return text.replace(/\n/g, '<br>');
  }
}


async function extractTranscript() {
  try {
    const videoId = new URLSearchParams(window.location.search).get('v');
    if (!videoId) {
      throw new Error('Video ID not found');
    }

    console.log('Attempting to extract transcript for video:', videoId);

    // Method 1: Try to open transcript panel and extract from DOM
    const transcriptData = await extractFromTranscriptPanel();

    if (transcriptData) {
      console.log('Successfully extracted transcript');
      return transcriptData;
    }

    throw new Error('Transcript not available for this video. Make sure captions are enabled.');
  } catch (error) {
    console.error('Transcript extraction error:', error);
    throw error;
  }
}

async function extractFromTranscriptPanel() {
  return new Promise((resolve, reject) => {
    // Step 1: Click the "...more" button in description to expand it
    const expandButton = document.querySelector('tp-yt-paper-button#expand, #expand.ytd-text-inline-expander, button#expand');

    if (expandButton) {
      console.log('Clicking ...more button to expand description');
      expandButton.click();
    } else {
      console.log('No expand button found, description might already be expanded');
    }

    // Wait a bit for description to expand
    setTimeout(() => {
      // Step 2: Find and click the "Show transcript" button
      console.log('Looking for transcript button...');

      // Try multiple selectors for the transcript button
      let transcriptButton = null;

      // Method 1: Look for button with aria-label containing "transcript"
      transcriptButton = document.querySelector('button[aria-label*="transcript" i], button[aria-label*="Transcript" i]');

      if (!transcriptButton) {
        // Method 2: Search all buttons by text content
        const allButtons = document.querySelectorAll('button, tp-yt-paper-button');
        console.log(`Searching through ${allButtons.length} buttons`);

        for (const button of allButtons) {
          const text = button.textContent.toLowerCase();
          const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();

          if (text.includes('show transcript') || ariaLabel.includes('show transcript') ||
            (text.includes('transcript') && !button.closest('ytd-transcript-segment-renderer'))) {
            transcriptButton = button;
            console.log('Found transcript button by text:', button.textContent.trim(), 'aria-label:', button.getAttribute('aria-label'));
            break;
          }
        }
      } else {
        console.log('Found transcript button by aria-label:', transcriptButton.getAttribute('aria-label'));
      }

      if (!transcriptButton) {
        console.error('Transcript button not found. Available buttons:');
        document.querySelectorAll('button').forEach((btn, i) => {
          if (i < 20) { // Log first 20 buttons for debugging
            console.log(`Button ${i}:`, btn.textContent.trim().substring(0, 50), 'aria-label:', btn.getAttribute('aria-label'));
          }
        });
        reject(new Error('Transcript option not available for this video'));
        return;
      }

      console.log('Clicking transcript button...');
      transcriptButton.click();

      // Wait for transcript panel to load and check multiple times
      let attempts = 0;
      const maxAttempts = 10; // Check for 5 seconds (10 * 500ms)

      const checkForTranscript = () => {
        attempts++;
        console.log(`Checking for transcript segments (attempt ${attempts}/${maxAttempts})...`);

        const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
        console.log(`Found ${transcriptSegments.length} transcript segment elements`);

        // Also check if transcript panel is visible
        const transcriptPanel = document.querySelector('ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-transcript"]');
        if (transcriptPanel) {
          console.log('Transcript panel found:', transcriptPanel.style.display !== 'none' ? 'visible' : 'hidden');
        } else {
          console.log('Transcript panel not found in DOM');
        }

        if (transcriptSegments.length > 0) {
          console.log('Processing transcript segments...');

          try {
            const transcript = [];
            let fullText = '';

            transcriptSegments.forEach((segment, idx) => {
              const timestampElement = segment.querySelector('.segment-timestamp');
              const textElement = segment.querySelector('yt-formatted-string.segment-text');

              if (idx === 0) {
                console.log('First segment sample - timestamp el:', !!timestampElement, 'text el:', !!textElement);
              }

              if (timestampElement && textElement) {
                const timestamp = timestampElement.textContent.trim();
                const text = textElement.textContent.trim();

                // Convert timestamp to milliseconds
                const timeParts = timestamp.split(':').map(p => parseInt(p));
                let offsetMs = 0;
                if (timeParts.length === 3) {
                  offsetMs = (timeParts[0] * 3600 + timeParts[1] * 60 + timeParts[2]) * 1000;
                } else if (timeParts.length === 2) {
                  offsetMs = (timeParts[0] * 60 + timeParts[1]) * 1000;
                }

                transcript.push({
                  text: text,
                  offset: offsetMs,
                  duration: 0
                });

                fullText += text + ' ';
              }
            });

            console.log(`Successfully extracted ${transcript.length} transcript entries`);

            // Close the transcript panel
            const closeButton = document.querySelector('ytd-engagement-panel-title-header-renderer button[aria-label*="Close"], button[aria-label*="close" i]');
            if (closeButton) {
              console.log('Closing transcript panel');
              closeButton.click();
            }

            resolve({
              data: transcript,
              text: fullText.trim()
            });
          } catch (error) {
            console.error('Error processing transcript:', error);
            reject(error);
          }
        } else if (attempts < maxAttempts) {
          // Not found yet, try again
          setTimeout(checkForTranscript, 500);
        } else {
          // Max attempts reached
          console.error('Max attempts reached. Transcript segments never appeared.');
          reject(new Error('Transcript panel opened but transcript did not load. Content may be available only in the transcript panel. Try refresh or waiting.'));
        }
      };

      // Start checking after initial delay
      setTimeout(checkForTranscript, 1000); // Wait 1 second before first check
    }, 800); // Wait 800ms for description to expand
  });
}
