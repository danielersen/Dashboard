import { authedFetch } from "/lib/auth.js";

const AI_BASE = "/api/ai";

const state = {
  models: [],
  categorizedModels: {},
  currentSection: "ai",
  loading: false,
  selectedCategory: "basic",
  selectedCompany: null,
  selectedModel: null,
};

// Mapping from frontend category names to backend category names
const CATEGORY_ALIASES = {
  "ai": "basic",
  "search-web": "search_web",
  "reasoning": "reasonning",
  "pictures": "pictures",
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
  console.log("API Response for", sub, ":", data);
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
      state.categorizedModels = data.categorizedModels || {};
      populateModelSelects();
    }
  } catch (error) {
    console.error("Failed to load models:", error);
    showError("Failed to load available models");
  }
}

function populateModelSelects() {
  const categorySelect = document.getElementById("category-select");
  const companySelect = document.getElementById("company-select");
  const modelSelect = document.getElementById("model-select");
  
  if (!categorySelect || !companySelect || !modelSelect) return;
  
  // Setup category dropdown
  setupCategoryDropdown(categorySelect);
  
  // Setup company dropdown
  setupCompanyDropdown(companySelect);
  
  // Setup model dropdown
  setupModelDropdown(modelSelect);
  
  // Initial population
  populateCompanies();
}

function setupCategoryDropdown(select) {
  const trigger = select.querySelector(".custom-select-trigger");
  const optionsContainer = select.querySelector(".custom-options");
  
  select.addEventListener("click", (e) => {
    if (e.target.closest(".custom-option")) return;
    select.classList.toggle("open");
  });
  
  optionsContainer.querySelectorAll(".custom-option").forEach(option => {
    option.addEventListener("click", () => {
      optionsContainer.querySelectorAll(".custom-option").forEach(opt => opt.classList.remove("selected"));
      option.classList.add("selected");
      trigger.textContent = option.textContent;
      state.selectedCategory = option.dataset.value;
      select.classList.remove("open");
      populateCompanies();
    });
  });
  
  // Set default
  const defaultOption = optionsContainer.querySelector('[data-value="basic"]');
  if (defaultOption) {
    defaultOption.classList.add("selected");
  }
}

function setupCompanyDropdown(select) {
  const trigger = select.querySelector(".custom-select-trigger");
  const optionsContainer = select.querySelector(".custom-options");
  
  select.addEventListener("click", (e) => {
    if (e.target.closest(".custom-option")) return;
    select.classList.toggle("open");
  });
  
  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) {
      select.classList.remove("open");
    }
  });
}

function setupModelDropdown(select) {
  const trigger = select.querySelector(".custom-select-trigger");
  const optionsContainer = select.querySelector(".custom-options");
  
  select.addEventListener("click", (e) => {
    if (e.target.closest(".custom-option")) return;
    select.classList.toggle("open");
  });
  
  document.addEventListener("click", (e) => {
    if (!select.contains(e.target)) {
      select.classList.remove("open");
    }
  });
}

function populateCompanies() {
  const companySelect = document.getElementById("company-select");
  if (!companySelect) return;
  
  const trigger = companySelect.querySelector(".custom-select-trigger");
  const optionsContainer = companySelect.querySelector(".custom-options");
  
  optionsContainer.innerHTML = "";
  
  const categoryModels = state.categorizedModels[state.selectedCategory] || [];
  
  if (categoryModels.length === 0) {
    trigger.textContent = "No models available";
    return;
  }
  
  const companies = [...new Set(categoryModels.map(model => model.brand || "Unknown"))].sort();
  
  companies.forEach(company => {
    const option = document.createElement("div");
    option.className = "custom-option";
    option.textContent = company;
    option.dataset.company = company;
    optionsContainer.appendChild(option);
    
    option.addEventListener("click", () => {
      optionsContainer.querySelectorAll(".custom-option").forEach(opt => opt.classList.remove("selected"));
      option.classList.add("selected");
      trigger.textContent = company;
      state.selectedCompany = company;
      companySelect.classList.remove("open");
      populateModels();
    });
  });
  
  // Select first company by default
  if (companies.length > 0) {
    const firstOption = optionsContainer.querySelector(".custom-option");
    if (firstOption) {
      firstOption.classList.add("selected");
      trigger.textContent = companies[0];
      state.selectedCompany = companies[0];
      populateModels();
    }
  }
}

function populateModels() {
  const modelSelect = document.getElementById("model-select");
  if (!modelSelect) return;
  
  const trigger = modelSelect.querySelector(".custom-select-trigger");
  const optionsContainer = modelSelect.querySelector(".custom-options");
  
  optionsContainer.innerHTML = "";
  
  const categoryModels = state.categorizedModels[state.selectedCategory] || [];
  const companyModels = categoryModels.filter(model => (model.brand || "Unknown") === state.selectedCompany);
  
  if (companyModels.length === 0) {
    trigger.textContent = "No models for this company";
    return;
  }
  
  const sortedModels = [...companyModels].sort((a, b) => {
    const scoreA = parseInt(a.consumption) || 0;
    const scoreB = parseInt(b.consumption) || 0;
    if (scoreA !== scoreB) return scoreA - scoreB;
    const nameA = (a.name || "").toLowerCase();
    const nameB = (b.name || "").toLowerCase();
    return nameA.localeCompare(nameB);
  });
  
  sortedModels.forEach(model => {
    const option = document.createElement("div");
    option.className = "custom-option";
    const consumptionScore = model.consumption || 0;
    const percentage = Math.round((consumptionScore / 20) * 100);
    
    option.innerHTML = `
      <span class="custom-option-name">${model.name || model.model}</span>
      <span class="custom-option-right">
        <span class="custom-option-score">${percentage}%</span>
        <svg class="custom-option-icon" width="8" height="8" viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      </span>
    `;
    option.dataset.value = model.id || model.model;
    option.dataset.consumption = consumptionScore;
    option.dataset.description = model.description || "";
    optionsContainer.appendChild(option);
    
    option.addEventListener("click", () => {
      optionsContainer.querySelectorAll(".custom-option").forEach(opt => opt.classList.remove("selected"));
      option.classList.add("selected");
      trigger.textContent = model.name || model.model;
      state.selectedModel = model.id || model.model;
      modelSelect.classList.remove("open");
      updateConsumptionDisplay(consumptionScore);
    });
  });
  
  // Select first model by default
  if (sortedModels.length > 0) {
    const firstOption = optionsContainer.querySelector(".custom-option");
    if (firstOption) {
      firstOption.classList.add("selected");
      trigger.textContent = sortedModels[0].name || sortedModels[0].model;
      state.selectedModel = sortedModels[0].id || sortedModels[0].model;
      updateConsumptionDisplay(sortedModels[0].consumption || 0);
    }
  }
}

function updateConsumptionDisplay(consumptionScore) {
  const consumptionDisplay = document.getElementById("consumption-display");
  if (!consumptionDisplay) return;
  
  const barWidth = Math.min(100, (consumptionScore / 20) * 100);
  const barColor = consumptionScore <= 5 ? '#52d6a8' : consumptionScore <= 10 ? '#77b7ff' : consumptionScore <= 15 ? '#ffb347' : '#ff6b6b';
  
  consumptionDisplay.innerHTML = `
    <div class="consumption-bar-container">
      <div class="consumption-bar-fill" style="width: ${barWidth}%; background: ${barColor};"></div>
    </div>
  `;
}

function setupPromptBar() {
  const promptInput = document.getElementById("prompt-input");
  const submitButton = document.getElementById("prompt-submit");
  
  if (!promptInput || !submitButton) return;
  
  // Auto-resize textarea
  promptInput.addEventListener("input", () => {
    promptInput.style.height = "auto";
    promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + "px";
  });
  
  // Handle keyboard shortcuts
  promptInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      if (e.ctrlKey || e.metaKey) {
        // Ctrl+Enter or Cmd+Enter to submit
        e.preventDefault();
        submitPrompt();
      }
      // Regular Enter just goes to new line (default behavior)
    }
  });
  
  // Submit on button click
  submitButton.addEventListener("click", () => {
    submitPrompt();
  });
}

function submitPrompt() {
  const promptInput = document.getElementById("prompt-input");
  const prompt = promptInput.value.trim();
  
  if (!prompt) return;
  
  if (!state.selectedModel) {
    console.error("No model selected");
    return;
  }
  
  console.log("Selected model:", state.selectedModel);
  console.log("Selected category:", state.selectedCategory);
  
  // Hide selector bar
  const selectorBar = document.getElementById("selector-bar");
  if (selectorBar) {
    selectorBar.style.display = "none";
  }
  
  // Display user message
  displayUserMessage(prompt);
  
  // Clear input
  promptInput.value = "";
  promptInput.style.height = "auto";
  
  // Send to API
  sendToAPI(prompt);
}

function displayUserMessage(message) {
  const chatContainer = document.getElementById("chat-container");
  if (!chatContainer) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message user";
  messageDiv.innerHTML = `
    <div class="chat-bubble">${escapeHtml(message)}</div>
  `;
  chatContainer.appendChild(messageDiv);
  
  // Smooth scroll to bottom
  requestAnimationFrame(() => {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth"
    });
  });
}

function displayAIMessage(message) {
  const chatContainer = document.getElementById("chat-container");
  if (!chatContainer) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message ai";
  
  // Parse markdown using marked.js
  let parsedMessage = message;
  if (typeof marked !== 'undefined') {
    parsedMessage = marked.parse(message);
  }
  
  messageDiv.innerHTML = `
    <div class="chat-bubble markdown-content">${parsedMessage}</div>
  `;
  chatContainer.appendChild(messageDiv);
  
  // Smooth scroll to bottom
  requestAnimationFrame(() => {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth"
    });
  });
}

function displayLoading() {
  const chatContainer = document.getElementById("chat-container");
  if (!chatContainer) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = "chat-message ai loading";
  messageDiv.id = "loading-message";
  messageDiv.innerHTML = `
    <div class="chat-bubble">Thinking...</div>
  `;
  chatContainer.appendChild(messageDiv);
  
  // Smooth scroll to bottom
  requestAnimationFrame(() => {
    chatContainer.scrollTo({
      top: chatContainer.scrollHeight,
      behavior: "smooth"
    });
  });
}

function removeLoading() {
  const loadingMessage = document.getElementById("loading-message");
  if (loadingMessage) {
    loadingMessage.remove();
  }
}

async function sendToAPI(prompt) {
  displayLoading();
  
  try {
    const response = await authedFetch(`${AI_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        model: state.selectedModel,
        category: state.selectedCategory
      })
    });
    
    console.log("API response status:", response.status);
    const data = await response.json();
    console.log("API response data:", data);
    removeLoading();
    
    let content = null;
    
    // Try to extract content from nested response
    if (data.resp?.result?.response) {
      const responseStr = data.resp.result.response;
      // Check if response is a JSON string
      try {
        const parsedResponse = JSON.parse(responseStr);
        if (parsedResponse.choices && parsedResponse.choices[0]?.message?.content) {
          content = parsedResponse.choices[0].message.content;
        } else {
          content = responseStr;
        }
      } catch {
        // Not a JSON string, use as-is
        content = responseStr;
      }
    } else if (data.response) {
      content = data.response;
    } else if (data.error) {
      displayAIMessage(`Error: ${data.error}`);
      return;
    } else if (data.result || data.output || data.text || data.message) {
      content = data.result || data.output || data.text || data.message;
    }
    
    if (content) {
      displayAIMessage(content);
    } else {
      displayAIMessage("No response received. Data: " + JSON.stringify(data));
    }
  } catch (error) {
    removeLoading();
    console.error("API error:", error);
    displayAIMessage(`Error: ${error.message}`);
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
    } else if (response && response.response) {
      // Handle direct response format
      displayResponse(responseContainer, response.response);
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
    const modelSelect = document.querySelector(`#${category}-model-select`);

    if (promptInput && submitButton && modelSelect) {
      submitButton.addEventListener("click", () => {
        const prompt = promptInput.value;
        const model = modelSelect.dataset.selectedValue || "";
        handlePrompt(category, prompt, model);
      });

      // Allow Ctrl+Enter to submit
      promptInput.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.key === "Enter") {
          const prompt = promptInput.value;
          const model = modelSelect.dataset.selectedValue || "";
          handlePrompt(category, prompt, model);
        }
      });
    }
  });
}

/* ===================== INITIALIZATION ===================== */
async function init() {
  await loadModels();
  setupPromptBar();
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
