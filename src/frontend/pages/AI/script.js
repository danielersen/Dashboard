import { authedFetch } from "/lib/auth.js";

const AI_BASE = "/api/ai";

const state = {
  models: [],
  currentSection: "ai",
  loading: false,
};

/* ===================== API ===================== */
async function aiGet(sub) {
  const res = await authedFetch(`${AI_BASE}/${sub}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid API response");
  }
  if (json && json.error) {
    throw new Error(json.error);
  }
  const data = json && Object.prototype.hasOwnProperty.call(json, "resp")
    ? json.resp
    : json;
  if (data && data.ok === false && data.error) {
    throw new Error(data.error);
  }
  return data;
}

async function aiPost(sub, body) {
  const res = await authedFetch(`${AI_BASE}/${sub}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return Object.prototype.hasOwnProperty.call(json, "resp") ? json.resp : json;
  } catch {
    return null;
  }
}

/* ===================== SECTION NAV ===================== */
const sidebarButtons = document.querySelectorAll(".ai-nav");
const sections = document.querySelectorAll(".ai-section");

function showSection(target) {
  sections.forEach((section) => {
    section.hidden = section.id !== target;
  });
  sidebarButtons.forEach((btn) => {
    btn.dataset.active = String(btn.dataset.target === target);
  });
  state.currentSection = target;
}

sidebarButtons.forEach((btn) => {
  btn.addEventListener("click", () => showSection(btn.dataset.target));
});

/* ===================== MODELS ===================== */
async function loadModels() {
  try {
    const data = await aiGet("categories");
    if (data && data.availableModels) {
      state.models = data.availableModels;
      populateModelSelects();
    }
  } catch (error) {
    console.error("Failed to load models:", error);
    showError("Failed to load available models");
  }
}

function populateModelSelects() {
  const selects = document.querySelectorAll("[data-model-select]");
  selects.forEach(select => {
    select.innerHTML = "";
    if (state.models.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No models available";
      select.appendChild(option);
      return;
    }
    
    state.models.forEach(model => {
      const option = document.createElement("option");
      option.value = model.model;
      option.textContent = model.model;
      option.dataset.consumption = model.consumption || "unknown";
      select.appendChild(option);
    });

    // Set first model as default
    if (state.models.length > 0) {
      select.value = state.models[0].model;
      updateConsumptionDisplay(select);
    }

    // Add change listener
    select.addEventListener("change", () => updateConsumptionDisplay(select));
  });
}

function updateConsumptionDisplay(select) {
  const selectedOption = select.selectedOptions[0];
  const consumptionDisplay = select.parentElement.querySelector("[data-consumption]");
  if (selectedOption && consumptionDisplay) {
    const consumption = selectedOption.dataset.consumption || "unknown";
    consumptionDisplay.textContent = `Consumption: ${consumption}`;
  }
}

/* ===================== PROMPT HANDLING ===================== */
async function handlePrompt(category, prompt, model) {
  if (!prompt.trim()) {
    showError("Please enter a prompt");
    return;
  }

  if (!model) {
    showError("Please select a model");
    return;
  }

  const responseContainer = document.querySelector(`#${category} [data-response]`);
  const submitButton = document.querySelector(`#${category} [data-submit]`);
  
  // Show loading state
  state.loading = true;
  submitButton.disabled = true;
  responseContainer.innerHTML = '<div class="ai-loading">Processing your request...</div>';

  try {
    const response = await aiPost(`${category}/ask`, {
      prompt: prompt,
      model: model,
    });

    if (response && response.result) {
      displayResponse(responseContainer, response.result.response || response.result);
    } else if (response && response.error) {
      showError(response.error, responseContainer);
    } else {
      showError("Unexpected response format", responseContainer);
    }
  } catch (error) {
    console.error("API error:", error);
    showError(error.message || "Failed to process your request", responseContainer);
  } finally {
    state.loading = false;
    submitButton.disabled = false;
  }
}

function displayResponse(container, content) {
  let formattedContent;
  if (typeof content === "object") {
    formattedContent = `<pre><code>${JSON.stringify(content, null, 2)}</code></pre>`;
  } else {
    formattedContent = `<div class="ai-response-content"><p>${escapeHtml(content)}</p></div>`;
  }
  container.innerHTML = formattedContent;
}

function showError(message, container = null) {
  const errorHtml = `<div class="ai-error">${escapeHtml(message)}</div>`;
  if (container) {
    container.innerHTML = errorHtml;
  } else {
    console.error(message);
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* ===================== EVENT LISTENERS ===================== */
function setupPromptHandlers() {
  const categories = ["ai", "search-web", "reasoning", "pictures"];
  
  categories.forEach(category => {
    const promptInput = document.querySelector(`#${category} [data-prompt]`);
    const submitButton = document.querySelector(`#${category} [data-submit]`);
    const modelSelect = document.querySelector(`#${category} [data-model-select]`);

    if (promptInput && submitButton && modelSelect) {
      submitButton.addEventListener("click", () => {
        const prompt = promptInput.value;
        const model = modelSelect.value;
        handlePrompt(category, prompt, model);
      });

      // Allow Ctrl+Enter to submit
      promptInput.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
          const prompt = promptInput.value;
          const model = modelSelect.value;
          handlePrompt(category, prompt, model);
        }
      });
    }
  });
}

/* ===================== INITIALIZATION ===================== */
async function init() {
  await loadModels();
  setupPromptHandlers();
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}