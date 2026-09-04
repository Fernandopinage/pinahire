import { Job, UserProfile, UserPreferences, JobMatchResult, ProfileScore } from "../types";
import { parseJobDescription } from "../parser";
import { analyzeJob } from "../analyzer";
import { calculateProfileScore } from "../analyzer/profile-score";
import { storage } from "../storage";

interface Message {
  type: string;
  payload?: unknown;
}

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === "ANALYZE_JOB") {
      handleAnalyzeJob(message.payload as Job)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.type === "ANALYZE_TEXT") {
      const { text, title, company, url } = message.payload as {
        text: string;
        title?: string;
        company?: string;
        url?: string;
      };
      handleAnalyzeText(text, title, company, url)
        .then((result) => sendResponse({ success: true, data: result }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.type === "GET_PROFILE") {
      storage.getProfile().then((profile) => sendResponse({ data: profile }));
      return true;
    }

    if (message.type === "SAVE_PROFILE") {
      storage
        .setProfile(message.payload as UserProfile)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.type === "GET_HISTORY") {
      storage.getHistory().then((history) => sendResponse({ data: history }));
      return true;
    }

    if (message.type === "GET_PREFERENCES") {
      storage
        .getPreferences()
        .then((prefs) => sendResponse({ data: prefs }));
      return true;
    }

    if (message.type === "SAVE_PREFERENCES") {
      storage
        .setPreferences(message.payload as UserPreferences)
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.type === "GET_DASHBOARD_STATS") {
      storage
        .getDashboardStats()
        .then((stats) => sendResponse({ data: stats }));
      return true;
    }

    if (message.type === "CLEAR_HISTORY") {
      storage
        .clearHistory()
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.type === "EXPORT_PROFILE") {
      storage
        .exportProfile()
        .then((data) => sendResponse({ data }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.type === "IMPORT_PROFILE") {
      storage
        .importProfile(message.payload as string)
        .then((success) => sendResponse({ success }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    if (message.type === "GET_PROFILE_SCORE") {
      handleGetProfileScore()
        .then((score) => sendResponse({ success: true, data: score }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    }

    return false;
  }
);

async function handleAnalyzeJob(job: Job): Promise<JobMatchResult> {
  const profile = await storage.getProfile();
  if (!profile) {
    throw new Error("Perfil não cadastrado. Cadastre suas skills nas configurações.");
  }

  const preferences = await storage.getPreferences();
  const result = analyzeJob(job, profile, preferences);

  await storage.addToHistory({
    id: Date.now().toString(),
    title: job.title,
    company: job.company,
    url: job.url,
    score: result.score,
    date: new Date().toISOString(),
  });

  return result;
}

async function handleAnalyzeText(
  text: string,
  title?: string,
  company?: string,
  url?: string
): Promise<JobMatchResult> {
  const job = parseJobDescription(text, title, company, url);
  return handleAnalyzeJob(job);
}

async function handleGetProfileScore(): Promise<ProfileScore> {
  const profile = await storage.getProfile();
  if (!profile) {
    throw new Error("Perfil não cadastrado.");
  }
  return calculateProfileScore(profile);
}
