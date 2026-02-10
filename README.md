# YouTube Transcript Extractor

A Chrome extension that extracts transcripts from YouTube videos.

## Features

- Extracts transcripts directly from YouTube videos
- **AI Summarization**: Generate detailed, timestamped notes using OpenRouter AI
- Works on any Chromium-based browser (Chrome, Brave, Edge, etc.)
- Only activates on YouTube video pages
- Displays transcript with timestamps
- Copy transcript or AI summary to clipboard

## Installation

1. Open your Chromium-based browser (Chrome, Brave, Edge, etc.)
2. Navigate to `chrome://extensions/` (or `brave://extensions/` for Brave)
3. Enable "Developer mode" using the toggle in the top right corner
4. Click "Load unpacked"
5. Select the `youtube-transcript-extractor` folder
6. The extension is now installed!

## Configuration (for AI Summary)

1. Right-click the extension icon in your toolbar.
2. Select **Options**.
3. Enter your **OpenRouter API Key**.
4. (Optional) Change the **Default Model**.
5. Click **Save Settings**.

## Usage

1. Navigate to any YouTube video page (not shorts).
2. Click **"Summarize with AI"** in the video action row (next to Like/Share buttons).
3. The AI summary panel will slide in from the right side.

### Keyboard Shortcuts

- **Mac**: `Ctrl + S` - Toggle AI summary panel
- **Windows**: `Ctrl + Alt + S` - Toggle AI summary panel

### Panel Features

- **Draggable**: Click and drag the panel header to reposition it anywhere on screen
- **Real-time Streaming**: Watch the summary generate in real-time as the AI processes the video
- **Smart Caching**: Summaries are cached per video - instant loading on revisit
- **Regenerate**: Click "Regenerate" to create a fresh summary with updated settings
- **Copy**: One-click copy of the entire summary to clipboard

### Smart Caching

The extension intelligently caches both transcripts and summaries:
- **Transcripts**: Extracted once per video and saved locally
- **Summaries**: Cached per video + model combination
- **Instant Loading**: Revisit any video for instant summary display
- **Regenerate Option**: Override cache anytime with the "Regenerate" button
- **Persistent Position**: Panel position is remembered across sessions

## Notes

- The extension only works on YouTube video pages (`youtube.com/watch`)
- Not all videos have transcripts available (depends on whether the creator enabled captions)
- The extension extracts auto-generated captions if manual captions are not available

## Troubleshooting

If the transcript extraction fails:
- Make sure the video has captions enabled (look for the CC button on the video player)
- Try refreshing the page
- Some videos may not have transcripts available
