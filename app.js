// Same origin Netlify Functions
const promptInput = document.getElementById("prompt");
const sendBtn = document.getElementById("sendBtn");
const columns = document.getElementById("columns");
const charCount = document.getElementById("charCount");
const currentPromptText = document.getElementById("currentPromptText");
const modelsCount = document.getElementById("modelsCount");
const examplesContainer = document.getElementById("examples");

let models = [];

async function loadModels() {
  try {
    const res = await fetch("/.netlify/functions/models");
    if (!res.ok) throw new Error("Failed to load models");
    models = await res.json();
    modelsCount.textContent = `${models.length} model${models.length !== 1 ? "s" : ""}`;
    renderPanels();
  } catch (err) {
    console.error(err);
    columns.innerHTML = "<p>Failed to load models. Check console.</p>";
  }
}

function renderPanels(outputs = {}, statuses = {}) {
  columns.innerHTML = "";
  models.forEach((m) => {
    const panel = document.createElement("div");
    panel.className = "panel";

    const header = document.createElement("div");
    header.className = "panel-header";

    const title = document.createElement("div");
    title.className = "panel-title";
    title.textContent = m.label;

    const provider = document.createElement("div");
    provider.className = "panel-provider";
    provider.textContent = "HuggingFace";

    header.appendChild(title);
    header.appendChild(provider);

    const body = document.createElement("div");
    body.className = "panel-body";
    body.textContent = outputs[m.id] || "No response yet.";

    const footer = document.createElement("div");
    footer.className = "panel-footer";

    const statusWrap = document.createElement("div");
    statusWrap.className = "status";

    const spinner = document.createElement("div");
    spinner.className = "spinner";
    const statusText = document.createElement("span");

    if (statuses[m.id] === "loading") {
      statusWrap.appendChild(spinner);
      statusText.textContent = "Thinking…";
    } else if (statuses[m.id] === "done") {
      const dot = document.createElement("div");
      dot.className = "status-dot";
      statusWrap.appendChild(dot);
      statusText.textContent = "Ready";
    } else {
      statusText.textContent = "Idle";
    }

    statusWrap.appendChild(statusText);

    const footerRight = document.createElement("div");
    footerRight.textContent = m.modelName || "";

    footer.appendChild(statusWrap);
    footer.appendChild(footerRight);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    columns.appendChild(panel);
  });
}

function updateCharCount() {
  const len = (promptInput.value || "").length;
  charCount.textContent = `${len} character${len !== 1 ? "s" : ""}`;
}

async function sendPrompt() {
  const prompt = promptInput.value.trim();
  if (!prompt) return;

  sendBtn.disabled = true;
  sendBtn.textContent = "Running…";

  currentPromptText.textContent = prompt.length > 60 ? prompt.slice(0, 57) + "…" : prompt;

  // show loading status
  const loadingOutputs = {};
  const statuses = {};
  models.forEach((m) => {
    loadingOutputs[m.id] = "Thinking…";
    statuses[m.id] = "loading";
  });
  renderPanels(loadingOutputs, statuses);

  try {
    const res = await fetch("/.netlify/functions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Error");
      renderPanels();
      return;
    }

    const outputs = {};
    const doneStatuses = {};
    data.results.forEach((r) => {
      outputs[r.id] = r.output;
      doneStatuses[r.id] = "done";
    });

    renderPanels(outputs, doneStatuses);
  } catch (err) {
    console.error(err);
    alert("Request failed: " + err.message);
    renderPanels();
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Run ⏎";
  }
}

// Example chips

if (examplesContainer) {
  examplesContainer.addEventListener("click", (e) => {
    const chip = e.target.closest(".example-chip");
    if (!chip) return;
    const text = chip.textContent.trim();
    promptInput.value = text;
    updateCharCount();
    sendPrompt();
  });
}

// Events

sendBtn.addEventListener("click", sendPrompt);

promptInput.addEventListener("input", updateCharCount);

promptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendPrompt();
  }
});

updateCharCount();
loadModels();
