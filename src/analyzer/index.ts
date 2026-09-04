import {
  Job,
  UserProfile,
  JobMatchResult,
  SkillMatch,
  Recommendation,
  UserPreferences,
} from "../types";
import { normalizeSkillName } from "../rules/skills-aliases";

interface ProfileGap {
  type: "skill" | "experience" | "seniority";
  current: string;
  required: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

export function analyzeJob(
  job: Job,
  profile: UserProfile,
  preferences: UserPreferences
): JobMatchResult {
  const skillMatches = matchSkills(job, profile);
  const profileGaps = identifyProfileGaps(job, profile);

  const strongPoints = skillMatches.filter((m) => m.matchType === "FULL");
  const partialMatches = skillMatches.filter((m) => m.matchType === "PARTIAL");
  const gaps = skillMatches.filter((m) => m.matchType === "NONE");

  const requiredSkills = job.requirements.filter((r) => r.type === "REQUIRED");
  const preferredSkills = job.requirements.filter((r) => r.type === "PREFERRED");

  const requiredMatches = skillMatches.filter(
    (m) => m.jobRequirement && requiredSkills.some((r) => r.name === m.jobRequirement)
  );
  const preferredMatches = skillMatches.filter(
    (m) => m.jobRequirement && preferredSkills.some((r) => r.name === m.jobRequirement)
  );

  const requiredScore = calculateCategoryScore(requiredMatches, requiredSkills.length);
  const preferredScore = calculateCategoryScore(preferredMatches, preferredSkills.length);
  const experienceScore = calculateExperienceScore(job, profile);
  const seniorityScore = calculateSeniorityScore(job, profile);

  const score = Math.round(
    requiredScore * preferences.weights.requiredSkills +
      preferredScore * preferences.weights.preferredSkills +
      experienceScore * preferences.weights.experience +
      seniorityScore * preferences.weights.seniority
  );

  const classification = getClassification(score);
  const recommendation = getRecommendation(score, gaps.length, profileGaps);

  const experienceMatch = getExperienceMatch(job, profile);
  const seniorityMatch = getSeniorityMatch(job, profile);

  return {
    job,
    score: Math.min(100, Math.max(0, score)),
    classification: classification.label,
    classificationEmoji: classification.emoji,
    recommendation,
    strongPoints,
    partialMatches,
    gaps,
    profileGaps,
    experienceMatch,
    seniorityMatch,
    explanation: {
      requiredSkillsScore: requiredScore,
      preferredSkillsScore: preferredScore,
      experienceScore,
      seniorityScore,
    },
  };
}

function identifyProfileGaps(job: Job, profile: UserProfile): ProfileGap[] {
  const gaps: ProfileGap[] = [];

  const experienceGap = analyzeExperienceGap(job, profile);
  if (experienceGap) gaps.push(experienceGap);

  const seniorityGap = analyzeSeniorityGap(job, profile);
  if (seniorityGap) gaps.push(seniorityGap);

  const skillGaps = analyzeSkillGaps(job, profile);
  gaps.push(...skillGaps);

  return gaps;
}

function analyzeExperienceGap(job: Job, profile: UserProfile): ProfileGap | null {
  if (!job.experienceRequired) return null;

  const requiredYears = parseExperienceYears(job.experienceRequired);
  if (requiredYears === null) return null;

  const profileYears = getProfileYears(profile);
  if (profileYears === null) return null;

  if (profileYears < requiredYears) {
    const diff = requiredYears - profileYears;
    let severity: "critical" | "warning" | "info" = "warning";
    if (diff > 3) severity = "critical";
    if (diff <= 1) severity = "info";

    return {
      type: "experience",
      current: `${profileYears} anos`,
      required: `${requiredYears} anos`,
      severity,
      message: `Sua experiência (${profileYears} anos) está abaixo do solicitado (${requiredYears} anos). Faltam ${diff} ano(s).`,
    };
  }
  return null;
}

function analyzeSeniorityGap(job: Job, profile: UserProfile): ProfileGap | null {
  if (!job.seniority) return null;

  const levelOrder = ["junior", "pleno", "senior", "especialista"];
  const jobLevelIndex = levelOrder.indexOf(job.seniority);
  const profileLevelIndex = levelOrder.indexOf(profile.minimumLevel || "pleno");

  if (jobLevelIndex > profileLevelIndex) {
    const levelNames: Record<string, string> = {
      junior: "Júnior",
      pleno: "Pleno",
      senior: "Sênior",
      especialista: "Especialista",
    };

    const diff = jobLevelIndex - profileLevelIndex;
    let severity: "critical" | "warning" | "info" = "warning";
    if (diff > 1) severity = "critical";
    if (diff === 1) severity = "warning";

    return {
      type: "seniority",
      current: levelNames[profile.minimumLevel || "pleno"],
      required: levelNames[job.seniority],
      severity,
      message: `A vaga pede nível ${levelNames[job.seniority]}, mas seu perfil é ${levelNames[profile.minimumLevel || "pleno"]}.`,
    };
  }
  return null;
}

function analyzeSkillGaps(job: Job, profile: UserProfile): ProfileGap[] {
  const gaps: ProfileGap[] = [];
  const profileSkillNames = profile.skills.map((s) => normalizeSkillName(s.name));

  const requiredSkills = job.requirements.filter((r) => r.type === "REQUIRED");

  for (const req of requiredSkills) {
    const normalizedReq = normalizeSkillName(req.name);
    if (!profileSkillNames.includes(normalizedReq)) {
      gaps.push({
        type: "skill",
        current: "Não possui",
        required: req.name,
        severity: "critical",
        message: `Você não possui a skill obrigatória: ${req.name}`,
      });
    }
  }

  return gaps;
}

function matchSkills(job: Job, profile: UserProfile): SkillMatch[] {
  const matches: SkillMatch[] = [];
  const profileSkillNames = profile.skills.map((s) =>
    normalizeSkillName(s.name)
  );

  for (const req of job.requirements) {
    const normalizedReq = normalizeSkillName(req.name);
    const userSkillIndex = profileSkillNames.indexOf(normalizedReq);

    if (userSkillIndex !== -1) {
      const userSkill = profile.skills[userSkillIndex];
      matches.push({
        skillName: userSkill.name,
        jobRequirement: req.name,
        matchType: "FULL",
        userHasSkill: true,
        userSkillLevel: userSkill.level,
        userYearsOfExperience: userSkill.yearsOfExperience,
      });
    } else {
      const partialMatch = findPartialMatch(req.name, profile);
      if (partialMatch) {
        matches.push(partialMatch);
      } else {
        matches.push({
          skillName: "",
          jobRequirement: req.name,
          matchType: "NONE",
          userHasSkill: false,
        });
      }
    }
  }

  return matches;
}

function findPartialMatch(
  requirementName: string,
  profile: UserProfile
): SkillMatch | null {
  const normalizedReq = normalizeSkillName(requirementName);

  for (const skill of profile.skills) {
    const normalizedSkill = normalizeSkillName(skill.name);

    if (
      normalizedSkill.includes(normalizedReq) ||
      normalizedReq.includes(normalizedSkill)
    ) {
      return {
        skillName: skill.name,
        jobRequirement: requirementName,
        matchType: "PARTIAL",
        userHasSkill: true,
        userSkillLevel: skill.level,
        userYearsOfExperience: skill.yearsOfExperience,
      };
    }
  }

  return null;
}

function calculateCategoryScore(matches: SkillMatch[], total: number): number {
  if (total === 0) return 100;

  const fullMatches = matches.filter((m) => m.matchType === "FULL").length;
  const partialMatches = matches.filter((m) => m.matchType === "PARTIAL").length;

  const score = ((fullMatches * 1 + partialMatches * 0.5) / total) * 100;
  return Math.min(100, score);
}

function calculateExperienceScore(job: Job, profile: UserProfile): number {
  if (!job.experienceRequired) return 80;

  const requiredYears = parseExperienceYears(job.experienceRequired);
  if (requiredYears === null) return 80;

  const profileYears = getProfileYears(profile);

  if (profileYears === null) return 60;

  if (profileYears >= requiredYears) return 100;
  if (profileYears >= requiredYears - 1) return 70;
  if (profileYears >= requiredYears - 2) return 40;
  return 20;
}

function parseExperienceYears(text: string): number | null {
  const match = text.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function getProfileYears(profile: UserProfile): number | null {
  const range = profile.yearsOfExperience;
  switch (range) {
    case "0-1":
      return 0.5;
    case "1-3":
      return 2;
    case "3-5":
      return 4;
    case "5+":
      return 6;
    default:
      return null;
  }
}

function calculateSeniorityScore(job: Job, profile: UserProfile): number {
  if (!job.seniority) return 80;

  const levelOrder = ["junior", "pleno", "senior", "especialista"];
  const jobLevelIndex = levelOrder.indexOf(job.seniority);
  const profileLevelIndex = levelOrder.indexOf(profile.minimumLevel || "pleno");

  if (jobLevelIndex === profileLevelIndex) return 100;
  if (jobLevelIndex === profileLevelIndex - 1) return 80;
  if (jobLevelIndex === profileLevelIndex + 1) return 60;
  return 40;
}

function getExperienceMatch(
  job: Job,
  profile: UserProfile
): "compatible" | "below" | "above" | "unknown" {
  if (!job.experienceRequired) return "unknown";

  const requiredYears = parseExperienceYears(job.experienceRequired);
  if (requiredYears === null) return "unknown";

  const profileYears = getProfileYears(profile);
  if (profileYears === null) return "unknown";

  if (profileYears >= requiredYears) return "compatible";
  return "below";
}

function getSeniorityMatch(
  job: Job,
  profile: UserProfile
): "compatible" | "below" | "above" | "unknown" {
  if (!job.seniority) return "unknown";

  const levelOrder = ["junior", "pleno", "senior", "especialista"];
  const jobLevelIndex = levelOrder.indexOf(job.seniority);
  const profileLevelIndex = levelOrder.indexOf(profile.minimumLevel || "pleno");

  if (jobLevelIndex === profileLevelIndex) return "compatible";
  if (jobLevelIndex > profileLevelIndex) return "above";
  return "below";
}

function getClassification(score: number): { label: "excelente" | "alta" | "media" | "baixa" | "muito_baixa"; emoji: string } {
  if (score >= 90) return { label: "excelente", emoji: "🔥" };
  if (score >= 75) return { label: "alta", emoji: "🟢" };
  if (score >= 60) return { label: "media", emoji: "🟡" };
  if (score >= 40) return { label: "baixa", emoji: "🟠" };
  return { label: "muito_baixa", emoji: "🔴" };
}

function getRecommendation(
  score: number,
  gapsCount: number,
  profileGaps: ProfileGap[]
): Recommendation {
  const criticalGaps = profileGaps.filter((g) => g.severity === "critical").length;

  if (score >= 85 && gapsCount <= 2 && criticalGaps === 0) return "APPLY";
  if (score >= 60 && criticalGaps <= 1) return "MAYBE";
  return "SKIP";
}
