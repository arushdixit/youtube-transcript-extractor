let transcriptData = '';

document.addEventListener('DOMContentLoaded', async () => {
  const extractBtn = document.getElementById('extract-btn');
  const copyBtn = document.getElementById('copy-btn');
  const aiSummarizeBtn = document.getElementById('ai-summarize-btn');
  const status = document.getElementById('status');
  const info = document.getElementById('info');
  const transcriptContainer = document.getElementById('transcript-container');

  // Check if we're on a YouTube video page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab.url || !tab.url.includes('youtube.com/watch')) {
    status.textContent = 'Please navigate to a YouTube video page';
    extractBtn.disabled = true;
    return;
  }

  // Show video ID
  const urlParams = new URLSearchParams(new URL(tab.url).search);
  const videoId = urlParams.get('v');
  if (videoId) {
    info.textContent = `Video: ${videoId}`;
  }

  // Check if we have cached transcript for this video
  const cacheKey = `transcript_${videoId}`;
  const cachedData = await chrome.storage.local.get(cacheKey);

  if (cachedData[cacheKey]) {
    // We have cached transcript, show AI Summarize button
    aiSummarizeBtn.style.display = 'block';
    transcriptData = cachedData[cacheKey].text;
    status.textContent = 'Transcript cached - ready to summarize!';
  }

  extractBtn.addEventListener('click', async () => {
    extractBtn.disabled = true;
    status.textContent = 'Extracting transcript...';
    transcriptContainer.style.display = 'none';
    copyBtn.style.display = 'none';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Try to inject content script (in case it's not loaded)
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/config.js', 'src/prompts.js', 'lib/marked.min.js', 'lib/katex.min.js', 'src/content.js']
        });
        console.log('Content script injected');
        // Wait a bit longer after fresh injection
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (e) {
        // Content script might already be injected
        console.log('Content script already present or injection failed:', e.message);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Try sending message with retries
      let response = null;
      let lastError = null;

      for (let i = 0; i < 3; i++) {
        try {
          response = await chrome.tabs.sendMessage(tab.id, { action: 'extractTranscript' });
          break; // Success, exit retry loop
        } catch (error) {
          lastError = error;
          console.log(`Attempt ${i + 1} failed:`, error.message);
          if (i < 2) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      if (response && response.success) {
        status.textContent = 'Transcript extracted successfully!';
        displayTranscript(response.transcript);
        transcriptData = response.transcriptText;
        copyBtn.style.display = 'block';
        aiSummarizeBtn.style.display = 'block';

        // Cache the transcript
        const urlParams = new URLSearchParams(new URL(tab.url).search);
        const videoId = urlParams.get('v');
        const cacheKey = `transcript_${videoId}`;
        await chrome.storage.local.set({
          [cacheKey]: {
            data: response.transcript,
            text: response.transcriptText,
            timestamp: Date.now()
          }
        });
      } else if (response && response.error) {
        status.textContent = 'Error: ' + response.error;
      } else {
        throw lastError || new Error('No response from content script');
      }
    } catch (error) {
      console.error('Extension error:', error);
      if (error.message.includes('connection') || error.message.includes('Receiving end')) {
        status.textContent = 'Please reload the extension and refresh this page';
        info.textContent = 'Go to brave://extensions/ and click reload, then refresh this page';
        info.style.color = '#cc0000';
      } else {
        status.textContent = 'Error: ' + error.message;
      }
    } finally {
      extractBtn.disabled = false;
    }
  });

  aiSummarizeBtn.addEventListener('click', async () => {
    aiSummarizeBtn.disabled = true;
    const originalText = aiSummarizeBtn.textContent;
    aiSummarizeBtn.textContent = 'Summarizing...';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Send message to content script to trigger AI summary with cached transcript
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showAISummary',
        transcript: transcriptData
      });

      status.textContent = 'AI Summary panel opened!';
      aiSummarizeBtn.textContent = originalText;
    } catch (error) {
      console.error('AI Summarize error:', error);
      status.textContent = 'Error: ' + error.message;
      aiSummarizeBtn.textContent = originalText;
    } finally {
      aiSummarizeBtn.disabled = false;
    }
  });

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(transcriptData);
      const originalText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      status.textContent = 'Failed to copy: ' + error.message;
    }
  });
});

function displayTranscript(transcript) {
  const container = document.getElementById('transcript-container');
  container.innerHTML = '';

  transcript.forEach(item => {
    const line = document.createElement('div');
    line.className = 'transcript-line';

    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = formatTime(item.offset / 1000);

    const text = document.createElement('span');
    text.textContent = item.text;

    line.appendChild(timestamp);
    line.appendChild(text);
    container.appendChild(line);
  });

  container.style.display = 'block';
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
