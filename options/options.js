// Load settings from storage or use defaults from config.js
function loadOptions() {
    chrome.storage.local.get({
        apiKey: CONFIG.OPENROUTER_API_KEY,
        model: CONFIG.DEFAULT_MODEL,
        customPrompts: []
    }, (items) => {
        document.getElementById('apiKey').value = items.apiKey;
        document.getElementById('model').value = items.model;
        renderCustomPrompts(items.customPrompts);
    });
}

// Save main settings
function saveOptions() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value.trim();

    chrome.storage.local.set({
        apiKey: apiKey,
        model: model
    }, () => {
        showStatus('Settings saved successfully!');
    });
}

function showStatus(text, isError = false) {
    const status = document.getElementById('status');
    status.textContent = text;
    status.className = isError ? 'error' : 'success';

    setTimeout(() => {
        status.textContent = '';
        status.className = '';
    }, 2000);
}

// Custom Prompts Logic
async function addCustomPrompt() {
    const label = document.getElementById('newPromptLabel').value.trim();
    const instructions = document.getElementById('newPromptInstructions').value.trim();

    if (!label || !instructions) {
        showStatus('Please fill in both label and instructions', true);
        return;
    }

    const { customPrompts = [] } = await chrome.storage.local.get(['customPrompts']);
    customPrompts.push({ label, instructions });

    await chrome.storage.local.set({ customPrompts });

    // Clear inputs and re-render
    document.getElementById('newPromptLabel').value = '';
    document.getElementById('newPromptInstructions').value = '';
    renderCustomPrompts(customPrompts);
    showStatus('Custom prompt added!');
}

async function deletePrompt(index) {
    const { customPrompts = [] } = await chrome.storage.local.get(['customPrompts']);
    customPrompts.splice(index, 1);
    await chrome.storage.local.set({ customPrompts });
    renderCustomPrompts(customPrompts);
}

function renderCustomPrompts(prompts) {
    const list = document.getElementById('custom-prompts-list');
    list.innerHTML = '';

    prompts.forEach((prompt, index) => {
        const item = document.createElement('div');
        item.className = 'custom-prompt-item';
        item.innerHTML = `
            <div class="custom-prompt-header">
                <span class="custom-prompt-label">${prompt.label}</span>
                <button class="delete-btn" data-index="${index}">Delete</button>
            </div>
            <div class="help-text">${prompt.instructions}</div>
        `;
        list.appendChild(item);
    });

    // Add delete event listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.onclick = () => deletePrompt(parseInt(btn.dataset.index));
    });
}

document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('add-new-prompt-btn').addEventListener('click', addCustomPrompt);
