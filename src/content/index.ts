import { Job, JobMatchResult } from "../types";

let currentWidget: HTMLElement | null = null;
let isAnalyzing = false;

function isLinkedInJobPage(): boolean {
  return (
    window.location.hostname.includes("linkedin.com") &&
    (window.location.pathname.includes("/jobs/view/") ||
      window.location.pathname.includes("/jobs/search/") ||
      window.location.pathname.includes("/jobs/collection/"))
  );
}

function extractLinkedInJob(): Partial<Job> {
  const titleEl = document.querySelector(
    ".job-details-jobs-unified-top-card__job-title, .job-title-text, h1"
  );
  const companyEl = document.querySelector(
    ".job-details-jobs-unified-top-card__company-name, .company-name"
  );
  const descriptionEl = document.querySelector(
    ".jobs-description__content, .description__text, .show-more-less-html__markup"
  );
  const locationEl = document.querySelector(
    ".job-details-jobs-unified-top-card__bullet, .job-location"
  );

  const title = titleEl?.textContent?.trim() || document.title.split(" | ")[0];
  const company = companyEl?.textContent?.trim() || "";
  const description = descriptionEl?.textContent?.trim() || "";
  const location = locationEl?.textContent?.trim() || undefined;

  return {
    title,
    company,
    url: window.location.href,
    description,
    location,
  };
}

function extractJobFromPage(): Partial<Job> {
  if (isLinkedInJobPage()) {
    return extractLinkedInJob();
  }

  const bodyText = document.body.innerText;
  const lines = bodyText.split("\n").filter((l) => l.trim().length > 0);

  return {
    title: document.title,
    url: window.location.href,
    description: lines.slice(0, 150).join("\n"),
  };
}

function createFloatingWidget(score?: number): void {
  removeWidget();

  const widget = document.createElement("div");
  widget.id = "pinahire-widget";
  widget.innerHTML = `
    <style>
      #pinahire-widget {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .pinahire-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 16px;
        padding: 16px 24px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .pinahire-btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 12px 40px rgba(102, 126, 234, 0.6);
      }
      .pinahire-btn.analyzing {
        opacity: 0.8;
        cursor: wait;
      }
      .pinahire-score {
        background: rgba(255,255,255,0.2);
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 14px;
      }
      .pinahire-result {
        position: absolute;
        bottom: 70px;
        right: 0;
        width: 320px;
        background: #1a1a2e;
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.5);
        overflow: hidden;
        animation: slideUp 0.3s ease;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .pinahire-result-header {
        padding: 20px;
        text-align: center;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      .pinahire-result-score {
        font-size: 48px;
        font-weight: 700;
        color: white;
      }
      .pinahire-result-label {
        font-size: 14px;
        color: rgba(255,255,255,0.8);
        margin-top: 4px;
      }
      .pinahire-result-body {
        padding: 16px;
        max-height: 300px;
        overflow-y: auto;
      }
      .pinahire-section {
        margin-bottom: 12px;
      }
      .pinahire-section-title {
        font-size: 12px;
        font-weight: 600;
        color: #a1a1aa;
        text-transform: uppercase;
        margin-bottom: 8px;
      }
      .pinahire-skill {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        margin-bottom: 4px;
        border-radius: 6px;
        font-size: 13px;
        background: #16213e;
      }
      .pinahire-skill.match { border-left: 3px solid #10b981; }
      .pinahire-skill.partial { border-left: 3px solid #f59e0b; }
      .pinahire-skill.gap { border-left: 3px solid #ef4444; }
      .pinahire-gap-alert {
        padding: 10px 12px;
        margin-bottom: 6px;
        border-radius: 8px;
        font-size: 12px;
      }
      .pinahire-gap-alert.critical {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fca5a5;
      }
      .pinahire-gap-alert.warning {
        background: rgba(245, 158, 11, 0.15);
        border: 1px solid rgba(245, 158, 11, 0.3);
        color: #fcd34d;
      }
      .pinahire-recommendation {
        padding: 12px;
        text-align: center;
        font-weight: 600;
        border-radius: 8px;
        margin-top: 8px;
      }
      .pinahire-recommendation.APPLY { background: #10b981; color: white; }
      .pinahire-recommendation.MAYBE { background: #f59e0b; color: #1a1a2e; }
      .pinahire-recommendation.SKIP { background: #ef4444; color: white; }
    </style>
    <button class="pinahire-btn" id="pinahire-main-btn">
      🎯 PinaHire
      ${score !== undefined ? `<span class="pinahire-score">${score}%</span>` : ""}
    </button>
  `;

  document.body.appendChild(widget);
  currentWidget = widget;

  document.getElementById("pinahire-main-btn")?.addEventListener("click", () => {
    const resultDiv = document.querySelector(".pinahire-result");
    if (resultDiv) {
      resultDiv.remove();
    } else {
      analyzeCurrentJob();
    }
  });
}

function removeWidget(): void {
  if (currentWidget) {
    currentWidget.remove();
    currentWidget = null;
  }
}

function showLoadingWidget(): void {
  createFloatingWidget();
  const btn = document.getElementById("pinahire-main-btn");
  if (btn) {
    btn.classList.add("analyzing");
    btn.innerHTML = `
      <span class="spinner" style="width:20px;height:20px;border:2px solid rgba(255,255,255,0.3);border-top-color:white;border-radius:50%;animation:spin 1s linear infinite;"></span>
      Analisando...
    `;
  }
}

function showResultWidget(result: JobMatchResult): void {
  const gapsHtml = result.profileGaps
    ?.map(
      (gap) => `
    <div class="pinahire-gap-alert ${gap.severity}">
      ${gap.severity === "critical" ? "🔴" : "🟡"} ${gap.message}
    </div>
  `
    )
    .join("");

  const strongPointsHtml = result.strongPoints
    .map(
      (m) => `
    <div class="pinahire-skill match">✅ ${m.jobRequirement}</div>
  `
    )
    .join("");

  const partialHtml = result.partialMatches
    .map(
      (m) => `
    <div class="pinahire-skill partial">🟡 ${m.jobRequirement} (você tem: ${m.skillName})</div>
  `
    )
    .join("");

  const gapsSkillsHtml = result.gaps
    .map(
      (m) => `
    <div class="pinahire-skill gap">❌ ${m.jobRequirement}</div>
  `
    )
    .join("");

  createFloatingWidget(result.score);

  const btn = document.getElementById("pinahire-main-btn");
  if (btn) {
    btn.classList.remove("analyzing");
  }

  const widget = document.getElementById("pinahire-widget");
  if (widget) {
    const resultDiv = document.createElement("div");
    resultDiv.className = "pinahire-result";
    resultDiv.innerHTML = `
      <div class="pinahire-result-header">
        <div class="pinahire-result-score">${result.score}%</div>
        <div class="pinahire-result-label">
          ${result.classificationEmoji} ${result.classification.charAt(0).toUpperCase() + result.classification.slice(1)}
        </div>
      </div>
      <div class="pinahire-result-body">
        ${
          gapsHtml
            ? `<div class="pinahire-section"><div class="pinahire-section-title">⚠️ Alertas do Perfil</div>${gapsHtml}</div>`
            : ""
        }
        ${
          strongPointsHtml
            ? `<div class="pinahire-section"><div class="pinahire-section-title">✅ Pontos Fortes</div>${strongPointsHtml}</div>`
            : ""
        }
        ${
          partialHtml
            ? `<div class="pinahire-section"><div class="pinahire-section-title">🟡 Matches Parciais</div>${partialHtml}</div>`
            : ""
        }
        ${
          gapsSkillsHtml
            ? `<div class="pinahire-section"><div class="pinahire-section-title">❌ Skills que Faltam</div>${gapsSkillsHtml}</div>`
            : ""
        }
        <div class="pinahire-recommendation ${result.recommendation}">
          ${
            result.recommendation === "APPLY"
              ? "✅ RECOMENDADO - Candidatar-se"
              : result.recommendation === "MAYBE"
              ? "⚠️ AVALIAR - Requer atenção"
              : "❌ NÃO RECOMENDADO"
          }
        </div>
      </div>
    `;
    widget.appendChild(resultDiv);
  }
}

async function analyzeCurrentJob(): Promise<void> {
  if (isAnalyzing) return;
  isAnalyzing = true;

  showLoadingWidget();

  try {
    const jobData = extractJobFromPage();

    if (!jobData.description || jobData.description.length < 50) {
      showFallbackWidget();
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: "ANALYZE_TEXT",
      payload: {
        text: jobData.description,
        title: jobData.title,
        company: jobData.company,
        url: jobData.url,
      },
    });

    if (response?.success) {
      showResultWidget(response.data);
    } else {
      showFallbackWidget(response?.error);
    }
  } catch (err) {
    showFallbackWidget("Erro ao acessar a extensão");
  } finally {
    isAnalyzing = false;
  }
}

function showFallbackWidget(error?: string): void {
  createFloatingWidget();

  const btn = document.getElementById("pinahire-main-btn");
  if (btn) {
    btn.classList.remove("analyzing");
  }

  const widget = document.getElementById("pinahire-widget");
  if (widget) {
    const resultDiv = document.createElement("div");
    resultDiv.className = "pinahire-result";
    resultDiv.innerHTML = `
      <div class="pinahire-result-header">
        <div class="pinahire-result-label" style="font-size:16px;color:white;">
          📋 Colar Descrição da Vaga
        </div>
      </div>
      <div class="pinahire-result-body">
        ${
          error
            ? `<div class="pinahire-gap-alert warning" style="margin-bottom:12px;">⚠️ ${error}</div>`
            : ""
        }
        <p style="font-size:13px;color:#a1a1aa;margin-bottom:12px;">
          Não foi possível extrair automaticamente. Cole a descrição abaixo:
        </p>
        <textarea id="pinahire-manual-input" style="
          width:100%;
          min-height:100px;
          padding:10px;
          background:#0f0f23;
          border:1px solid #27272a;
          border-radius:8px;
          color:#e4e4e7;
          font-size:13px;
          resize:vertical;
          margin-bottom:8px;
        " placeholder="Cole a descrição da vaga aqui..."></textarea>
        <button id="pinahire-analyze-manual" style="
          width:100%;
          padding:10px;
          background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color:white;
          border:none;
          border-radius:8px;
          font-size:14px;
          font-weight:600;
          cursor:pointer;
        ">🎯 Analisar</button>
      </div>
    `;
    widget.appendChild(resultDiv);

    document
      .getElementById("pinahire-analyze-manual")
      ?.addEventListener("click", async () => {
        const textarea = document.getElementById(
          "pinahire-manual-input"
        ) as HTMLTextAreaElement;
        const text = textarea?.value;
        if (!text || text.length < 20) return;

        const manualBtn = document.getElementById("pinahire-analyze-manual");
        if (manualBtn) {
          manualBtn.textContent = "Analisando...";
          (manualBtn as HTMLButtonElement).disabled = true;
        }

        try {
          const jobData = extractJobFromPage();
          const response = await chrome.runtime.sendMessage({
            type: "ANALYZE_TEXT",
            payload: {
              text,
              title: jobData.title,
              company: jobData.company,
              url: jobData.url,
            },
          });

          if (response?.success) {
            resultDiv.remove();
            showResultWidget(response.data);
          }
        } catch (err) {
          if (manualBtn) {
            manualBtn.textContent = "Erro. Tente novamente.";
            (manualBtn as HTMLButtonElement).disabled = false;
          }
        }
      });
  }
}

function observeJobNavigation(): void {
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(() => {
        if (isLinkedInJobPage()) {
          createFloatingWidget();
        } else {
          removeWidget();
        }
      }, 500);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  if (isLinkedInJobPage()) {
    createFloatingWidget();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_JOB_DATA") {
    const jobData = extractJobFromPage();
    sendResponse(jobData);
    return true;
  }

  if (message.type === "ANALYZE_CURRENT_JOB") {
    analyzeCurrentJob();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

observeJobNavigation();
