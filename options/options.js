// Load settings from storage or use defaults from config.js
function loadOptions() {
    chrome.storage.local.get({
        apiKey: CONFIG.OPENROUTER_API_KEY,
        model: CONFIG.DEFAULT_MODEL
    }, (items) => {
        document.getElementById('apiKey').value = items.apiKey;
        document.getElementById('model').value = items.model;
    });
}

// Save settings to storage
function saveOptions() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value.trim();

    chrome.storage.local.set({
        apiKey: apiKey,
        model: model
    }, () => {
        const status = document.getElementById('status');
        status.textContent = 'Settings saved successfully!';
        status.className = 'success';

        setTimeout(() => {
            status.textContent = '';
            status.className = '';
        }, 2000);
    });
}

document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('save').addEventListener('click', saveOptions);
