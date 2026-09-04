import { useState, useEffect } from "react";
import { JobMatchResult, HistoryItem, DashboardStats, ProfileScore } from "../types";

type Tab = "analyze" | "profile" | "history" | "dashboard";

export function Popup() {
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [jobText, setJobText] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobCompany, setJobCompany] = useState("");
  const [result, setResult] = useState<JobMatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [profileScore, setProfileScore] = useState<ProfileScore | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    } else if (activeTab === "dashboard") {
      loadStats();
    } else if (activeTab === "profile") {
      loadProfileScore();
    }
  }, [activeTab]);

  async function loadHistory() {
    const response = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
    if (response?.data) {
      setHistory(response.data);
    }
  }

  async function loadStats() {
    const response = await chrome.runtime.sendMessage({
      type: "GET_DASHBOARD_STATS",
    });
    if (response?.data) {
      setStats(response.data);
    }
  }

  async function loadProfileScore() {
    setProfileLoading(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: "GET_PROFILE_SCORE",
      });
      if (response?.success) {
        setProfileScore(response.data);
      }
    } catch (err) {
      console.error("Erro ao carregar score do perfil");
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!jobText.trim()) {
      setError("Cole a descrição da vaga para analisar.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_TEXT",
        payload: {
          text: jobText,
          title: jobTitle || undefined,
          company: jobCompany || undefined,
        },
      });

      if (response?.success) {
        setResult(response.data);
      } else {
        setError(response?.error || "Erro ao analisar a vaga.");
      }
    } catch (err) {
      setError("Erro ao comunicar com a extensão.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzeCurrentPage() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) {
        setError("Nenhuma aba ativa encontrada.");
        setLoading(false);
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "GET_JOB_DATA",
      });

      if (response?.description) {
        setJobText(response.description);
        if (response.title) setJobTitle(response.title);
        if (response.company) setJobCompany(response.company);

        const analyzeResponse = await chrome.runtime.sendMessage({
          type: "ANALYZE_TEXT",
          payload: {
            text: response.description,
            title: response.title,
            company: response.company,
            url: response.url,
          },
        });

        if (analyzeResponse?.success) {
          setResult(analyzeResponse.data);
        } else {
          setError(analyzeResponse?.error || "Erro ao analisar a vaga.");
        }
      } else {
        setError("Não foi possível extrair dados desta página.");
      }
    } catch (err) {
      setError(
        "Não foi possível acessar esta página. Tente colar a descrição manualmente."
      );
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    if (score >= 40) return "medium";
    return "low";
  }

  function getGapIcon(severity: string): string {
    switch (severity) {
      case "critical":
        return "🔴";
      case "warning":
        return "🟡";
      default:
        return "🔵";
    }
  }

  function getLevelColor(level: string): string {
    switch (level) {
      case "diamante":
        return "#a855f7";
      case "ouro":
        return "#eab308";
      case "prata":
        return "#94a3b8";
      default:
        return "#cd7f32";
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="logo">PinaHire</div>
          <div className="subtitle">Encontre vagas que combinam com você</div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "analyze" ? "active" : ""}`}
          onClick={() => setActiveTab("analyze")}
        >
          🎯 Analisar
        </button>
        <button
          className={`tab ${activeTab === "profile" ? "active" : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          👤 Meu Score
        </button>
        <button
          className={`tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📋 Histórico
        </button>
        <button
          className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          📊 Stats
        </button>
      </div>

      {activeTab === "analyze" && (
        <div>
          {!result ? (
            <>
              <button
                className="button button-primary mb-3"
                onClick={handleAnalyzeCurrentPage}
                disabled={loading}
              >
                {loading ? "Analisando..." : "🎯 Analisar Página Atual"}
              </button>

              <div className="divider" />

              <div className="form-group">
                <label className="form-label">Título da vaga (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Senior Backend Developer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Empresa (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Empresa XYZ"
                  value={jobCompany}
                  onChange={(e) => setJobCompany(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Descrição da vaga
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Cole aqui a descrição completa da vaga..."
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                />
              </div>

              <button
                className="button button-secondary"
                onClick={handleAnalyze}
                disabled={loading || !jobText.trim()}
              >
                Analisar Descrição
              </button>
            </>
          ) : (
            <>
              <div className="score-container">
                <div className="score-value">{result.score}%</div>
                <div className="score-label">PinaHire Match</div>
                <div
                  className={`classification ${result.classification}`}
                >
                  {result.classificationEmoji}{" "}
                  {result.classification.charAt(0).toUpperCase() +
                    result.classification.slice(1)}
                </div>
                <div
                  className={`recommendation-badge ${result.recommendation}`}
                >
                  {result.recommendation === "APPLY" && "✅ CANDIDATAR-SE"}
                  {result.recommendation === "MAYBE" && "⚠️ AVALIAR"}
                  {result.recommendation === "SKIP" && "❌ NÃO RECOMENDADO"}
                </div>
              </div>

              {result.profileGaps && result.profileGaps.length > 0 && (
                <div className="card">
                  <div className="card-title">
                    ⚠️ Alertas do Perfil
                  </div>
                  <div className="profile-gaps">
                    {result.profileGaps.map((gap, index) => (
                      <div key={index} className={`gap-item ${gap.severity}`}>
                        <span className="gap-icon">
                          {getGapIcon(gap.severity)}
                        </span>
                        <div>
                          <div className="gap-message">{gap.message}</div>
                          <div className="gap-details">
                            Seu perfil: {gap.current} | Requerido:{" "}
                            {gap.required}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-title">📊 Explicação do Score</div>
                <div className="explanation-grid">
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {Math.round(result.explanation.requiredSkillsScore)}%
                    </div>
                    <div className="explanation-label">
                      Requisitos Obrigatórios
                    </div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {Math.round(result.explanation.preferredSkillsScore)}%
                    </div>
                    <div className="explanation-label">
                      Skills Desejadas
                    </div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {Math.round(result.explanation.experienceScore)}%
                    </div>
                    <div className="explanation-label">Experiência</div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {Math.round(result.explanation.seniorityScore)}%
                    </div>
                    <div className="explanation-label">Senioridade</div>
                  </div>
                </div>
              </div>

              {result.strongPoints.length > 0 && (
                <div className="card">
                  <div className="card-title">
                    ✅ Pontos Fortes ({result.strongPoints.length})
                  </div>
                  <div className="skill-list">
                    {result.strongPoints.map((match, index) => (
                      <div key={index} className="skill-item match">
                        <span className="skill-icon">✅</span>
                        <span>{match.jobRequirement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.partialMatches.length > 0 && (
                <div className="card">
                  <div className="card-title">
                    🟡 Matches Parciais ({result.partialMatches.length})
                  </div>
                  <div className="skill-list">
                    {result.partialMatches.map((match, index) => (
                      <div key={index} className="skill-item partial">
                        <span className="skill-icon">🟡</span>
                        <span>
                          {match.jobRequirement} (você tem:{" "}
                          {match.skillName})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.gaps.length > 0 && (
                <div className="card">
                  <div className="card-title">
                    ❌ Gaps ({result.gaps.length})
                  </div>
                  <div className="skill-list">
                    {result.gaps.map((match, index) => (
                      <div key={index} className="skill-item gap">
                        <span className="skill-icon">❌</span>
                        <span>{match.jobRequirement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="button button-secondary mt-3"
                onClick={() => {
                  setResult(null);
                  setJobText("");
                  setJobTitle("");
                  setJobCompany("");
                }}
              >
                ← Nova Análise
              </button>
            </>
          )}

          {error && (
            <div className="card mt-3" style={{ borderColor: "var(--danger)" }}>
              <div className="text-sm" style={{ color: "#fca5a5" }}>
                {error}
              </div>
            </div>
          )}

          {loading && (
            <div className="loading">
              <div className="spinner" />
            </div>
          )}
        </div>
      )}

      {activeTab === "profile" && (
        <div>
          {profileLoading ? (
            <div className="loading">
              <div className="spinner" />
            </div>
          ) : profileScore ? (
            <>
              <div className="score-container">
                <div
                  className="score-value"
                  style={{ color: getLevelColor(profileScore.level) }}
                >
                  {profileScore.overall}%
                </div>
                <div className="score-label">Score do Perfil</div>
                <div
                  className="classification"
                  style={{
                    background: `${getLevelColor(profileScore.level)}22`,
                    color: getLevelColor(profileScore.level),
                  }}
                >
                  {profileScore.levelLabel}
                </div>
              </div>

              <div className="card">
                <div className="card-title">📈 Progresso</div>
                <div className="section">
                  <div className="flex justify-between text-xs mb-2">
                    <span>Próximo nível: {profileScore.nextLevel}</span>
                    <span>{profileScore.pointsToNext} pts restantes</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill excellent"
                      style={{
                        width: `${profileScore.overall}%`,
                        background: getLevelColor(profileScore.level),
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">📊 Detalhes</div>
                <div className="explanation-grid">
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {profileScore.skillsCount}
                    </div>
                    <div className="explanation-label">Skills</div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {profileScore.experienceYears} anos
                    </div>
                    <div className="explanation-label">Experiência</div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {profileScore.completeness}%
                    </div>
                    <div className="explanation-label">Completude</div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {profileScore.seniorityLevel === "junior"
                        ? "Júnior"
                        : profileScore.seniorityLevel === "pleno"
                        ? "Pleno"
                        : profileScore.seniorityLevel === "senior"
                        ? "Sênior"
                        : "Especialista"}
                    </div>
                    <div className="explanation-label">Nível</div>
                  </div>
                </div>
              </div>

              {profileScore.strengths.length > 0 && (
                <div className="card">
                  <div className="card-title">💪 Pontos Fortes</div>
                  <div className="skill-list">
                    {profileScore.strengths.map((strength, index) => (
                      <div key={index} className="skill-item match">
                        <span className="skill-icon">✅</span>
                        <span>{strength}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profileScore.weaknesses.length > 0 && (
                <div className="card">
                  <div className="card-title">⚠️ Melhorias Sugeridas</div>
                  <div className="skill-list">
                    {profileScore.weaknesses.map((weakness, index) => (
                      <div key={index} className="skill-item partial">
                        <span className="skill-icon">💡</span>
                        <span>{weakness}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="card">
                <div className="card-title">💬 Recomendação</div>
                <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  {profileScore.recommendation}
                </div>
              </div>

              <button
                className="button button-secondary mt-3"
                onClick={loadProfileScore}
              >
                🔄 Atualizar Score
              </button>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <div className="empty-state-text">
                Cadastre seu perfil primeiro nas configurações.
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div>
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <div className="empty-state-text">
                Nenhuma vaga analisada ainda.
              </div>
            </div>
          ) : (
            <div className="skill-list">
              {history.map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="skill-item match" style={{ cursor: "pointer" }}>
                    <div style={{ flex: 1 }}>
                      <div className="font-semibold text-sm">{item.title}</div>
                      <div className="text-xs text-muted">{item.company}</div>
                    </div>
                    <div
                      className={`classification ${item.score >= 80 ? "alta" : item.score >= 60 ? "media" : "baixa"}`}
                      style={{ margin: 0 }}
                    >
                      {item.score}%
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "dashboard" && (
        <div>
          {stats ? (
            <>
              <div className="card">
                <div className="explanation-grid">
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {stats.totalAnalyzed}
                    </div>
                    <div className="explanation-label">
                      Vagas Analisadas
                    </div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">
                      {stats.averageScore}%
                    </div>
                    <div className="explanation-label">Match Médio</div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">{stats.above80}</div>
                    <div className="explanation-label">Acima de 80%</div>
                  </div>
                  <div className="explanation-item">
                    <div className="explanation-value">{stats.above90}</div>
                    <div className="explanation-label">Acima de 90%</div>
                  </div>
                </div>
              </div>

              {stats.totalAnalyzed > 0 && (
                <div className="card mt-3">
                  <div className="card-title">📊 Distribuição</div>
                  <div className="section">
                    <div className="flex justify-between text-xs mb-2">
                      <span>Progresso geral</span>
                      <span>{stats.averageScore}%</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${getScoreColor(stats.averageScore)}`}
                        style={{ width: `${stats.averageScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="loading">
              <div className="spinner" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
