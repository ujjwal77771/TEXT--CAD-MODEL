/**
 * app.js — Main application logic for Text-to-CAD web platform.
 *
 * Handles prompt submission, API calls, result rendering, and 3D viewer.
 */

import { initViewer, loadSTL, resetView, disposeViewer } from "./viewer.js";

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------
const promptInput = document.getElementById("prompt-input");
const charCount = document.getElementById("char-count");
const generateBtn = document.getElementById("generate-btn");
const btnContent = generateBtn.querySelector(".btn-content");
const btnLoading = generateBtn.querySelector(".btn-loading");
const resultsSection = document.getElementById("results");
const errorPanel = document.getElementById("error-panel");
const errorMessage = document.getElementById("error-message");
const downloadButtons = document.getElementById("download-buttons");
const codeOutput = document.getElementById("code-output");
const viewerPlaceholder = document.getElementById("viewer-placeholder");
const statusBadge = document.getElementById("status-badge");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let isGenerating = false;

// ---------------------------------------------------------------------------
// Health check on load
// ---------------------------------------------------------------------------
async function checkHealth() {
    try {
        const res = await fetch("/api/health");
        const data = await res.json();
        if (data.status === "ok" && data.llm_configured) {
            statusBadge.classList.add("online");
            statusBadge.classList.remove("offline");
            statusBadge.querySelector(".status-text").textContent = `${data.llm_provider} ready`;
        } else {
            statusBadge.classList.add("offline");
            statusBadge.querySelector(".status-text").textContent = "No LLM key";
        }
    } catch {
        statusBadge.classList.add("offline");
        statusBadge.querySelector(".status-text").textContent = "Offline";
    }
}

checkHealth();

// ---------------------------------------------------------------------------
// Character counter
// ---------------------------------------------------------------------------
promptInput.addEventListener("input", () => {
    const len = promptInput.value.length;
    charCount.textContent = `${len} / 5000`;
    if (len > 5000) {
        charCount.style.color = "var(--accent-red)";
    } else {
        charCount.style.color = "";
    }
});

// ---------------------------------------------------------------------------
// Example chip handler
// ---------------------------------------------------------------------------
window.setExample = function (chip) {
    promptInput.value = chip.textContent;
    promptInput.dispatchEvent(new Event("input"));
    promptInput.focus();
};

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------
async function generate() {
    const prompt = promptInput.value.trim();
    if (!prompt || isGenerating) return;

    isGenerating = true;

    // UI: loading state
    btnContent.style.display = "none";
    btnLoading.style.display = "flex";
    generateBtn.disabled = true;
    errorPanel.style.display = "none";
    resultsSection.style.display = "none";

    try {
        const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.detail || `Server error: ${res.status}`);
        }

        const data = await res.json();

        if (data.status === "error") {
            showError(data.error || "Unknown error occurred.");
            return;
        }

        showResults(data);
    } catch (err) {
        showError(err.message || "Failed to connect to the server.");
    } finally {
        isGenerating = false;
        btnContent.style.display = "flex";
        btnLoading.style.display = "none";
        generateBtn.disabled = false;
    }
}

window.appGenerate = generate;

// Ctrl+Enter shortcut
promptInput.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        generate();
    }
});

// ---------------------------------------------------------------------------
// Show results
// ---------------------------------------------------------------------------
function showResults(data) {
    errorPanel.style.display = "none";
    resultsSection.style.display = "block";

    // --- Downloads ---
    downloadButtons.innerHTML = "";

    if (data.step_file) {
        downloadButtons.appendChild(createDownloadBtn("STEP", data.step_file, "Parametric CAD file"));
    }
    if (data.stl_file) {
        downloadButtons.appendChild(createDownloadBtn("STL", data.stl_file, "3D printing mesh"));
    }
    if (data.glb_file) {
        downloadButtons.appendChild(createDownloadBtn("GLB", data.glb_file, "3D viewer format"));
    }

    // --- Code ---
    if (data.code) {
        codeOutput.textContent = data.code;
    } else {
        codeOutput.textContent = "// No code generated";
    }

    // --- 3D Viewer ---
    if (data.stl_file) {
        viewerPlaceholder.style.display = "none";
        const canvas = document.getElementById("viewer-canvas");
        initViewer(canvas);
        loadSTL(data.stl_file);
    } else if (data.glb_file) {
        viewerPlaceholder.style.display = "none";
        const canvas = document.getElementById("viewer-canvas");
        initViewer(canvas);
        // For now we'll try loading as STL; GLB requires GLTFLoader
        viewerPlaceholder.style.display = "flex";
        viewerPlaceholder.querySelector("p").textContent = "GLB preview coming soon — download the file to view.";
    } else {
        viewerPlaceholder.style.display = "flex";
        viewerPlaceholder.querySelector("p").textContent = "No mesh available for preview.";
    }

    // Scroll into view
    resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function createDownloadBtn(ext, url, label) {
    const a = document.createElement("a");
    a.className = "download-btn";
    a.href = url;
    a.download = "";
    a.innerHTML = `
        <span class="file-ext">${ext}</span>
        <span class="file-label">${label}</span>
        <svg class="file-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
    `;
    return a;
}

// ---------------------------------------------------------------------------
// Show error
// ---------------------------------------------------------------------------
function showError(msg) {
    resultsSection.style.display = "none";
    errorPanel.style.display = "block";
    errorMessage.textContent = msg;
    errorPanel.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ---------------------------------------------------------------------------
// Reset view button
// ---------------------------------------------------------------------------
document.getElementById("reset-view-btn")?.addEventListener("click", resetView);
