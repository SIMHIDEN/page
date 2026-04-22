// Content script to interact with Moodle page - FortiAI Pro v3.0

// Browser API compatibility (Firefox vs Chrome)
const browserAPI = (typeof browser !== 'undefined') ? browser : chrome;

// Ctrl+Click handler for Moodle mode
document.addEventListener('click', (event) => {
  if (!event.ctrlKey) return;

  // Only act if click is inside a Moodle question container
  const questionContainer = event.target.closest('.que');
  if (!questionContainer) return;

  event.preventDefault();
  event.stopPropagation();

  console.log('[Forti Pro] Ctrl+Click detected in question container');
  performSolve(questionContainer);
}, true);

function findActiveQuestionContainer() {
  const questions = Array.from(document.querySelectorAll('.que'));
  if (questions.length === 0) return null;
  if (questions.length === 1) return questions[0];

  const viewportCenter = window.innerHeight / 2;
  let closest = null;
  let minDistance = Infinity;

  questions.forEach((question) => {
    const rect = question.getBoundingClientRect();
    // Prefer visible questions
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;

    const center = rect.top + (rect.height / 2);
    const distance = Math.abs(center - viewportCenter);
    if (distance < minDistance) {
      minDistance = distance;
      closest = question;
    }
  });

  return closest || questions[0];
}

function extractQuestion(sourceQuestionContainer = null) {
  // Support multichoice, truefalse, and match question types
  const questionContainer = sourceQuestionContainer ||
                            findActiveQuestionContainer() ||
                            document.querySelector('.que.multichoice') ||
                            document.querySelector('.que.truefalse') ||
                            document.querySelector('.que.match') ||
                            document.querySelector('.que');

  if (!questionContainer) {
    return null;
  }

  // Extract question text, excluding any prompt/explanation divs
  let questionText = '';
  const qtextDiv = questionContainer.querySelector('.qtext');
  if (qtextDiv) {
    const clone = qtextDiv.cloneNode(true);
    clone.querySelectorAll('.prompt, .explanation, div.qtext').forEach(el => el.remove());
    questionText = clone.innerText || '';
  }

  // Match questions
  if (questionContainer.classList.contains('match')) {
    const subQuestions = [];
    const rows = questionContainer.querySelectorAll('tr.r0, tr.r1');
    let options = [];

    rows.forEach((row, index) => {
      const textCell = row.querySelector('td.text');
      const controlCell = row.querySelector('td.control');

      if (textCell && controlCell) {
        const text = textCell.innerText.trim();
        const select = controlCell.querySelector('select');

        if (select) {
          if (options.length === 0) {
            select.querySelectorAll('option').forEach(opt => {
              if (opt.value !== '0') {
                options.push({
                  value: opt.value,
                  text: opt.innerText.trim()
                });
              }
            });
          }

          subQuestions.push({
            id: select.id,
            text: text,
            index: index + 1
          });
        }
      }
    });

    if (subQuestions.length > 0) {
      return {
        type: 'match',
        text: questionText,
        sub_questions: subQuestions,
        options: options
      };
    }
  }

  // Multichoice / TrueFalse
  const options = [];
  const inputs = questionContainer.querySelectorAll('input[type="radio"], input[type="checkbox"]');
  const validInputs = Array.from(inputs).filter(input =>
    (input.name.includes('_answer') || input.name.includes('choice')) &&
    input.type !== 'hidden'
  );

  const inputsToUse = validInputs.length > 0 ? validInputs : inputs;

  inputsToUse.forEach((input, index) => {
    if (input.value === '-1') return;

    let labelText = '';
    const ariaLabelledBy = input.getAttribute('aria-labelledby');
    if (ariaLabelledBy) {
      const labelElement = document.getElementById(ariaLabelledBy);
      if (labelElement) labelText = labelElement.innerText;
    }

    if (!labelText) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.innerText;
    }

    if (!labelText) {
      const nearbyLabel = input.closest('.r0, .r1, .answer')?.querySelector('[data-region="answer-label"], label') ||
                          input.parentElement.querySelector('label') ||
                          input.nextElementSibling;
      if (nearbyLabel) labelText = nearbyLabel.innerText;
    }

    options.push({
      letter: String.fromCharCode(97 + index),
      text: labelText.trim() || '',
      inputId: input.id,
      index: index,
      value: input.value,
      type: input.type
    });
  });

  if (options.length > 0) {
    return {
      type: 'multichoice',
      text: questionText,
      options: options
    };
  }

  return null;
}

function parseAnswerLetters(question, answerData) {
  const raw = String(answerData || '').trim();
  if (!raw || !question?.options?.length) return [];

  const validLetters = new Set(
    question.options
      .map(opt => String(opt.letter || '').toLowerCase())
      .filter(Boolean)
  );

  let candidate = raw;

  const tagMatch = raw.match(/<answer>([\s\S]*?)<\/answer>/i);
  if (tagMatch && tagMatch[1]) {
    candidate = tagMatch[1].trim();
  } else {
    const explicitMatch = raw.match(/(?:^|\n)\s*(?:final\s+answer|correct\s+answer|answer)\s*[:\-]\s*([^\n]+)/i);
    if (explicitMatch && explicitMatch[1]) {
      candidate = explicitMatch[1].trim();
    } else {
      const lines = raw.split('\n').map(line => line.trim()).filter(Boolean);
      const letterOnlyLine = lines.find(line => /^[a-z](?:\s*[,;/&]\s*[a-z])*$/.test(line.toLowerCase()));
      if (letterOnlyLine) {
        candidate = letterOnlyLine;
      } else if (lines.length > 0) {
        candidate = lines[lines.length - 1];
      }
    }
  }

  let letters = candidate.toLowerCase().match(/\b[a-z]\b/g) || [];
  if (letters.length === 0) {
    letters = candidate
      .toLowerCase()
      .split(/[,\s;/&]+/)
      .map(part => part.replace(/[^a-z]/g, ''))
      .filter(part => part.length === 1);
  }

  return [...new Set(letters.filter(letter => validLetters.has(letter)))];
}

function selectAnswer(question, answerData, questionContainer = null) {
  if (question.type === 'match') {
    console.log('Processing Match Answer:', answerData);

    question.sub_questions.forEach(sub => {
      const indexRegex = new RegExp(`(?:^|\\n)\\s*${sub.index}\\.?\\s*[:\\-]?\\s*([a-zA-Z])`, 'i');
      const matchIndex = answerData.match(indexRegex);

      let targetOptionLetter = null;
      if (matchIndex) {
        targetOptionLetter = matchIndex[1];
      }

      if (targetOptionLetter) {
        const optIndex = targetOptionLetter.toLowerCase().charCodeAt(0) - 97;
        if (optIndex >= 0 && optIndex < question.options.length) {
          const targetValue = question.options[optIndex].value;
          const select = document.getElementById(sub.id);
          if (select) {
            select.value = targetValue;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Matched ${sub.index} to ${targetOptionLetter}`);
          }
        }
      }
    });
    return;
  }

  // Multichoice / Checkbox
  const answers = parseAnswerLetters(question, answerData);
  const fallbackInputs = questionContainer
    ? Array.from(questionContainer.querySelectorAll('input[type="radio"], input[type="checkbox"]')).filter(input => input.type !== 'hidden')
    : [];

  if (answers.length === 0) {
    console.warn('Forti: Could not parse answer letters from model output:', answerData);
    return;
  }

  answers.forEach(ans => {
    let option = question.options.find(opt => opt.letter.toLowerCase() === ans);

    if (!option) {
      option = question.options.find(opt =>
        opt.text.toLowerCase().includes(ans) ||
        ans.includes(opt.text.toLowerCase())
      );
    }

    if (option) {
      let input = option.inputId ? document.getElementById(option.inputId) : null;
      if (!input && fallbackInputs.length > 0) {
        input = fallbackInputs[option.index] || null;
      }

      if (input && !input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // Fallback if UI did not reflect selection
        if (!input.checked) {
          input.click();
        }
        console.log(`Selected: ${option.letter}`);
      }
    }
  });
}

// Logic to handle solving
async function performSolve(sourceQuestionContainer = null) {
  let showDebug = false;

  try {
    const res = await browserAPI.storage.local.get(['show_debug']);
    showDebug = !!res.show_debug;
  } catch (e) {}

  const activeQuestionContainer = sourceQuestionContainer || findActiveQuestionContainer();
  const question = extractQuestion(activeQuestionContainer);
  if (!question) {
    if (showDebug) {
      console.log('Forti: No Moodle question found.');
    }
    return;
  }

  try {
    const response = await browserAPI.runtime.sendMessage({
      action: 'solve_question',
      question: question
    });

    if (response && response.answer) {
      if (showDebug) {
        console.log('=== Forti Analysis ===');
        console.log('Thinking:', response.thinking || 'No analysis provided');
        console.log('Suggested Answer:', response.answer);
      }
      selectAnswer(question, response.answer, activeQuestionContainer);
    } else if (response && response.error) {
      if (showDebug) {
        console.error('Forti Error from Background:', response.error);
      }
      console.error('Background Error:', response.error);
    } else {
      if (showDebug) {
        console.log('Forti: Unknown response from background script.');
      }
      console.log('Unknown response:', response);
    }
  } catch (error) {
    if (showDebug) {
      console.error('Forti Communication Error:', error.message);
    }
    console.error(`Communication Error: ${error.message}`);
  }
}

// Listen for messages from background (triggered by manifest shortcut)
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'trigger_solve') {
    performSolve();
  }

  if (message.action === 'extract_content') {
    console.log('[Forti Train] extract_content message received');
    const content = extractPageContent();
    console.log('[Forti Train] Content extracted, length:', content.length, 'chars');
    console.log('[Forti Train] Content preview:', content.substring(0, 150) + '...');
    sendResponse({ text: content });
    return true;
  }
});

function extractPageContent() {
  console.log('[Forti Train] extractPageContent() called');

  // Target main Moodle content areas
  const selectors = [
    '#region-main',
    '[role="main"]',
    '.region-main',
    '.course-content',
    'body'
  ];

  let contentElement = null;
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 100) {
      contentElement = el;
      console.log('[Forti Train] Found content in:', sel);
      break;
    }
  }

  if (!contentElement) {
    contentElement = document.body;
    console.log('[Forti Train] Falling back to body element');
  }

  const clone = contentElement.cloneNode(true);

  const removeSelectors = [
    'script', 'style', 'noscript', 'iframe',
    '.navigation', '.breadcrumb', '.footer', '.header',
    '.activity-navigation',
    '.btn', 'button', 'input', 'select', 'textarea',
    '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
  ];

  removeSelectors.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  let text = clone.innerText.replace(/\s+/g, ' ').trim();

  console.log('[Forti Train] Extracted text length:', text.length, 'chars');

  const MAX_EXTRACT = 5000;
  if (text.length > MAX_EXTRACT) {
    console.warn(`[Forti Train] Content too large (${text.length} chars), truncating to ${MAX_EXTRACT} chars`);
    console.warn('[Forti Train] TIP: Navigate to a smaller page (single lesson) for best results');
    text = text.slice(0, MAX_EXTRACT);
  }

  console.log('[Forti Train] Returning text length:', text.length, 'chars');
  return text;
}

// Manual key listener with aggressive capture
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey && event.shiftKey && event.code === 'KeyY') {
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();
    performSolve();
  }
}, true);
