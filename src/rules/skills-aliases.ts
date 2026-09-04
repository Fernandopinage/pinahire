export const skillAliases: Record<string, string> = {
  // JavaScript
  node: "node.js",
  nodejs: "node.js",
  js: "javascript",
  reactjs: "react",
  nextjs: "next.js",
  next: "next.js",
  vuejs: "vue.js",
  vue: "vue.js",
  angularjs: "angular",

  // TypeScript
  ts: "typescript",
  tsjs: "typescript",

  // Python
  py: "python",
  python3: "python",

  // Database
  postgres: "postgresql",
  pg: "postgresql",
  mysql: "mysql",
  mongo: "mongodb",
  mongodb: "mongodb",
  redis: "redis",

  // Cloud
  aws: "aws",
  amazonwebservices: "aws",
  gcp: "google cloud",
  googlecloud: "google cloud",
  azure: "azure",

  // DevOps
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  docker: "docker",
  ci: "ci/cd",
  cicd: "ci/cd",

  // Frameworks
  nestjs: "nestjs",
  nest: "nestjs",
  expressjs: "express",
  express: "express",
  fastify: "fastify",
  django: "django",
  flask: "flask",
  spring: "spring",
  springboot: "spring boot",

  // Mobile
  reactnative: "react native",
  rn: "react native",
  flutter: "flutter",
  ionic: "ionic",

  // Outros
  graphql: "graphql",
  gql: "graphql",
  rest: "rest",
  restapi: "rest api",
  microservices: "microservices",
  micro: "microservices",
};

export function normalizeSkillName(skill: string): string {
  const normalized = skill.toLowerCase().trim();
  return skillAliases[normalized] || normalized;
}

export function findSkillAlias(skill: string): string | undefined {
  const normalized = skill.toLowerCase().trim();
  return skillAliases[normalized];
}
