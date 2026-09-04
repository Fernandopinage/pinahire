import {
  UserProfile,
  UserPreferences,
  HistoryItem,
  DashboardStats,
} from "../types";

const STORAGE_KEYS = {
  PROFILE: "pinahire_profile",
  PREFERENCES: "pinahire_preferences",
  HISTORY: "pinahire_history",
} as const;

const DEFAULT_PREFERENCES: UserPreferences = {
  weights: {
    requiredSkills: 0.5,
    preferredSkills: 0.25,
    experience: 0.15,
    seniority: 0.1,
  },
  maxHistoryItems: 100,
};

export const storage = {
  async getProfile(): Promise<UserProfile | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PROFILE);
    return result[STORAGE_KEYS.PROFILE] || null;
  },

  async setProfile(profile: UserProfile): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.PROFILE]: profile });
  },

  async getPreferences(): Promise<UserPreferences> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PREFERENCES);
    return result[STORAGE_KEYS.PREFERENCES] || DEFAULT_PREFERENCES;
  },

  async setPreferences(prefs: UserPreferences): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.PREFERENCES]: prefs });
  },

  async getHistory(): Promise<HistoryItem[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    return result[STORAGE_KEYS.HISTORY] || [];
  },

  async addToHistory(item: HistoryItem): Promise<void> {
    const history = await this.getHistory();
    const prefs = await this.getPreferences();
    const newHistory = [item, ...history].slice(0, prefs.maxHistoryItems);
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: newHistory });
  },

  async clearHistory(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const history = await this.getHistory();
    const total = history.length;
    const avgScore =
      total > 0
        ? history.reduce((sum, item) => sum + item.score, 0) / total
        : 0;
    const above80 = history.filter((item) => item.score >= 80).length;
    const above90 = history.filter((item) => item.score >= 90).length;

    return {
      totalAnalyzed: total,
      averageScore: Math.round(avgScore),
      above80,
      above90,
    };
  },

  async exportProfile(): Promise<string> {
    const profile = await this.getProfile();
    const prefs = await this.getPreferences();
    return JSON.stringify({ profile, preferences: prefs }, null, 2);
  },

  async importProfile(data: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(data);
      if (parsed.profile) {
        await this.setProfile(parsed.profile);
      }
      if (parsed.preferences) {
        await this.setPreferences(parsed.preferences);
      }
      return true;
    } catch {
      return false;
    }
  },
};
