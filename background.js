// Background script to handle API calls - FortiAI Pro v3.0

console.log('[Forti Pro BG] Background script loaded!');

const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

// Default proxy configuration (can be overridden by config.txt)
let PROXY_URL = 'https://safeexambrowser.signalrwebsocket.workers.dev';
let USE_PROXY = true;

// Pre-trained knowledge index file (lists all training files)
const PRETRAINED_INDEX = 'pre_trained/index.txt';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant';
const DEFAULT_OLLAMA_MODEL = 'llama3.1:8b';
const DEFAULT_OLLAMA_URL = 'http://localhost:11434/api/chat';
const DEFAULT_PROVIDER_ORDER = 'groq,ollama';
const GPT_PROVIDER_WEIGHT = 1.5;
const OLLAMA_PROVIDER_WEIGHT = 0.75;
const MAX_TRAIN_CONTENT_CHARS = 3500;
const MAX_KNOWLEDGE_CONTEXT_CHARS = 2600;
const MAX_QUESTION_TEXT_CHARS = 1200;
const MAX_OPTION_TEXT_CHARS = 220;
const MAX_MATCH_ITEM_TEXT_CHARS = 180;

function truncateForPrompt(text, maxChars) {
  const value = String(text || '').trim();
  if (!value || value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars)}\n...[truncated ${value.length - maxChars} chars]`;
}

function buildKnowledgeContext(stored, maxChars = MAX_KNOWLEDGE_CONTEXT_CHARS) {
  const sections = [];

  if (stored.pretrained_context) {
    const truncatedPretrained = truncateForPrompt(stored.pretrained_context, Math.floor(maxChars * 0.7));
    if (truncatedPretrained) {
      sections.push(`PRE-TRAINED KNOWLEDGE:\n${truncatedPretrained}`);
    }
  }

  if (stored.knowledge_base && Array.isArray(stored.knowledge_base) && stored.knowledge_base.length > 0) {
    const learnedRaw = stored.knowledge_base.slice(-3).join('\n\n');
    const truncatedLearned = truncateForPrompt(learnedRaw, Math.floor(maxChars * 0.4));
    if (truncatedLearned) {
      sections.push(`LEARNED KNOWLEDGE:\n${truncatedLearned}`);
    }
  }

  return truncateForPrompt(sections.join('\n\n'), maxChars);
}

// API endpoints
const getGroqUrl = () => {
  if (USE_PROXY && PROXY_URL) {
    const base = PROXY_URL.replace(/\/+$/, '');
    return `${base}/groq/openai/v1/chat/completions`;
  }
  return 'https://api.groq.com/openai/v1/chat/completions';
};

const getOllamaUrl = (storedOllamaUrl = '') => {
  const explicit = String(storedOllamaUrl || '').trim();
  return explicit || DEFAULT_OLLAMA_URL;
};

// Load config.txt on startup
async function loadConfigFile() {
  console.log('[Forti Pro] Loading config.txt...');

  try {
    const url = browserAPI.runtime.getURL('config.txt');
    const response = await fetch(url);
    if (!response.ok) {
      console.log('[Forti Pro] No config.txt found, using defaults');
      return;
    }

    const text = await response.text();
    const config = {};

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        if (value) config[key] = value;
      }
    }

    console.log('[Forti Pro] Config loaded:', Object.keys(config));

    if (config.PROXY_URL) {
      PROXY_URL = config.PROXY_URL;
      USE_PROXY = true;
      console.log('[Forti Pro] Proxy URL:', PROXY_URL);
    } else {
      USE_PROXY = false;
    }

    const existing = await browserAPI.storage.local.get([
      'groq_key',
      'groq_model',
      'primary_model',
      'fallback_model',
      'provider_order',
      'fallback_enabled',
      'arbitration_enabled',
      'ollama_url',
      'ollama_model'
    ]);
    const storageObj = {};

    if (config.GROQ_KEY && !existing.groq_key) {
      storageObj.groq_key = config.GROQ_KEY;
    }
    if (config.DEBUG === 'true') {
      storageObj.show_debug = true;
    }
    if (config.PROXY_URL) {
      storageObj.proxy_url = config.PROXY_URL;
    }

    if (!existing.primary_model) {
      storageObj.primary_model = config.PRIMARY_MODEL || DEFAULT_GROQ_MODEL;
    }
    if (!existing.fallback_model) {
      storageObj.fallback_model = config.FALLBACK_MODEL || DEFAULT_GROQ_FALLBACK_MODEL;
    }
    if (!existing.provider_order) {
      storageObj.provider_order = config.MODEL_PROVIDER_ORDER || DEFAULT_PROVIDER_ORDER;
    }
    if (typeof existing.fallback_enabled !== 'boolean') {
      const fallbackFromConfig = String(config.ENABLE_FALLBACK || '').toLowerCase();
      storageObj.fallback_enabled = fallbackFromConfig ? fallbackFromConfig !== 'false' : true;
    }
    if (typeof existing.arbitration_enabled !== 'boolean') {
      storageObj.arbitration_enabled = String(config.ENABLE_ARBITRATION || '').toLowerCase() === 'true';
    }
    if (!existing.ollama_url) {
      storageObj.ollama_url = config.OLLAMA_URL || DEFAULT_OLLAMA_URL;
    }
    if (!existing.ollama_model) {
      storageObj.ollama_model = config.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL;
    }
    if (!existing.groq_model) {
      storageObj.groq_model = config.PRIMARY_MODEL || DEFAULT_GROQ_MODEL;
    }

    if (Object.keys(storageObj).length > 0) {
      await browserAPI.storage.local.set(storageObj);
      console.log('[Forti Pro] Config applied to storage');
    } else {
      console.log('[Forti Pro] Existing config found, no migration needed');
    }
  } catch (e) {
    console.log('[Forti Pro] Config load error:', e.message);
  }
}

async function cleanupLegacySettings() {
  try {
    await browserAPI.storage.local.remove(['gemini_key', 'platform_mode']);
    console.log('[Forti Pro] Legacy settings removed');
  } catch (e) {
    console.warn('[Forti Pro] Legacy settings cleanup failed:', e.message);
  }
}

// Load pre-trained knowledge on extension startup
async function loadPreTrainedKnowledge() {
  console.log('[Forti Pro] Loading pre-trained knowledge files...');

  let stored;
  try {
    stored = await browserAPI.storage.local.get('pretrained_loaded');
  } catch (e) {
    console.error('[Forti Pro] Storage check failed:', e);
    return;
  }

  if (stored.pretrained_loaded) {
    console.log('[Forti Pro] Pre-trained knowledge already loaded');
    return;
  }

  let fileList = [];
  try {
    const indexUrl = browserAPI.runtime.getURL(PRETRAINED_INDEX);
    const indexResponse = await fetch(indexUrl);
    if (indexResponse.ok) {
      const indexText = await indexResponse.text();
      fileList = indexText.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'))
        .map(filename => `pre_trained/${filename}`);
      console.log(`[Forti Pro] Found ${fileList.length} files in index`);
    } else {
      console.warn('[Forti Pro] Could not load index file, no pre-trained files will be loaded');
      return;
    }
  } catch (e) {
    console.warn('[Forti Pro] Error reading index file:', e.message);
    return;
  }

  let pretrainedContext = '';

  for (const filePath of fileList) {
    try {
      const fileUrl = browserAPI.runtime.getURL(filePath);
      const fileResponse = await fetch(fileUrl);
      if (fileResponse.ok) {
        const fileText = await fileResponse.text();
        pretrainedContext += `\n--- Pre-trained: ${filePath} ---\n${fileText}\n`;
        console.log(`[Forti Pro] Loaded ${filePath} (${fileText.length} chars)`);
      }
    } catch (e) {
      console.warn(`[Forti Pro] Could not load ${filePath}:`, e.message);
    }
  }

  if (pretrainedContext) {
    const saveObj = {
      pretrained_context: pretrainedContext,
      pretrained_loaded: true
    };
    try {
      await browserAPI.storage.local.set(saveObj);
      console.log('[Forti Pro] Pre-trained knowledge saved to storage');
    } catch (e) {
      console.warn('[Forti Pro] Could not save pre-trained context:', e.message);
    }
  }
}

// Initialize on startup
async function initialize() {
  await loadConfigFile();
  await cleanupLegacySettings();
  await loadPreTrainedKnowledge();
}

initialize().catch(e => console.warn('[Forti Pro] Initialization failed:', e));

browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Forti BG] Message received:', message.action);

  if (message.action === 'solve_question') {
    solveWithAI(message.question)
      .then(answer => sendResponse({ success: true, answer: answer.answer, thinking: answer.thinking }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'train_knowledge') {
    console.log('[Forti Train BG] train_knowledge message received');
    console.log('[Forti Train BG] Text length:', message.text?.length || 0, 'chars');
    trainKnowledge(message.text)
      .then(count => {
        console.log('[Forti Train BG] Training successful, count:', count);
        sendResponse({ success: true, count: count });
      })
      .catch(error => {
        console.error('[Forti Train BG] Training failed:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (message.action === 'clear_knowledge') {
    browserAPI.storage.local.remove('knowledge_base')
      .then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.action === 'purge_all_data') {
    browserAPI.storage.local.clear()
      .then(() => sendResponse({ success: true }));
    return true;
  }
});

async function trainKnowledge(text) {
  console.log('[Forti Train BG] trainKnowledge() called');
  console.log('[Forti Train BG] Input text length:', text?.length || 0);

  if (!text || text.length < 50) {
    console.error('[Forti Train BG] Content too short:', text?.length || 0, 'chars (min: 50)');
    throw new Error('Content too short to learn.');
  }

  // Keep requests compact to avoid token/rate pressure
  const MAX_CHARS = MAX_TRAIN_CONTENT_CHARS;
  const truncatedText = text.slice(0, MAX_CHARS);

  if (text.length > MAX_CHARS) {
    console.log(`[Forti Train BG] Text truncated from ${text.length} to ${truncatedText.length} chars to fit limits`);
  } else {
    console.log('[Forti Train BG] Text within limits:', truncatedText.length, 'chars');
  }

  let stored;
  try {
    if (typeof browser !== 'undefined') {
      stored = await browser.storage.local.get(['groq_model', 'groq_key']);
    } else {
      stored = await new Promise(resolve => chrome.storage.local.get(['groq_model', 'groq_key'], resolve));
    }
  } catch (e) {
    console.error('[Forti Train BG] Storage error:', e);
    throw new Error('Storage Error');
  }

  const apiKey = stored.groq_key;
  const modelName = stored.groq_model || DEFAULT_GROQ_MODEL;

  console.log('[Forti Train BG] API Key present:', !!apiKey);
  console.log('[Forti Train BG] Model:', modelName);

  if (!apiKey) {
    console.error('[Forti Train BG] No API key configured');
    throw new Error('API Key missing.');
  }

  const prompt = `You are an expert educational summarizer.
Analyze the following course material and extract the key facts, rules, definitions, and concepts.
Format the output as a concise list of facts that would help answer multiple-choice questions.
Be brief and focus on the most important information.

Content:
${truncatedText}`;

  const randomDelay = Math.floor(Math.random() * 901) + 100;
  console.log('[Forti Train BG] Adding random delay:', randomDelay, 'ms');
  await new Promise(resolve => setTimeout(resolve, randomDelay));

  console.log('[Forti Train BG] Calling Groq API via proxy...');
  const response = await fetch(getGroqUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    })
  });

  console.log('[Forti Train BG] API response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Forti Train BG] API error:', response.status, errorText);

    try {
      const errorJson = JSON.parse(errorText);
      const errorMsg = errorJson.error?.message || errorText;

      if (response.status === 413 || errorMsg.includes('Request too large') || errorMsg.includes('tokens per minute')) {
        throw new Error('Page too large. Try a smaller page or single lesson.');
      } else if (errorMsg.includes('rate limit') || errorMsg.includes('Rate limit')) {
        throw new Error('Rate limited. Wait a moment and try again.');
      } else if (response.status === 401) {
        throw new Error('Invalid API key.');
      } else {
        throw new Error(`API Error: ${errorMsg.substring(0, 100)}`);
      }
    } catch (e) {
      if (e.message.startsWith('Page too large') || e.message.startsWith('Rate limited') || e.message.startsWith('Invalid API key')) {
        throw e;
      }
      throw new Error(`API Error: ${response.status}`);
    }
  }

  const data = await response.json();
  console.log('[Forti Train BG] API response received');
  console.log('[Forti Train BG] Tokens used:', data.usage?.total_tokens || 'unknown');

  const summary = data.choices?.[0]?.message?.content;
  if (!summary) {
    console.error('[Forti Train BG] No summary in API response:', data);
    throw new Error('Summarization API Failed - no content');
  }

  console.log('[Forti Train BG] Summary length:', summary.length, 'chars');
  console.log('[Forti Train BG] Summary preview:', summary.substring(0, 200) + '...');

  console.log('[Forti Train BG] Reading current knowledge base...');
  let kb = [];
  let currentStorage;
  if (typeof browser !== 'undefined') {
    currentStorage = await browser.storage.local.get('knowledge_base');
  } else {
    currentStorage = await new Promise(resolve => chrome.storage.local.get('knowledge_base', resolve));
  }

  if (currentStorage.knowledge_base) {
    kb = currentStorage.knowledge_base;
    console.log('[Forti Train BG] Existing knowledge base has', kb.length, 'entries');
  } else {
    console.log('[Forti Train BG] Creating new knowledge base');
  }

  kb.push(`--- Learned Fact Block ---\n${summary}`);
  console.log('[Forti Train BG] Added new entry, total now:', kb.length);

  if (kb.length > 10) {
    kb.shift();
    console.log('[Forti Train BG] Removed oldest entry (limit: 10)');
  }

  console.log('[Forti Train BG] Saving knowledge base...');
  const saveObj = { knowledge_base: kb };
  if (typeof browser !== 'undefined') {
    await browser.storage.local.set(saveObj);
  } else {
    await new Promise(resolve => chrome.storage.local.set(saveObj, resolve));
  }

  console.log('[Forti Train BG] Training complete! Total entries:', kb.length);
  return kb.length;
}

async function solveWithAI(question) {
  let stored;
  try {
    if (typeof browser !== 'undefined') {
      stored = await browser.storage.local.get([
        'groq_model',
        'groq_key',
        'show_debug',
        'knowledge_base',
        'pretrained_context',
        'primary_model',
        'fallback_model',
        'provider_order',
        'fallback_enabled',
        'arbitration_enabled',
        'ollama_url',
        'ollama_model'
      ]);
    } else {
      stored = await new Promise(resolve => chrome.storage.local.get([
        'groq_model',
        'groq_key',
        'show_debug',
        'knowledge_base',
        'pretrained_context',
        'primary_model',
        'fallback_model',
        'provider_order',
        'fallback_enabled',
        'arbitration_enabled',
        'ollama_url',
        'ollama_model'
      ], resolve));
    }
  } catch (e) {
    console.error('Storage access error:', e);
    throw new Error('Failed to access storage.');
  }

  const primaryModel = stored.primary_model || stored.groq_model || DEFAULT_GROQ_MODEL;
  const fallbackGroqModel = stored.fallback_model || DEFAULT_GROQ_FALLBACK_MODEL;
  const ollamaModel = stored.ollama_model || DEFAULT_OLLAMA_MODEL;
  const providerOrder = String(stored.provider_order || DEFAULT_PROVIDER_ORDER)
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(item => item === 'groq' || item === 'ollama');
  const effectiveProviderOrder = providerOrder.length > 0 ? providerOrder : ['groq', 'ollama'];
  const fallbackEnabled = typeof stored.fallback_enabled === 'boolean' ? stored.fallback_enabled : true;
  const arbitrationEnabled = !!stored.arbitration_enabled;
  const apiKey = stored.groq_key;
  const showDebug = stored.show_debug || false;
  const apiUrl = getGroqUrl();
  const ollamaUrl = getOllamaUrl(stored.ollama_url);

  if (!apiKey && !effectiveProviderOrder.includes('ollama')) {
    throw new Error('Groq API key not set. Please configure in extension settings.');
  }

  if (showDebug) {
    console.log(`Primary model: ${primaryModel}`);
    console.log(`Fallback Groq model: ${fallbackGroqModel}`);
    console.log(`Ollama model: ${ollamaModel}`);
    console.log(`Provider order: ${effectiveProviderOrder.join(' -> ')}`);
    if (apiKey) {
      console.log(`Key (last 4): ...${apiKey.slice(-4)}`);
    }
  }

  const knowledgeContext = buildKnowledgeContext(stored);
  if (showDebug && knowledgeContext) {
    console.log(`Injected knowledge context (${knowledgeContext.length} chars).`);
  }

  const baseInstruction = `You are an expert assistant.
First, analyze the provided KNOWLEDGE BASE if available.
If the answer is found in the knowledge base, EXPLICITLY CITE the fact in your thinking process.
Then, analyze the question and options.

Strict reasoning rules:
1) Evaluate each option exactly once in order.
2) Never repeat options or restart evaluation loops.
3) Distinguish static analysis from dynamic/runtime behavior explicitly when relevant.
4) "All variants"/"all options" is allowed only if every option is individually validated as correct.
5) If evidence is missing, state uncertainty briefly instead of guessing.
6) End with a single final answer only once.`;

  let prompt;

  if (question.type === 'match') {
    const subQText = (question.sub_questions || [])
      .slice(0, 20)
      .map(sq => `${sq.index}. ${truncateForPrompt(sq.text, MAX_MATCH_ITEM_TEXT_CHARS)}`)
      .join('\n');
    const optionsText = (question.options || [])
      .slice(0, 26)
      .map((opt, idx) => `${String.fromCharCode(97 + idx)}. ${truncateForPrompt(opt.text, MAX_OPTION_TEXT_CHARS)}`)
      .join('\n');

    prompt = `${baseInstruction}

Match the following items (numbered) to the options (lettered).
${knowledgeContext ? `\n${knowledgeContext}\n` : ''}

Items to match:
${subQText}

Available Options:
${optionsText}

Determine the correct match for EACH item.
Format your response exactly as follows:
<thinking>
[Step-by-step reasoning for each match]
</thinking>
<answer>
1: [letter]
2: [letter]
...
</answer>`;
  } else {
    const safeQuestionText = truncateForPrompt(question.text, MAX_QUESTION_TEXT_CHARS);
    const optionsText = (question.options || [])
      .slice(0, 26)
      .map(opt => `${opt.letter}. ${truncateForPrompt(opt.text, MAX_OPTION_TEXT_CHARS)}`)
      .join('\n');

    prompt = `${baseInstruction}

Analyze the following content and options, determine the correct choice(s).
${knowledgeContext ? `\n${knowledgeContext}\n` : ''}

Question: ${safeQuestionText}

Options:
${optionsText}

If multiple answers are correct, list all of them.
Format your response exactly as follows:
<thinking>
[Your step-by-step reasoning here]
</thinking>
<answer>
[The letter(s) of the correct option(s), e.g., 'a' or 'a, c']
</answer>`;
  }

  if (showDebug) {
    console.log('Prompt:', prompt);
  }

  const randomDelay = Math.floor(Math.random() * 901) + 100;
  if (showDebug) console.log(`Adding jitter delay: ${randomDelay}ms`);
  await new Promise(resolve => setTimeout(resolve, randomDelay));
  const callGroq = async (modelName) => {
    if (!apiKey) {
      throw new Error('Groq API key missing.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText || 'Unknown API error';
        if (response.status === 401) {
          throw new Error(`Authentication Failed: ${errorMsg}`);
        }
        if (response.status === 413) {
          throw new Error('Request too large for model limits.');
        }
        throw new Error(`Groq API Error (${response.status}): ${errorMsg}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('No content returned from Groq model.');
      }
      return text;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const callOllama = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          stream: false,
          options: { temperature: 0.1 }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Ollama API Error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const text = data.message?.content || data.response;
      if (!text) {
        throw new Error('No content returned from Ollama model.');
      }
      return text;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const isFallbackEligibleError = (errorMessage) => {
    const msg = String(errorMessage || '').toLowerCase();
    return msg.includes('timed out') ||
      msg.includes('rate') ||
      msg.includes('quota') ||
      msg.includes('temporar') ||
      msg.includes('unavailable') ||
      msg.includes('connection') ||
      msg.includes('network') ||
      msg.includes('authentication failed') ||
      msg.includes('api key');
  };

  const parseCandidateAnswer = (rawText) => {
    const answerMatch = rawText.match(/<answer>([\s\S]*?)<\/answer>/i);
    const explicitAnswer = answerMatch ? answerMatch[1].trim() : rawText.trim();
    if (question.type === 'match') {
      const lines = explicitAnswer.split('\n').map(line => line.trim()).filter(Boolean);
      const validLines = lines.filter(line => /^\d+\.?\s*[:\-]\s*[a-z]$/i.test(line));
      return {
        normalized: validLines.join('\n') || explicitAnswer.toLowerCase(),
        selectedCount: validLines.length
      };
    }

    const letters = (explicitAnswer.toLowerCase().match(/\b[a-z]\b/g) || [])
      .filter(letter => (question.options || []).some(opt => String(opt.letter || '').toLowerCase() === letter));
    return {
      normalized: [...new Set(letters)].join(', '),
      selectedCount: [...new Set(letters)].length
    };
  };

  const scoreCandidate = (provider, rawText) => {
    const candidate = parseCandidateAnswer(rawText);
    const optionCount = (question.options || []).length;
    const lower = String(rawText || '').toLowerCase();
    const mentionsAll = lower.includes('all variants') || lower.includes('all options') || lower.includes('all of the above');
    const allSelected = optionCount > 0 && candidate.selectedCount === optionCount;
    const providerWeight = provider === 'groq' ? GPT_PROVIDER_WEIGHT : OLLAMA_PROVIDER_WEIGHT;
    let score = providerWeight;
    if (!candidate.normalized) score -= 2;
    if (mentionsAll && !allSelected) score -= 4;
    if (candidate.selectedCount > 0) score += Math.min(candidate.selectedCount, 3) * 0.2;
    return { candidate, score };
  };

  const invokeProvider = async (provider, modelName) => {
    if (provider === 'groq') {
      return await callGroq(modelName || primaryModel);
    }
    if (provider === 'ollama') {
      return await callOllama();
    }
    throw new Error(`Unsupported provider: ${provider}`);
  };

  let text = '';
  let bestProvider = '';

  if (arbitrationEnabled && effectiveProviderOrder.includes('groq') && effectiveProviderOrder.includes('ollama')) {
    const arbitrationResults = [];
    for (const provider of ['groq', 'ollama']) {
      try {
        const raw = await invokeProvider(provider, provider === 'groq' ? primaryModel : ollamaModel);
        const scored = scoreCandidate(provider, raw);
        arbitrationResults.push({ provider, raw, score: scored.score });
      } catch (err) {
        if (showDebug) {
          console.warn(`[Forti Pro] Arbitration provider failed (${provider}):`, err.message);
        }
      }
    }

    if (arbitrationResults.length === 0) {
      throw new Error('Both providers failed during arbitration.');
    }

    arbitrationResults.sort((a, b) => b.score - a.score);
    text = arbitrationResults[0].raw;
    bestProvider = arbitrationResults[0].provider;
  } else {
    const firstProvider = effectiveProviderOrder[0];
    const fallbackProvider = effectiveProviderOrder[1];
    try {
      text = await invokeProvider(firstProvider, firstProvider === 'groq' ? primaryModel : ollamaModel);
      bestProvider = firstProvider;
    } catch (firstError) {
      if (!fallbackEnabled || !fallbackProvider || !isFallbackEligibleError(firstError.message)) {
        throw firstError;
      }
      if (showDebug) {
        console.warn(`[Forti Pro] Primary provider failed (${firstProvider}), using fallback (${fallbackProvider})`);
      }
      text = await invokeProvider(
        fallbackProvider,
        fallbackProvider === 'groq' ? fallbackGroqModel : ollamaModel
      );
      bestProvider = fallbackProvider;
    }
  }

  if (showDebug) {
    console.log(`Solved via provider: ${bestProvider}`);
    console.log('AI Response:', text);
  }

  const thinkingMatch = text.match(/<thinking>([\s\S]*?)<\/thinking>/i);
  const answerMatch = text.match(/<answer>([\s\S]*?)<\/answer>/i);

  let thinking = thinkingMatch ? thinkingMatch[1].trim() : text;
  let answer = answerMatch ? answerMatch[1].trim() : '';

  if (!answer) {
    const explicitMatch = text.match(/Answer:\s*([a-zA-Z0-9, ]+)/i);
    if (explicitMatch) {
      answer = explicitMatch[1].trim();
    } else {
      const lastLetter = text.match(/(?:^|\n| )\s*([a-zA-Z])\s*$/);
      if (lastLetter) {
        answer = lastLetter[1];
      } else {
        answer = text.trim();
      }
    }
  }

  const answerLower = answer.toLowerCase();
  const optionCount = (question.options || []).length;
  const hasAllVariants = answerLower.includes('all variants') || answerLower.includes('all options') || answerLower.includes('all of the above');
  const pickedLetters = (answerLower.match(/\b[a-z]\b/g) || []);
  if (hasAllVariants && optionCount > 0 && pickedLetters.length < optionCount) {
    throw new Error('Model output invalid: "all variants" was used without validating every option.');
  }

  return { answer: answerLower, thinking };
}

// Handle keyboard shortcut from manifest
browserAPI.commands.onCommand.addListener((command) => {
  if (command === 'solve_question') {
    browserAPI.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0) {
        browserAPI.tabs.sendMessage(tabs[0].id, { action: 'trigger_solve' });
      }
    });
  }
});
