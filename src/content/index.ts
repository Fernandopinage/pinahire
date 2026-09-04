import { Job, JobMatchResult, UserProfile, SkillLevel } from "../types";

let widgetContainer: HTMLDivElement | null = null;
let isMinimized = false;
let isAnalyzing = false;
let lastUrl = "";

function isLinkedInJobPage(): boolean {
  return (
    window.location.hostname.includes("linkedin.com") &&
    (window.location.pathname.includes("/jobs/view/") ||
      window.location.pathname.includes("/jobs/search/") ||
      window.location.pathname.includes("/jobs/collection/"))
  );
}

function isLinkedInProfilePage(): boolean {
  return (
    window.location.hostname.includes("linkedin.com") &&
    window.location.pathname.includes("/in/")
  );
}

// ============ PERFIL LINKEDIN AUTO-IMPORT ============

async function scrapeLinkedInProfile(): Promise<Partial<UserProfile>> {
  const profile: Partial<UserProfile> = {
    skills: [],
    jobTitle: "",
    location: "",
    yearsOfExperience: "3-5",
    minimumLevel: "pleno",
  };

  try {
    // Título/Cargo
    const headlineEl = document.querySelector(
      ".text-body-medium.break-words, .profile-detail .text-body-medium"
    );
    if (headlineEl) {
      const headline = headlineEl.textContent?.trim() || "";
      profile.jobTitle = headline.split(" at ")[0] || headline;
    }

    // Localização
    const locationEl = document.querySelector(
      ".text-body-small.inline.t-black--light.break-words"
    );
    if (locationEl) {
      profile.location = locationEl.textContent?.trim() || "";
    }

    // Skills - múltiplos seletores para diferentes versões do LinkedIn
    const skillSelectors = [
      ".pv-skill-category-entity__name-text",
      ".skill-item .skill-name",
      "#skills span[aria-hidden='true']",
      ".pv-profile-section__card-heading ~ span",
      "[data-field='skill_card_skill_name']",
      ".artdeco-entity-lockup__title",
    ];

    for (const selector of skillSelectors) {
      document.querySelectorAll(selector).forEach((el) => {
        const skillName = el.textContent?.trim();
        if (
          skillName &&
          skillName.length > 1 &&
          skillName.length < 40 &&
          !profile.skills?.some((s) => s.name.toLowerCase() === skillName.toLowerCase())
        ) {
          profile.skills?.push({
            name: skillName,
            level: "pleno" as SkillLevel,
          });
        }
      });
    }

    // Experiência - calcular anos baseado nas posições
    const experienceSection = document.querySelector("#experience");
    if (experienceSection) {
      const expText = experienceSection.textContent || "";
      const yearMatches = expText.match(/\b(20\d{2})\b/g);
      if (yearMatches && yearMatches.length > 0) {
        const years = yearMatches.map(Number);
        const earliest = Math.min(...years);
        const diff = new Date().getFullYear() - earliest;
        if (diff >= 8) profile.yearsOfExperience = "5+";
        else if (diff >= 3) profile.yearsOfExperience = "3-5";
        else if (diff >= 1) profile.yearsOfExperience = "1-3";
        else profile.yearsOfExperience = "0-1";
      }
    }

    // Senioridade - detectar no cargo ou títulos
    const allText = document.body.textContent || "";
    const seniorityKeywords: Record<string, SkillLevel> = {
      "staff": "especialista",
      "principal": "especialista",
      "lead": "especialista",
      "tech lead": "especialista",
      "architect": "especialista",
      "senior": "senior",
      "sênior": "senior",
      "pleno": "pleno",
      "mid-level": "pleno",
      "junior": "junior",
      "júnior": "junior",
      "trainee": "junior",
      "intern": "junior",
    };

    for (const [keyword, level] of Object.entries(seniorityKeywords)) {
      if (allText.toLowerCase().includes(keyword)) {
        profile.minimumLevel = level;
        break;
      }
    }

    // About - extrair skills adicionais
    const aboutSection = document.querySelector("#about");
    if (aboutSection) {
      const aboutText = aboutSection.querySelector(
        ".inline-show-more-text, .pv-about__summary-text"
      )?.textContent;
      if (aboutText) {
        extractSkillsFromText(aboutText, profile);
      }
    }

    // Conteúdo principal - última tentativa
    const mainContent = document.querySelector(
      ".scaffold-layout__main, main"
    );
    if (mainContent) {
      const fullText = mainContent.textContent || "";
      extractSkillsFromText(fullText, profile);
    }

  } catch (err) {
    console.error("PinaHire: Erro ao scrape LinkedIn profile", err);
  }

  return profile;
}

function extractSkillsFromText(text: string, profile: Partial<UserProfile>): void {
  const techKeywords = [
    "JavaScript", "TypeScript", "React", "Vue", "Angular", "Node.js", "NestJS",
    "Express", "Python", "Django", "Flask", "Java", "Spring", "C#", ".NET",
    "PHP", "Laravel", "Ruby", "Rails", "Go", "Golang", "Rust", "Swift", "Kotlin",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes", "K8s",
    "AWS", "Azure", "GCP", "Google Cloud", "CI/CD", "Git", "GraphQL", "REST",
    "API", "Microservices", "Agile", "Scrum", "TDD", "DDD",
    "HTML", "CSS", "SASS", "Tailwind", "Bootstrap", "Material UI",
    "Figma", "Sketch", "Adobe XD",
    "React Native", "Flutter", "Ionic",
    "Next.js", "Nuxt.js", "Gatsby",
    "Elasticsearch", "Kafka", "RabbitMQ",
    "Linux", "Nginx", "Apache",
    "Jenkins", "Travis CI", "GitHub Actions", "GitLab CI",
    "Terraform", "Ansible", "Puppet", "Vagrant",
    "Prisma", "TypeORM", "Sequelize", "Mongoose",
    "Jest", "Mocha", "Cypress", "Playwright",
    "Webpack", "Vite", "Babel",
    "Storybook", "Chromatic",
    "Supabase", "Firebase",
    "Vercel", "Netlify", "Heroku",
    "Digital Ocean", "Cloudflare",
    "Stripe", "PayPal",
    "OAuth", "JWT",
    "WebSocket", "Socket.io",
    "OpenAPI", "Swagger",
    "RabbitMQ", "Redis",
    "ElasticSearch", "Solr",
    "Cassandra", "CouchDB",
    "Oracle", "SQL Server", "SQLite",
  ];

  const foundSkills = new Set(profile.skills?.map((s) => s.name.toLowerCase()) || []);

  techKeywords.forEach((tech) => {
    if (!foundSkills.has(tech.toLowerCase()) && text.includes(tech)) {
      profile.skills?.push({
        name: tech,
        level: "pleno" as SkillLevel,
      });
      foundSkills.add(tech.toLowerCase());
    }
  });
}

async function autoImportLinkedInProfile(): Promise<boolean> {
  const existingProfile = await chrome.runtime.sendMessage({ type: "GET_PROFILE" });
  if (existingProfile?.data && existingProfile.data.skills?.length > 0) {
    return false;
  }

  if (!isLinkedInProfilePage()) return false;

  const linkedinProfile = await scrapeLinkedInProfile();

  if (linkedinProfile.skills && linkedinProfile.skills.length > 0) {
    const fullProfile: UserProfile = {
      jobTitle: linkedinProfile.jobTitle || "Profissional",
      yearsOfExperience: linkedinProfile.yearsOfExperience || "3-5",
      skills: linkedinProfile.skills,
      location: linkedinProfile.location || "",
      preferredModality: ["remoto", "hibrido"],
      minimumLevel: linkedinProfile.minimumLevel || "pleno",
    };

    await chrome.runtime.sendMessage({
      type: "SAVE_PROFILE",
      payload: fullProfile,
    });

    return true;
  }

  return false;
}

// ============ WIDGET FLUTUANTE ============

function createWidget(): void {
  if (widgetContainer) {
    widgetContainer.remove();
  }

  widgetContainer = document.createElement("div");
  widgetContainer.id = "pinahire-widget";
  widgetContainer.innerHTML = getWidgetHTML();
  document.body.appendChild(widgetContainer);

  setupWidgetEvents();
}

function getWidgetHTML(): string {
  return `
    <style>
      #pinahire-widget {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transition: all 0.3s ease;
      }
      #pinahire-widget.minimized .pinahire-panel {
        display: none;
      }
      #pinahire-widget.minimized .pinahire-trigger {
        border-radius: 50%;
        padding: 14px;
      }
      .pinahire-trigger {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 16px;
        padding: 14px 20px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.5);
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
      }
      .pinahire-trigger:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(102, 126, 234, 0.7);
      }
      .pinahire-trigger.analyzing {
        opacity: 0.8;
        cursor: wait;
      }
      .pinahire-trigger .score-badge {
        background: rgba(255,255,255,0.25);
        padding: 3px 8px;
        border-radius: 6px;
        font-size: 13px;
      }
      .pinahire-panel {
        position: absolute;
        bottom: 60px;
        right: 0;
        width: 340px;
        max-height: 450px;
        background: #1a1a2e;
        border-radius: 16px;
        box-shadow: 0 12px 48px rgba(0,0,0,0.6);
        overflow: hidden;
        animation: slideUp 0.3s ease;
        border: 1px solid #27272a;
      }
      @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .pinahire-header {
        padding: 16px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .pinahire-header-title {
        color: white;
        font-weight: 600;
        font-size: 14px;
      }
      .pinahire-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pinahire-score-display {
        text-align: center;
        padding: 24px 16px;
        background: #16213e;
      }
      .pinahire-score-big {
        font-size: 52px;
        font-weight: 700;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .pinahire-score-sub {
        font-size: 13px;
        color: #a1a1aa;
        margin-top: 4px;
      }
      .pinahire-badge {
        display: inline-block;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        margin-top: 8px;
      }
      .pinahire-badge.excelente { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }
      .pinahire-badge.alta { background: rgba(59, 130, 246, 0.2); color: #93c5fd; }
      .pinahire-badge.media { background: rgba(245, 158, 11, 0.2); color: #fcd34d; }
      .pinahire-badge.baixa { background: rgba(249, 115, 22, 0.2); color: #fdba74; }
      .pinahire-badge.muito_baixa { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }
      .pinahire-body {
        padding: 12px;
        max-height: 250px;
        overflow-y: auto;
      }
      .pinahire-body::-webkit-scrollbar { width: 6px; }
      .pinahire-body::-webkit-scrollbar-track { background: #1a1a2e; }
      .pinahire-body::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
      .pinahire-section { margin-bottom: 10px; }
      .pinahire-section-title {
        font-size: 11px;
        font-weight: 600;
        color: #71717a;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .pinahire-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        margin-bottom: 4px;
        border-radius: 6px;
        font-size: 12px;
        background: #0f0f23;
      }
      .pinahire-item.match { border-left: 3px solid #10b981; }
      .pinahire-item.partial { border-left: 3px solid #f59e0b; }
      .pinahire-item.gap { border-left: 3px solid #ef4444; }
      .pinahire-alert {
        padding: 8px 10px;
        margin-bottom: 6px;
        border-radius: 6px;
        font-size: 11px;
      }
      .pinahire-alert.critical { background: rgba(239,68,68,0.15); color: #fca5a5; }
      .pinahire-alert.warning { background: rgba(245,158,11,0.15); color: #fcd34d; }
      .pinahire-footer {
        padding: 12px;
        border-top: 1px solid #27272a;
      }
      .pinahire-btn-action {
        width: 100%;
        padding: 10px;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      .pinahire-btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .pinahire-btn-secondary {
        background: #27272a;
        color: #e4e4e7;
      }
      .pinahire-rec {
        padding: 10px;
        text-align: center;
        font-weight: 600;
        font-size: 12px;
        border-radius: 8px;
        margin: 8px 0;
      }
      .pinahire-rec.APPLY { background: #10b981; color: white; }
      .pinahire-rec.MAYBE { background: #f59e0b; color: #1a1a2e; }
      .pinahire-rec.SKIP { background: #ef4444; color: white; }
      .pinahire-loading {
        text-align: center;
        padding: 30px;
      }
      .pinahire-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #27272a;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px;
      }
    </style>

    <button class="pinahire-trigger" id="pinahire-trigger">
      🎯 PinaHire
    </button>

    <div class="pinahire-panel" id="pinahire-panel" style="display: none;">
      <div class="pinahire-header">
        <span class="pinahire-header-title">🎯 PinaHire</span>
        <button class="pinahire-close" id="pinahire-close">×</button>
      </div>
      <div id="pinahire-content">
        <div class="pinahire-score-display">
          <div class="pinahire-score-sub">Clique para analisar esta vaga</div>
        </div>
      </div>
    </div>
  `;
}

function setupWidgetEvents(): void {
  const trigger = document.getElementById("pinahire-trigger");
  const panel = document.getElementById("pinahire-panel");
  const closeBtn = document.getElementById("pinahire-close");

  trigger?.addEventListener("click", () => {
    if (isMinimized) {
      isMinimized = false;
      widgetContainer?.classList.remove("minimized");
      if (panel) {
        panel.style.display = "block";
        if (!panel.dataset.loaded) {
          analyzeCurrentJob();
        }
      }
    } else {
      if (panel) {
        if (panel.style.display === "none") {
          panel.style.display = "block";
          if (!panel.dataset.loaded) {
            analyzeCurrentJob();
          }
        } else {
          panel.style.display = "none";
        }
      }
    }
  });

  closeBtn?.addEventListener("click", () => {
    isMinimized = true;
    widgetContainer?.classList.add("minimized");
  });

  makeDraggable();
}

function makeDraggable(): void {
  if (!widgetContainer) return;

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialX = 0;
  let initialY = 0;

  const trigger = document.getElementById("pinahire-trigger");
  if (!trigger) return;

  trigger.addEventListener("mousedown", (e) => {
    if ((e.target as HTMLElement).closest(".pinahire-trigger")) {
      isDragging = false;
      startX = e.clientX;
      startY = e.clientY;
      const rect = widgetContainer!.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      const onMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragging = true;
          widgetContainer!.style.right = "auto";
          widgetContainer!.style.bottom = "auto";
          widgetContainer!.style.left = `${initialX + dx}px`;
          widgetContainer!.style.top = `${initialY + dy}px`;
        }
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }
  });

  trigger.addEventListener("click", (e) => {
    if (isDragging) {
      e.stopPropagation();
      e.preventDefault();
      isDragging = false;
    }
  }, true);
}

// ============ EXTRAÇÃO DE VAGA ============

function extractLinkedInJob(): Partial<Job> {
  const titleEl = document.querySelector(
    ".job-details-jobs-unified-top-card__job-title, h1"
  );
  const companyEl = document.querySelector(
    ".job-details-jobs-unified-top-card__company-name"
  );
  const descriptionEl = document.querySelector(
    ".jobs-description__content, .description__text, .show-more-less-html__markup"
  );
  const locationEl = document.querySelector(
    ".job-details-jobs-unified-top-card__bullet"
  );

  return {
    title: titleEl?.textContent?.trim() || document.title.split(" | ")[0],
    company: companyEl?.textContent?.trim() || "",
    url: window.location.href,
    description: descriptionEl?.textContent?.trim() || "",
    location: locationEl?.textContent?.trim() || undefined,
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

// ============ ANÁLISE ============

async function analyzeCurrentJob(): Promise<void> {
  if (isAnalyzing) return;
  isAnalyzing = true;

  const trigger = document.getElementById("pinahire-trigger");
  const content = document.getElementById("pinahire-content");
  if (!content) return;

  if (trigger) {
    trigger.classList.add("analyzing");
    trigger.innerHTML = `<span class="pinahire-spinner" style="width:18px;height:18px;border-width:2px;"></span> Analisando...`;
  }

  content.innerHTML = `
    <div class="pinahire-loading">
      <div class="pinahire-spinner"></div>
      <div style="color:#a1a1aa;font-size:13px;">Analisando vaga...</div>
    </div>
  `;

  try {
    const jobData = extractJobFromPage();

    if (!jobData.description || jobData.description.length < 50) {
      content.innerHTML = getFallbackHTML();
      setupFallbackEvents();
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
      content.innerHTML = getResultHTML(response.data);
      content.dataset.loaded = "true";
    } else if (response?.error?.includes("Perfil não cadastrado")) {
      content.innerHTML = getNoProfileHTML();
      setupNoProfileEvents();
    } else {
      content.innerHTML = getFallbackHTML(response?.error);
      setupFallbackEvents();
    }
  } catch (err) {
    content.innerHTML = getFallbackHTML("Erro ao acessar a extensão");
    setupFallbackEvents();
  } finally {
    isAnalyzing = false;
    if (trigger) {
      trigger.classList.remove("analyzing");
      trigger.innerHTML = "🎯 PinaHire";
    }
  }
}

function getResultHTML(result: JobMatchResult): string {
  const gapsHtml = result.profileGaps
    ?.map(
      (gap) => `
      <div class="pinahire-alert ${gap.severity}">
        ${gap.severity === "critical" ? "🔴" : "🟡"} ${gap.message}
      </div>
    `
    )
    .join("");

  const strongHtml = result.strongPoints
    .slice(0, 6)
    .map((m) => `<div class="pinahire-item match">✅ ${m.jobRequirement}</div>`)
    .join("");

  const partialHtml = result.partialMatches
    .slice(0, 4)
    .map(
      (m) =>
        `<div class="pinahire-item partial">🟡 ${m.jobRequirement}</div>`
    )
    .join("");

  const gapsSkillsHtml = result.gaps
    .slice(0, 6)
    .map((m) => `<div class="pinahire-item gap">❌ ${m.jobRequirement}</div>`)
    .join("");

  return `
    <div class="pinahire-score-display">
      <div class="pinahire-score-big">${result.score}%</div>
      <div class="pinahire-score-sub">${result.job.title}</div>
      <div class="pinahire-score-sub" style="margin-top:2px;">${result.job.company}</div>
      <div class="pinahire-badge ${result.classification}">
        ${result.classificationEmoji} ${result.classification.charAt(0).toUpperCase() + result.classification.slice(1)}
      </div>
      <div class="pinahire-rec ${result.recommendation}">
        ${
          result.recommendation === "APPLY"
            ? "✅ RECOMENDADO - Candidatar-se"
            : result.recommendation === "MAYBE"
            ? "⚠️ AVALIAR - Requer atenção"
            : "❌ NÃO RECOMENDADO"
        }
      </div>
    </div>
    <div class="pinahire-body">
      ${
        gapsHtml
          ? `<div class="pinahire-section"><div class="pinahire-section-title">⚠️ Alertas</div>${gapsHtml}</div>`
          : ""
      }
      ${
        strongHtml
          ? `<div class="pinahire-section"><div class="pinahire-section-title">✅ Skills que você tem</div>${strongHtml}</div>`
          : ""
      }
      ${
        partialHtml
          ? `<div class="pinahire-section"><div class="pinahire-section-title">🟡 Parcial</div>${partialHtml}</div>`
          : ""
      }
      ${
        gapsSkillsHtml
          ? `<div class="pinahire-section"><div class="pinahire-section-title">❌ Skills que faltam</div>${gapsSkillsHtml}</div>`
          : ""
      }
    </div>
    <div class="pinahire-footer">
      <button class="pinahire-btn-action pinahire-btn-secondary" id="pinahire-reanalyze">
        🔄 Analisar novamente
      </button>
    </div>
  `;
}

function getNoProfileHTML(): string {
  return `
    <div class="pinahire-score-display">
      <div style="font-size:40px;margin-bottom:8px;">👤</div>
      <div class="pinahire-score-sub">Perfil não cadastrado</div>
    </div>
    <div class="pinahire-body">
      <div style="padding:12px;text-align:center;">
        <p style="color:#a1a1aa;font-size:12px;margin-bottom:12px;">
          Acesse seu perfil no LinkedIn para importar automaticamente, ou cadastre manualmente.
        </p>
        <button class="pinahire-btn-action pinahire-btn-primary" id="pinahire-import-profile">
          📥 Importar do LinkedIn
        </button>
      </div>
    </div>
  `;
}

function getFallbackHTML(error?: string): string {
  return `
    <div class="pinahire-score-display">
      <div style="font-size:40px;margin-bottom:8px;">📋</div>
      <div class="pinahire-score-sub">Cole a descrição da vaga</div>
    </div>
    <div class="pinahire-body">
      ${
        error
          ? `<div class="pinahire-alert warning" style="margin-bottom:8px;">⚠️ ${error}</div>`
          : ""
      }
      <textarea id="pinahire-manual-input" style="
        width:100%;
        min-height:80px;
        padding:10px;
        background:#0f0f23;
        border:1px solid #27272a;
        border-radius:8px;
        color:#e4e4e7;
        font-size:12px;
        resize:vertical;
      " placeholder="Cole a descrição da vaga aqui..."></textarea>
    </div>
    <div class="pinahire-footer">
      <button class="pinahire-btn-action pinahire-btn-primary" id="pinahire-analyze-manual">
        🎯 Analisar
      </button>
    </div>
  `;
}

function setupNoProfileEvents(): void {
  document.getElementById("pinahire-import-profile")?.addEventListener("click", async () => {
    const content = document.getElementById("pinahire-content");
    if (content) {
      content.innerHTML = `
        <div class="pinahire-loading">
          <div class="pinahire-spinner"></div>
          <div style="color:#a1a1aa;font-size:13px;">Importando perfil...</div>
        </div>
      `;
    }

    const success = await chrome.runtime.sendMessage({ type: "IMPORT_LINKEDIN_PROFILE" });
    if (success?.data) {
      analyzeCurrentJob();
    } else {
      window.open("src/options/index.html", "_blank");
    }
  });
}

function setupFallbackEvents(): void {
  document.getElementById("pinahire-reanalyze")?.addEventListener("click", () => {
    const content = document.getElementById("pinahire-content");
    if (content) content.dataset.loaded = "";
    analyzeCurrentJob();
  });

  document.getElementById("pinahire-analyze-manual")?.addEventListener("click", async () => {
    const textarea = document.getElementById("pinahire-manual-input") as HTMLTextAreaElement;
    const text = textarea?.value;
    if (!text || text.length < 20) return;

    const content = document.getElementById("pinahire-content");
    if (content) {
      content.innerHTML = `
        <div class="pinahire-loading">
          <div class="pinahire-spinner"></div>
          <div style="color:#a1a1aa;font-size:13px;">Analisando...</div>
        </div>
      `;
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

      if (response?.success && content) {
        content.innerHTML = getResultHTML(response.data);
        content.dataset.loaded = "true";
      }
    } catch (err) {
      console.error("Erro ao analisar", err);
    }
  });
}

// ============ OBSERVAR NAVEGAÇÃO ============

function observeNavigation(): void {
  lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(() => {
        const content = document.getElementById("pinahire-content");
        if (content) content.dataset.loaded = "";

        if (isLinkedInJobPage()) {
          if (widgetContainer) {
            widgetContainer.style.display = "block";
            analyzeCurrentJob();
          } else {
            createWidget();
            setTimeout(analyzeCurrentJob, 500);
          }
        }
      }, 800);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// ============ INICIALIZAÇÃO ============

async function init(): Promise<void> {
  await autoImportLinkedInProfile();

  if (isLinkedInJobPage()) {
    createWidget();
    setTimeout(analyzeCurrentJob, 1000);
  } else {
    createWidget();
  }

  observeNavigation();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_JOB_DATA") {
    sendResponse(extractJobFromPage());
    return true;
  }
  if (message.type === "ANALYZE_CURRENT_JOB") {
    analyzeCurrentJob();
    sendResponse({ success: true });
    return true;
  }
  return false;
});

init();
