import { UserProfile, ProfileScore, SkillLevel } from "../types";

const LEVEL_ORDER: SkillLevel[] = ["junior", "pleno", "senior", "especialista"];

const EXPERIENCE_POINTS: Record<string, number> = {
  "0-1": 10,
  "1-3": 25,
  "3-5": 50,
  "5+": 80,
};

const SKILL_LEVEL_POINTS: Record<SkillLevel, number> = {
  junior: 10,
  pleno: 25,
  senior: 50,
  especialista: 80,
};

export function calculateProfileScore(profile: UserProfile): ProfileScore {
  const skillsCount = profile.skills.length;
  const skillsWithLevel = profile.skills.filter(
    (s) => s.level !== undefined
  ).length;

  const experienceYears = getExperienceYears(profile.yearsOfExperience);

  const skillsScore = calculateSkillsScore(profile);
  const experienceScore = calculateExperienceScore(profile);
  const seniorityScore = calculateSeniorityScore(profile);
  const completenessScore = calculateCompletenessScore(profile);

  // Fórmula ajustada para ser mais justa
  let overall: number;

  if (skillsCount === 0) {
    overall = 5; // Mínimo se não tem skills
  } else {
    overall = Math.round(
      skillsScore * 0.5 +          // 50% das skills
      experienceScore * 0.2 +      // 20% experiência
      seniorityScore * 0.15 +      // 15% senioridade
      completenessScore * 0.15     // 15% completude
    );
  }

  const { level, levelLabel, nextLevel, pointsToNext } = getLevel(overall);
  const strengths = identifyStrengths(profile);
  const weaknesses = identifyWeaknesses(profile);
  const recommendation = getRecommendation(overall, weaknesses.length);

  return {
    overall: Math.min(100, Math.max(0, overall)),
    skillsCount,
    skillsWithLevel,
    experienceYears,
    seniorityLevel: profile.minimumLevel || "pleno",
    completeness: completenessScore,
    strengths,
    weaknesses,
    recommendation,
    level,
    levelLabel,
    nextLevel,
    pointsToNext,
  };
}

function calculateSkillsScore(profile: UserProfile): number {
  if (profile.skills.length === 0) return 0;

  // Pontuação baseada na quantidade de skills
  let quantityScore = 0;
  if (profile.skills.length >= 15) quantityScore = 100;
  else if (profile.skills.length >= 10) quantityScore = 85;
  else if (profile.skills.length >= 7) quantityScore = 70;
  else if (profile.skills.length >= 5) quantityScore = 55;
  else if (profile.skills.length >= 3) quantityScore = 35;
  else quantityScore = 20;

  // Pontuação baseada no nível das skills
  const totalPoints = profile.skills.reduce((sum, skill) => {
    return sum + SKILL_LEVEL_POINTS[skill.level];
  }, 0);
  const maxPoints = profile.skills.length * 80;
  const levelScore = (totalPoints / maxPoints) * 100;

  // Média ponderada: 60% quantidade, 40% nível
  return Math.round(quantityScore * 0.6 + levelScore * 0.4);
}

function calculateExperienceScore(profile: UserProfile): number {
  return EXPERIENCE_POINTS[profile.yearsOfExperience] || 25;
}

function calculateSeniorityScore(profile: UserProfile): number {
  const index = LEVEL_ORDER.indexOf(profile.minimumLevel || "pleno");
  return ((index + 1) / LEVEL_ORDER.length) * 100;
}

function calculateCompletenessScore(profile: UserProfile): number {
  let score = 0;
  const fields = [
    profile.jobTitle,
    profile.location,
    profile.yearsOfExperience,
    profile.minimumLevel,
    profile.skills.length > 0,
    profile.preferredModality && profile.preferredModality.length > 0,
  ];

  const filledFields = fields.filter(Boolean).length;
  score = (filledFields / fields.length) * 100;

  if (profile.skills.length >= 5) score += 10;
  if (profile.skills.length >= 10) score += 10;

  return Math.min(100, score);
}

function getExperienceYears(range: string): number {
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
      return 0;
  }
}

function getLevel(score: number): {
  level: "bronze" | "prata" | "ouro" | "diamante";
  levelLabel: string;
  nextLevel: string;
  pointsToNext: number;
} {
  if (score >= 85) {
    return {
      level: "diamante",
      levelLabel: "💎 Diamante",
      nextLevel: "Nível máximo!",
      pointsToNext: 0,
    };
  }
  if (score >= 70) {
    return {
      level: "ouro",
      levelLabel: "🥇 Ouro",
      nextLevel: "Diamante",
      pointsToNext: 85 - score,
    };
  }
  if (score >= 50) {
    return {
      level: "prata",
      levelLabel: "🥈 Prata",
      nextLevel: "Ouro",
      pointsToNext: 70 - score,
    };
  }
  return {
    level: "bronze",
    levelLabel: "🥉 Bronze",
    nextLevel: "Prata",
    pointsToNext: 50 - score,
  };
}

function identifyStrengths(profile: UserProfile): string[] {
  const strengths: string[] = [];

  if (profile.skills.length >= 10) {
    strengths.push(`${profile.skills.length} skills cadastradas`);
  }

  const seniorSkills = profile.skills.filter(
    (s) => s.level === "senior" || s.level === "especialista"
  );
  if (seniorSkills.length >= 3) {
    strengths.push(`${seniorSkills.length} skills em nível avançado`);
  }

  if (profile.yearsOfExperience === "5+") {
    strengths.push("Experiência expressiva");
  }

  if (profile.location) {
    strengths.push("Localização definida");
  }

  if (
    profile.preferredModality &&
    profile.preferredModality.length > 0
  ) {
    strengths.push("Preferências de trabalho definidas");
  }

  return strengths;
}

function identifyWeaknesses(profile: UserProfile): string[] {
  const weaknesses: string[] = [];

  if (profile.skills.length < 3) {
    weaknesses.push("Adicione pelo menos 5 skills ao seu perfil");
  } else if (profile.skills.length < 5) {
    weaknesses.push("Adicione mais skills para aumentar seu score");
  }

  const hasJuniorSkills = profile.skills.some((s) => s.level === "junior");
  const hasSeniorSkills = profile.skills.some(
    (s) => s.level === "senior" || s.level === "especialista"
  );
  if (hasJuniorSkills && !hasSeniorSkills && profile.skills.length > 0) {
    weaknesses.push("Evolua suas skills para níveis mais altos");
  }

  if (!profile.location) {
    weaknesses.push("Informe sua localização");
  }

  if (
    !profile.preferredModality ||
    profile.preferredModality.length === 0
  ) {
    weaknesses.push("Defina suas preferências de trabalho");
  }

  if (profile.yearsOfExperience === "0-1") {
    weaknesses.push("Sua experiência é limitada - foque em projetos pessoais");
  }

  if (!profile.jobTitle || profile.jobTitle.length < 3) {
    weaknesses.push("Informe seu cargo atual");
  }

  return weaknesses;
}

function getRecommendation(score: number, weaknessCount: number): string {
  if (score >= 80 && weaknessCount <= 1) {
    return "Seu perfil está muito forte! Continue assim.";
  }
  if (score >= 60) {
    return "Bom perfil. Considere adicionar mais skills.";
  }
  if (score >= 40) {
    return "Perfil em desenvolvimento. Foque em evoluir suas skills.";
  }
  return "Comece cadastrando suas principais competências.";
}
