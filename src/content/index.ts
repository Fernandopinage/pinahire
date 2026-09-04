import { Job } from "../types";
import { parseJobDescription } from "../parser";

function extractLinkedInJob(): Partial<Job> {
  const titleEl = document.querySelector(
    ".job-details-jobs-unified-top-card__job-title"
  );
  const companyEl = document.querySelector(
    ".job-details-jobs-unified-top-card__company-name"
  );
  const descriptionEl = document.querySelector(
    ".jobs-description__content"
  );
  const locationEl = document.querySelector(
    ".job-details-jobs-unified-top-card__bullet"
  );

  const title = titleEl?.textContent?.trim() || document.title;
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

function extractGenericJob(): Partial<Job> {
  const bodyText = document.body.innerText;
  const lines = bodyText.split("\n").filter((l) => l.trim().length > 0);

  return {
    title: document.title,
    url: window.location.href,
    description: lines.slice(0, 100).join("\n"),
  };
}

function extractJobFromPage(): Partial<Job> {
  if (window.location.hostname.includes("linkedin.com")) {
    return extractLinkedInJob();
  }
  return extractGenericJob();
}

function injectAnalysisButton(): void {
  if (document.getElementById("pinahire-analyze-btn")) return;

  const button = document.createElement("button");
  button.id = "pinahire-analyze-btn";
  button.textContent = "🎯 Analisar com PinaHire";
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 14px 24px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    transition: all 0.3s ease;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  button.addEventListener("mouseenter", () => {
    button.style.transform = "translateY(-2px)";
    button.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.6)";
  });

  button.addEventListener("mouseleave", () => {
    button.style.transform = "translateY(0)";
    button.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
  });

  button.addEventListener("click", async () => {
    const jobData = extractJobFromPage();
    const job = parseJobDescription(
      jobData.description || "",
      jobData.title,
      jobData.company,
      jobData.url
    );

    chrome.runtime.sendMessage({
      type: "ANALYZE_JOB",
      payload: job,
    });
  });

  document.body.appendChild(button);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_JOB_DATA") {
    const jobData = extractJobFromPage();
    sendResponse(jobData);
    return true;
  }

  if (message.type === "INJECT_BUTTON") {
    injectAnalysisButton();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

if (window.location.hostname.includes("linkedin.com")) {
  injectAnalysisButton();
}
