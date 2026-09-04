import { Job, JobRequirement, SkillLevel } from "../types";

const REQUIRED_KEYWORDS = [
  "required",
  "requirements",
  "must have",
  "required skills",
  "qualifications",
  "requisitos",
  "obrigatório",
  "necessário",
];

const PREFERRED_KEYWORDS = [
  "nice to have",
  "preferred",
  "desired",
  "bonus",
  "plus",
  "differential",
  "desejável",
  "diferencial",
  "vantagem",
];

const SENIORITY_KEYWORDS: Record<string, SkillLevel> = {
  junior: "junior",
  júnior: "junior",
  jr: "junior",
  pleno: "pleno",
  mid: "pleno",
  "mid-level": "pleno",
  senior: "senior",
  sênior: "senior",
  sr: "senior",
  staff: "especialista",
  principal: "especialista",
  lead: "especialista",
  "tech lead": "especialista",
  especialista: "especialista",
};

export function parseJobDescription(
  text: string,
  title?: string,
  company?: string,
  url?: string
): Job {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const requirements = extractRequirements(lines);
  const seniority = detectSeniority(lines);
  const experienceRequired = detectExperience(lines);
  const location = detectLocation(lines);
  const modality = detectModality(lines);

  return {
    title: title || extractTitle(lines),
    company: company || "",
    url: url || "",
    description: text,
    requirements,
    seniority,
    experienceRequired,
    location,
    modality,
  };
}

function extractTitle(lines: string[]): string {
  const firstLine = lines[0] || "";
  if (firstLine.length < 100) {
    return firstLine;
  }
  return firstLine.substring(0, 80) + "...";
}

function extractRequirements(lines: string[]): JobRequirement[] {
  const requirements: JobRequirement[] = [];
  let currentType: "REQUIRED" | "PREFERRED" = "REQUIRED";
  let inRequirementsSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (REQUIRED_KEYWORDS.some((k) => lower.includes(k))) {
      currentType = "REQUIRED";
      inRequirementsSection = true;
      continue;
    }

    if (PREFERRED_KEYWORDS.some((k) => lower.includes(k))) {
      currentType = "PREFERRED";
      inRequirementsSection = true;
      continue;
    }

    if (inRequirementsSection && isRequirementLine(line)) {
      const cleanName = cleanRequirementText(line);
      if (cleanName) {
        requirements.push({
          name: cleanName,
          type: currentType,
          weight: currentType === "REQUIRED" ? 1.0 : 0.5,
        });
      }
    }
  }

  if (requirements.length === 0) {
    for (const line of lines) {
      if (isRequirementLine(line)) {
        const cleanName = cleanRequirementText(line);
        if (cleanName) {
          requirements.push({
            name: cleanName,
            type: "REQUIRED",
            weight: 1.0,
          });
        }
      }
    }
  }

  return requirements;
}

function isRequirementLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  if (trimmed.startsWith("http") || trimmed.startsWith("www")) return false;
  if (/^\d+\.\s/.test(trimmed)) return true;
  if (/^[-•*]\s/.test(trimmed)) return true;
  if (/^[A-Z]/.test(trimmed) && !trimmed.endsWith(":")) return true;
  return false;
}

function cleanRequirementText(line: string): string {
  return line
    .replace(/^[\d]+\.\s*/, "")
    .replace(/^[-•*]\s*/, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
}

function detectSeniority(lines: string[]): SkillLevel | undefined {
  const text = lines.join(" ").toLowerCase();
  for (const [keyword, level] of Object.entries(SENIORITY_KEYWORDS)) {
    if (text.includes(keyword)) {
      return level;
    }
  }
  return undefined;
}

function detectExperience(lines: string[]): string | undefined {
  const text = lines.join(" ");
  const patterns = [
    /(\d+)\+?\s*(?:years?|anos?)\s*(?:of|de)?\s*(?:experience|experiência)?/i,
    /(\d+)\s*-\s*(\d+)\s*(?:years?|anos?)/i,
    /minimum\s*(\d+)\s*(?:years?|anos?)/i,
    /mínimo\s*(\d+)\s*(?:years?|anos?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return undefined;
}

function detectLocation(lines: string[]): string | undefined {
  const text = lines.join("\n");
  const locationPatterns = [
    /location:\s*(.+)/i,
    /localização:\s*(.+)/i,
    /local:\s*(.+)/i,
    /ubiación:\s*(.+)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return undefined;
}

function detectModality(
  lines: string[]
): "remoto" | "hibrido" | "presencial" | undefined {
  const text = lines.join(" ").toLowerCase();

  if (text.includes("remote") || text.includes("remoto")) {
    return "remoto";
  }
  if (text.includes("hybrid") || text.includes("híbrido") || text.includes("hibrido")) {
    return "hibrido";
  }
  if (text.includes("on-site") || text.includes("presencial")) {
    return "presencial";
  }
  return undefined;
}
