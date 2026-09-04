export type SkillLevel = "junior" | "pleno" | "senior" | "especialista";

export type ExperienceRange = "0-1" | "1-3" | "3-5" | "5+";

export type WorkModality = "remoto" | "hibrido" | "presencial";

export type MatchType = "FULL" | "PARTIAL" | "NONE";

export type Recommendation = "APPLY" | "MAYBE" | "SKIP";

export interface UserSkill {
  name: string;
  level: SkillLevel;
  yearsOfExperience?: number;
  isImportant?: boolean;
}

export interface UserProfile {
  jobTitle: string;
  yearsOfExperience: ExperienceRange;
  skills: UserSkill[];
  location?: string;
  preferredModality?: WorkModality[];
  expectedSalary?: number;
  desiredRoles?: string[];
  importantTechnologies?: string[];
  technologiesWithout?: string[];
  minimumLevel?: SkillLevel;
}

export interface UserPreferences {
  weights: {
    requiredSkills: number;
    preferredSkills: number;
    experience: number;
    seniority: number;
  };
  maxHistoryItems: number;
}

export interface JobRequirement {
  name: string;
  type: "REQUIRED" | "PREFERRED";
  weight: number;
  detectedAliases?: string[];
}

export interface Job {
  title: string;
  company: string;
  url: string;
  location?: string;
  modality?: WorkModality;
  description: string;
  requirements: JobRequirement[];
  seniority?: SkillLevel;
  experienceRequired?: string;
}

export interface SkillMatch {
  skillName: string;
  jobRequirement: string;
  matchType: MatchType;
  userHasSkill: boolean;
  userSkillLevel?: SkillLevel;
  userYearsOfExperience?: number;
}

export interface ProfileGap {
  type: "skill" | "experience" | "seniority";
  current: string;
  required: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

export interface JobMatchResult {
  job: Job;
  score: number;
  classification: "excelente" | "alta" | "media" | "baixa" | "muito_baixa";
  classificationEmoji: string;
  recommendation: Recommendation;
  strongPoints: SkillMatch[];
  partialMatches: SkillMatch[];
  gaps: SkillMatch[];
  profileGaps: ProfileGap[];
  experienceMatch: "compatible" | "below" | "above" | "unknown";
  seniorityMatch: "compatible" | "below" | "above" | "unknown";
  explanation: {
    requiredSkillsScore: number;
    preferredSkillsScore: number;
    experienceScore: number;
    seniorityScore: number;
  };
}

export interface HistoryItem {
  id: string;
  title: string;
  company: string;
  url: string;
  score: number;
  date: string;
}

export interface DashboardStats {
  totalAnalyzed: number;
  averageScore: number;
  above80: number;
  above90: number;
}
