document.addEventListener('DOMContentLoaded', () => {
  const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;
  const DEFAULT_PRIMARY_MODEL = 'openai/gpt-oss-120b';
  const DEFAULT_FALLBACK_MODEL = 'llama-3.1-8b-instant';
  const DEFAULT_PROVIDER_ORDER = 'groq,ollama';
  const DEFAULT_OLLAMA_URL = 'http://localhost:11434/api/chat';
  const DEFAULT_OLLAMA_MODEL = 'llama3.1:8b';

  const apiKeyInput = document.getElementById('apiKey');
  const primaryModelInput = document.getElementById('primaryModel');
  const fallbackModelInput = document.getElementById('fallbackModel');
  const providerOrderSelect = document.getElementById('providerOrder');
  const fallbackCheckbox = document.getElementById('fallbackCheckbox');
  const arbitrationCheckbox = document.getElementById('arbitrationCheckbox');
  const ollamaUrlInput = document.getElementById('ollamaUrl');
  const ollamaModelInput = document.getElementById('ollamaModel');
  const debugCheckbox = document.getElementById('debugCheckbox');
  const saveBtn = document.getElementById('saveBtn');
  const trainBtn = document.getElementById('trainBtn');
  const viewBtn = document.getElementById('viewBtn');
  const statusDiv = document.getElementById('status');

  const getLocal = (keys) => {
    return (typeof browser !== 'undefined')
      ? browserAPI.storage.local.get(keys)
      : new Promise(resolve => browserAPI.storage.local.get(keys, resolve));
  };

  const setLocal = (obj) => {
    return (typeof browser !== 'undefined')
      ? browserAPI.storage.local.set(obj)
      : new Promise(resolve => browserAPI.storage.local.set(obj, resolve));
  };

  const removeLocal = (keys) => {
    return (typeof browser !== 'undefined')
      ? browserAPI.storage.local.remove(keys)
      : new Promise(resolve => browserAPI.storage.local.remove(keys, resolve));
  };

  // Load saved settings
  const loadSettings = () => {
    getLocal([
      'groq_key',
      'show_debug',
      'primary_model',
      'fallback_model',
      'provider_order',
      'fallback_enabled',
      'arbitration_enabled',
      'ollama_url',
      'ollama_model'
    ]).then((result) => {
      if (result.groq_key) {
        apiKeyInput.value = result.groq_key;
      }
      if (primaryModelInput) {
        primaryModelInput.value = result.primary_model || DEFAULT_PRIMARY_MODEL;
      }
      if (fallbackModelInput) {
        fallbackModelInput.value = result.fallback_model || DEFAULT_FALLBACK_MODEL;
      }
      if (providerOrderSelect) {
        providerOrderSelect.value = result.provider_order || DEFAULT_PROVIDER_ORDER;
      }
      if (fallbackCheckbox) {
        fallbackCheckbox.checked = typeof result.fallback_enabled === 'boolean' ? result.fallback_enabled : true;
      }
      if (arbitrationCheckbox) {
        arbitrationCheckbox.checked = !!result.arbitration_enabled;
      }
      if (ollamaUrlInput) {
        ollamaUrlInput.value = result.ollama_url || DEFAULT_OLLAMA_URL;
      }
      if (ollamaModelInput) {
        ollamaModelInput.value = result.ollama_model || DEFAULT_OLLAMA_MODEL;
      }
      if (result.show_debug) {
        debugCheckbox.checked = result.show_debug;
      }
    });
  };

  loadSettings();

  // Save settings
  saveBtn.addEventListener('click', () => {
    const groqKey = apiKeyInput.value.trim();
    const primaryModel = (primaryModelInput?.value || '').trim() || DEFAULT_PRIMARY_MODEL;
    const fallbackModel = (fallbackModelInput?.value || '').trim() || DEFAULT_FALLBACK_MODEL;
    const providerOrder = (providerOrderSelect?.value || DEFAULT_PROVIDER_ORDER).trim();
    const fallbackEnabled = !!(fallbackCheckbox?.checked);
    const arbitrationEnabled = !!(arbitrationCheckbox?.checked);
    const ollamaUrl = (ollamaUrlInput?.value || '').trim() || DEFAULT_OLLAMA_URL;
    const ollamaModel = (ollamaModelInput?.value || '').trim() || DEFAULT_OLLAMA_MODEL;
    const showDebug = debugCheckbox.checked;

    const storageObj = {
      groq_model: primaryModel,
      groq_key: groqKey,
      show_debug: showDebug,
      primary_model: primaryModel,
      fallback_model: fallbackModel,
      provider_order: providerOrder,
      fallback_enabled: fallbackEnabled,
      arbitration_enabled: arbitrationEnabled,
      ollama_url: ollamaUrl,
      ollama_model: ollamaModel
    };

    setLocal(storageObj)
      .then(() => removeLocal(['gemini_key', 'platform_mode']))
      .then(() => {
        statusDiv.textContent = 'Policy Updated.';
        setTimeout(() => statusDiv.textContent = '', 2000);
      })
      .catch(err => {
        console.error('Save error:', err);
        statusDiv.textContent = 'Error saving policy.';
      });
  });

  // Train Knowledge
  trainBtn.addEventListener('click', () => {
    statusDiv.textContent = 'Training...';

    browserAPI.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        browserAPI.tabs.sendMessage(tabs[0].id, { action: 'extract_content' }, (response) => {
          if (browserAPI.runtime.lastError) {
            statusDiv.textContent = 'Error: Refresh page.';
            return;
          }

          if (response && response.text) {
            browserAPI.runtime.sendMessage({
              action: 'train_knowledge',
              text: response.text
            }, (bgResponse) => {
              if (bgResponse && bgResponse.success) {
                statusDiv.textContent = `Knowledge Updated! (${bgResponse.count} entries)`;
              } else {
                statusDiv.textContent = 'Training Failed: ' + (bgResponse?.error || 'Unknown');
              }
              setTimeout(() => statusDiv.textContent = '', 3000);
            });
          } else {
            statusDiv.textContent = 'No content found.';
          }
        });
      } else {
        statusDiv.textContent = 'Error: No active tab';
      }
    });
  });

  // View Knowledge
  viewBtn.addEventListener('click', () => {
    browserAPI.tabs.create({ url: 'viewer.html' });
  });
});
