import { authedFetch } from "/lib/auth.js";

const AI_BASE = "/api/ai";

const state = {
  models: [],
  categorizedModels: {},
  currentSection: "ai",
  loading: false,
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
  const categories = ["ai", "search-web", "reasoning", "pictures"];
  
  categories.forEach(category => {
    const customSelect = document.querySelector(`#${category}-model-select`);
    if (!customSelect) return;
    
    const trigger = customSelect.querySelector(".custom-select-trigger");
    const optionsContainer = customSelect.querySelector(".custom-options");
    
    // Clear existing options
    optionsContainer.innerHTML = "";
    
    // Map frontend category name to backend category name
    const backendCategory = CATEGORY_ALIASES[category] || category;
    
    // Get models for this specific category
    const categoryModels = state.categorizedModels[backendCategory] || [];
    
    if (categoryModels.length === 0) {
      trigger.textContent = "No models available";
      return;
    }
    
    // Sort models by consumption score (lightest first)
    const sortedModels = [...categoryModels].sort((a, b) => {
      const scoreA = parseInt(a.consumption) || 0;
      const scoreB = parseInt(b.consumption) || 0;
      return scoreA - scoreB;
    });
    
    sortedModels.forEach(model => {
      const option = document.createElement("div");
      option.className = "custom-option";
      const consumptionScore = model.consumption || 0;
      option.innerHTML = `
        <span class="custom-option-name">${model.name || model.model}</span>
        <span class="custom-option-score">${consumptionScore}/20</span>
      `;
      option.dataset.value = model.id || model.model;
      option.dataset.consumption = consumptionScore;
      option.dataset.description = model.description || "";
      option.dataset.rawName = model.name || model.model;
      console.log("Setting option dataset for", model.name, "consumption:", consumptionScore, "description:", model.description);
      optionsContainer.appendChild(option);
      
      // Click handler
      option.addEventListener("click", () => {
        // Remove selected class from all options
        optionsContainer.querySelectorAll(".custom-option").forEach(opt => opt.classList.remove("selected"));
        // Add selected class to clicked option
        option.classList.add("selected");
        // Update trigger text
        trigger.textContent = model.name || model.model;
        // Store selected value
        customSelect.dataset.selectedValue = model.id || model.model;
        customSelect.dataset.selectedConsumption = consumptionScore;
        customSelect.dataset.selectedDescription = model.description || "";
        // Close dropdown
        customSelect.classList.remove("open");
        // Update consumption display
        updateConsumptionDisplay(customSelect);
      });
    });

    // Set first model as default
    if (sortedModels.length > 0) {
      const firstOption = optionsContainer.querySelector(".custom-option");
      if (firstOption) {
        firstOption.classList.add("selected");
        trigger.textContent = sortedModels[0].name || sortedModels[0].model;
        customSelect.dataset.selectedValue = sortedModels[0].id || sortedModels[0].model;
        customSelect.dataset.selectedConsumption = sortedModels[0].consumption || 0;
        customSelect.dataset.selectedDescription = sortedModels[0].description || "";
        // Force immediate update
        setTimeout(() => updateConsumptionDisplay(customSelect), 0);
      }
    }

    // Toggle dropdown on click
    customSelect.addEventListener("click", (e) => {
      if (e.target.closest(".custom-option")) return; // Don't toggle if clicking an option
      customSelect.classList.toggle("open");
    });
    
    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!customSelect.contains(e.target)) {
        customSelect.classList.remove("open");
      }
    });
  });
}

function updateConsumptionDisplay(customSelect) {
  const consumptionDisplay = customSelect.parentElement.querySelector("[data-consumption]");
  const consumptionScore = parseInt(customSelect.dataset.selectedConsumption) || 0;
  console.log("updateConsumptionDisplay - consumptionScore:", consumptionScore, "consumptionDisplay:", consumptionDisplay);
  
  if (consumptionDisplay) {
    // Create energy bar with simple white SVG icon
    const barWidth = Math.min(100, (consumptionScore / 20) * 100);
    const barColor = consumptionScore <= 5 ? '#52d6a8' : consumptionScore <= 10 ? '#77b7ff' : consumptionScore <= 15 ? '#ffb347' : '#ff6b6b';
    
    consumptionDisplay.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <div style="flex: 1; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
          <div style="width: ${barWidth}%; height: 100%; background: ${barColor}; border-radius: 3px; transition: width 300ms ease;"></div>
        </div>
      </div>
    `;
  } else {
    console.log("Missing consumptionDisplay");
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
  setupPromptHandlers();
}

// Start initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
