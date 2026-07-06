import { authedFetch } from "/lib/auth.js";

const AI_BASE = "/api/ai";

const state = {
  models: [],
  c===========a
}Apjson",
    body: JSON.stringify(body),
  });
  const text = await res.text();
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
  selelect.innerHTML = "";
    if (state.models.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No models available";
      select.appendChild(option);
      return;
    }
    
    stdas.fosEach(select => {  select.appendChild(option);
    });  select.value = state.models[0].model;
tmopse(m listener
    select.addEventListener("change", () => updateConsumptionDisplay(select));
  });
}

function updateConsumptionDisplay(select) {
  con
spo| "Each(selc => {showError("Please select a modelsukw
  const responseContainerate.stoad.m true;
tsem(m

    if (response && response.result) { else if (response && response.er showError(response.error, responseContainer);
    } else {
      showError("Unexpected response format", responseContainer);
    }
  } c
`pnnul)>lseAll"[da]"
 n models.folEach(selecct=>t{uutsu ect) { pkw
        const model = mod
    n(gory, ml);
    }
  });
}================== INITIALIZATIO function ini
  /e
k"Co`Cm}` [data]lumkwst.matmk"Co`Cm}` [data] [data]lumukno". = || ""categycategyk"Co`Cm}` [data] [data]lumuknw". = || ""categycategyk"Co`Cm}` [data] [data]lumukwn".=  || ""cagorycagory"unknown"dei=selcdOp.dsedescr||""dilayTexesri 
 ?`C${}•${}``Csmtism}umptoDipay.xCet = dText [data]