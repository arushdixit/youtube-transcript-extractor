// Prevent multiple injections
if (window.hasRunYouTubeTranscriptExtractor) {
  console.log('Content script already loaded, skipping');
  // Re-register listener in case it was lost
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractTranscript') {
      extractTranscript()
        .then(transcript => {
          sendResponse({ success: true, transcript: transcript.data, transcriptText: transcript.text });
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
          sendResponse({ success: true, transcript: transcript.data, transcriptText: transcript.text });
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
}

async function injectAIUI() {
  if (document.getElementById('yt-transcript-ai-button')) return;

  // Find the action buttons row
  const actionButtons = document.querySelector('#top-level-buttons-computed, #menu-container #top-level-buttons-computed');
  if (!actionButtons) return;

  const aiBtn = document.createElement('button');
  aiBtn.id = 'yt-transcript-ai-button';
  aiBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" style="margin-right: 6px;">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
    </svg>
    Summarize with AI
  `;

  // Styles for the button
  Object.assign(aiBtn.style, {
    backgroundColor: '#ff0000',
    color: 'white',
    border: 'none',
    borderRadius: '18px',
    padding: '0 16px',
    height: '36px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    marginLeft: '8px',
    fontFamily: 'Roboto, Arial, sans-serif',
    transition: 'background-color 0.2s'
  });

  aiBtn.onmouseover = () => aiBtn.style.backgroundColor = '#cc0000';
  aiBtn.onmouseout = () => aiBtn.style.backgroundColor = '#ff0000';

  aiBtn.onclick = handleSummarizeClick;

  actionButtons.appendChild(aiBtn);
  injectSummaryPanel();
}

function injectSummaryPanel() {
  if (document.getElementById('yt-ai-summary-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'yt-ai-summary-panel';
  panel.innerHTML = `
    <div id="yt-ai-summary-header">
      <span>AI Summary & Notes</span>
      <div style="display: flex; gap: 10px;">
        <button id="yt-ai-summary-copy">Copy</button>
        <button id="yt-ai-summary-close">×</button>
      </div>
    </div>
    <div id="yt-ai-summary-content">
      <div id="yt-ai-summary-status">Click "Summarize with AI" to begin...</div>
      <div id="yt-ai-summary-text"></div>
    </div>
  `;

  // Premium Styles for the Panel
  const style = document.createElement('style');
  style.textContent = `
    #yt-ai-summary-panel {
      position: fixed;
      right: 20px;
      top: 80px;
      width: 400px;
      max-height: calc(100vh - 120px);
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      z-index: 2001; /* Above YouTube headers */
      display: none;
      flex-direction: column;
      font-family: Roboto, Arial, sans-serif;
      border: 1px solid rgba(0,0,0,0.05);
      overflow: hidden;
    }
    #yt-ai-summary-header {
      padding: 16px;
      background: #f8f8f8;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
      font-size: 16px;
    }
    #yt-ai-summary-content {
      padding: 20px;
      overflow-y: auto;
      flex-grow: 1;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }
    #yt-ai-summary-status {
      color: #666;
      font-style: italic;
      margin-bottom: 10px;
    }
    #yt-ai-summary-text h1 { font-size: 1.4em; margin-top: 20px; border-bottom: 2px solid #eee; padding-bottom: 5px; }
    #yt-ai-summary-text h2 { font-size: 1.2em; margin-top: 15px; color: #065fd4; }
    #yt-ai-summary-text ul { padding-left: 20px; }
    #yt-ai-summary-text li { margin-bottom: 5px; }
    #yt-ai-summary-copy, #yt-ai-summary-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 14px;
      color: #065fd4;
      font-weight: 500;
    }
    #yt-ai-summary-close { font-size: 24px; color: #666; }
    #yt-ai-summary-text code { background: #f0f0f0; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
  `;
  document.head.appendChild(style);
  document.body.appendChild(panel);

  document.getElementById('yt-ai-summary-close').onclick = () => {
    panel.style.display = 'none';
  };

  document.getElementById('yt-ai-summary-copy').onclick = async () => {
    const text = document.getElementById('yt-ai-summary-text').innerText;
    try {
      await navigator.clipboard.writeText(text);
      const copyBtn = document.getElementById('yt-ai-summary-copy');
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 2000);
    } catch (e) {
      console.error('Failed to copy summary:', e);
    }
  };
}

async function handleSummarizeClick() {
  const panel = document.getElementById('yt-ai-summary-panel');
  const status = document.getElementById('yt-ai-summary-status');
  const textDiv = document.getElementById('yt-ai-summary-text');

  panel.style.display = 'flex';
  status.textContent = 'Extracting transcript...';
  textDiv.textContent = '';

  try {
    const transcript = await extractTranscript();
    status.textContent = 'Generating summary using AI...';

    // Get settings from storage, fallback to config
    const settings = await chrome.storage.local.get(['apiKey', 'model']);
    const apiKey = settings.apiKey || (typeof CONFIG !== 'undefined' ? CONFIG.OPENROUTER_API_KEY : '');
    const model = settings.model || (typeof CONFIG !== 'undefined' ? CONFIG.DEFAULT_MODEL : 'nvidia/nemotron-3-nano-30b-a3b:free');

    if (!apiKey) {
      throw new Error('API Key missing. Please set it in the extension options.');
    }

    const summary = await getAISummary(transcript.text, apiKey, model);
    status.textContent = 'Summary generated successfully!';

    // Simple markdown-ish rendering
    textDiv.innerHTML = renderSimpleMarkdown(summary);
  } catch (error) {
    status.textContent = 'Error: ' + error.message;
    status.style.color = '#cc0000';
    console.error('Summarization failed:', error);
  }
}

async function getAISummary(transcriptText, apiKey, model) {
  const prompt = `You are an expert note-taker and technical explainer. Your job is to carefully process this video transcript and create a set of detailed, organized notes that capture every single concept, term, example, and insight mentioned, in the exact order they appear, without omitting anything.

URL of the video: ${window.location.href}

Instructions:
1. Watch/Read Everything Fully: Do not skip or summarize too broadly. Include all points, even if they seem minor or repetitive, unless they are literal filler or unrelated chatter.
2. Time-Stamped Structure: Add timestamps (HH:MM:SS) before each section or key point so I can quickly revisit the exact spot in the video.
3. Hierarchical Breakdown: Use H1 for Major topics, H2 for Subtopics, and Bullets for Details.
4. Definitions & Jargon: Explain technical terms in simple terms alongside their definition.
5. Examples & Analogies: Record every example, analogy, or metaphor given.
6. Important Quotes: Write verbatim inside quotes.
7. Diagrams & Visual References: Describe visuals in text.
8. Extra Resources Mentioned: List any books, papers, tools, or websites referenced.
9. Summary Section at the End: 
   - A 1-paragraph high-level summary
   - Key Takeaways list (10-15 insights)
   - Glossary of all technical terms

Transcript:
${transcriptText}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/arushdixit/youtube-transcript-extractor", // Optional
      "X-Title": "YouTube Transcript Extractor" // Optional
    },
    body: JSON.stringify({
      "model": model,
      "messages": [
        { "role": "user", "content": prompt }
      ]
    })
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || 'API Error');
  }
  return data.choices[0].message.content;
}

function renderSimpleMarkdown(text) {
  // Very basic markdown to HTML for display
  return text
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$2</h2>')
    .replace(/^### (.*$)/gim, '<h3>$3</h3>')
    .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/\n\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/<\/ul><ul>/g, ''); // Join adjacent lists
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
