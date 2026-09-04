import { useState, useEffect } from "react";
import {
  UserProfile,
  UserSkill,
  UserPreferences,
  SkillLevel,
  ExperienceRange,
} from "../types";

export function Options() {
  const [profile, setProfile] = useState<UserProfile>({
    jobTitle: "",
    yearsOfExperience: "3-5",
    skills: [],
    location: "",
    preferredModality: [],
    expectedSalary: undefined,
    minimumLevel: "pleno",
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    weights: {
      requiredSkills: 0.5,
      preferredSkills: 0.25,
      experience: 0.15,
      seniority: 0.1,
    },
    maxHistoryItems: 100,
  });

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>("pleno");
  const [newSkillYears, setNewSkillYears] = useState<number | undefined>(
    undefined
  );
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    loadProfile();
    loadPreferences();
  }, []);

  async function loadProfile() {
    const response = await chrome.runtime.sendMessage({ type: "GET_PROFILE" });
    if (response?.data) {
      setProfile(response.data);
    }
  }

  async function loadPreferences() {
    const response = await chrome.runtime.sendMessage({
      type: "GET_PREFERENCES",
    });
    if (response?.data) {
      setPreferences(response.data);
    }
  }

  async function saveProfile() {
    try {
      await chrome.runtime.sendMessage({
        type: "SAVE_PROFILE",
        payload: profile,
      });
      setStatus({ type: "success", message: "Perfil salvo com sucesso!" });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: "error", message: "Erro ao salvar perfil." });
    }
  }

  async function savePreferences() {
    try {
      await chrome.runtime.sendMessage({
        type: "SAVE_PREFERENCES",
        payload: preferences,
      });
      setStatus({
        type: "success",
        message: "Preferências salvas com sucesso!",
      });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: "error", message: "Erro ao salvar preferências." });
    }
  }

  function addSkill() {
    if (!newSkillName.trim()) return;

    const skill: UserSkill = {
      name: newSkillName.trim(),
      level: newSkillLevel,
      yearsOfExperience: newSkillYears,
    };

    setProfile((prev) => ({
      ...prev,
      skills: [...prev.skills, skill],
    }));

    setNewSkillName("");
    setNewSkillLevel("pleno");
    setNewSkillYears(undefined);
  }

  function removeSkill(index: number) {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  }

  function handleModalityChange(modality: "remoto" | "hibrido" | "presencial") {
    setProfile((prev) => {
      const current = prev.preferredModality || [];
      const updated = current.includes(modality)
        ? current.filter((m) => m !== modality)
        : [...current, modality];
      return { ...prev, preferredModality: updated };
    });
  }

  async function handleExport() {
    const response = await chrome.runtime.sendMessage({
      type: "EXPORT_PROFILE",
    });
    if (response?.data) {
      const blob = new Blob([response.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pinahire-profile.json";
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const text = await file.text();
      const response = await chrome.runtime.sendMessage({
        type: "IMPORT_PROFILE",
        payload: text,
      });

      if (response?.success) {
        loadProfile();
        loadPreferences();
        setStatus({
          type: "success",
          message: "Perfil importado com sucesso!",
        });
      } else {
        setStatus({ type: "error", message: "Erro ao importar perfil." });
      }
    };
    input.click();
  }

  const levelLabels: Record<SkillLevel, string> = {
    junior: "Júnior",
    pleno: "Pleno",
    senior: "Sênior",
    especialista: "Especialista",
  };

  const experienceLabels: Record<ExperienceRange, string> = {
    "0-1": "0-1 anos",
    "1-3": "1-3 anos",
    "3-5": "3-5 anos",
    "5+": "5+ anos",
  };

  return (
    <div className="container">
      <div className="header">
        <div className="logo">PinaHire Settings</div>
        <div className="subtitle">Configure seu perfil profissional</div>
      </div>

      <div className="section">
        <h2 className="section-title">👤 Informações Básicas</h2>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Cargo</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Desenvolvedor Full Stack"
              value={profile.jobTitle}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, jobTitle: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Localização</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: São Paulo, SP"
              value={profile.location || ""}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, location: e.target.value }))
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">Pretensão Salarial (R$)</label>
            <input
              type="number"
              className="form-input"
              placeholder="Ex: 10000"
              value={profile.expectedSalary || ""}
              onChange={(e) =>
                setProfile((prev) => ({
                  ...prev,
                  expectedSalary: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">🎯 Nível e Experiência</h2>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Nível de Senioridade</label>
            <div className="level-select">
              {(
                Object.entries(levelLabels) as [SkillLevel, string][]
              ).map(([value, label]) => (
                <div
                  key={value}
                  className={`level-option ${profile.minimumLevel === value ? "active" : ""}`}
                  onClick={() =>
                    setProfile((prev) => ({ ...prev, minimumLevel: value }))
                  }
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Anos de Experiência</label>
            <div className="experience-options">
              {(
                Object.entries(experienceLabels) as [ExperienceRange, string][]
              ).map(([value, label]) => (
                <div
                  key={value}
                  className={`experience-option ${profile.yearsOfExperience === value ? "active" : ""}`}
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      yearsOfExperience: value,
                    }))
                  }
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">💻 Skills</h2>
        <div className="card">
          <div className="skills-container">
            {profile.skills.map((skill, index) => (
              <div key={index} className="skill-tag">
                <span>
                  {skill.name} ({levelLabels[skill.level]}
                  {skill.yearsOfExperience
                    ? `, ${skill.yearsOfExperience} anos`
                    : ""}
                  )
                </span>
                <span className="remove" onClick={() => removeSkill(index)}>
                  ×
                </span>
              </div>
            ))}
          </div>

          <div className="add-skill-form">
            <input
              type="text"
              className="form-input"
              placeholder="Nome da skill"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
            />
            <select
              className="form-select"
              style={{ width: "auto" }}
              value={newSkillLevel}
              onChange={(e) => setNewSkillLevel(e.target.value as SkillLevel)}
            >
              {(
                Object.entries(levelLabels) as [SkillLevel, string][]
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="form-input"
              placeholder="Anos"
              style={{ width: "80px" }}
              value={newSkillYears || ""}
              onChange={(e) =>
                setNewSkillYears(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
            <button className="button button-primary" onClick={addSkill}>
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">⚙️ Preferências</h2>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Modalidade</label>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.preferredModality?.includes("remoto")}
                  onChange={() => handleModalityChange("remoto")}
                />
                Remoto
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.preferredModality?.includes("hibrido")}
                  onChange={() => handleModalityChange("hibrido")}
                />
                Híbrido
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={profile.preferredModality?.includes("presencial")}
                  onChange={() => handleModalityChange("presencial")}
                />
                Presencial
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">⚖️ Pesos do Score</h2>
        <div className="card">
          <div className="weight-slider">
            <label>Requisitos Obrigatórios</label>
            <input
              type="range"
              min="0"
              max="100"
              value={preferences.weights.requiredSkills * 100}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  weights: {
                    ...prev.weights,
                    requiredSkills: Number(e.target.value) / 100,
                  },
                }))
              }
            />
            <span className="weight-value">
              {Math.round(preferences.weights.requiredSkills * 100)}%
            </span>
          </div>

          <div className="weight-slider">
            <label>Skills Desejadas</label>
            <input
              type="range"
              min="0"
              max="100"
              value={preferences.weights.preferredSkills * 100}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  weights: {
                    ...prev.weights,
                    preferredSkills: Number(e.target.value) / 100,
                  },
                }))
              }
            />
            <span className="weight-value">
              {Math.round(preferences.weights.preferredSkills * 100)}%
            </span>
          </div>

          <div className="weight-slider">
            <label>Experiência</label>
            <input
              type="range"
              min="0"
              max="100"
              value={preferences.weights.experience * 100}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  weights: {
                    ...prev.weights,
                    experience: Number(e.target.value) / 100,
                  },
                }))
              }
            />
            <span className="weight-value">
              {Math.round(preferences.weights.experience * 100)}%
            </span>
          </div>

          <div className="weight-slider">
            <label>Senioridade</label>
            <input
              type="range"
              min="0"
              max="100"
              value={preferences.weights.seniority * 100}
              onChange={(e) =>
                setPreferences((prev) => ({
                  ...prev,
                  weights: {
                    ...prev.weights,
                    seniority: Number(e.target.value) / 100,
                  },
                }))
              }
            />
            <span className="weight-value">
              {Math.round(preferences.weights.seniority * 100)}%
            </span>
          </div>

          <button
            className="button button-secondary"
            onClick={savePreferences}
          >
            Salvar Preferências
          </button>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">📤 Exportar/Importar</h2>
        <div className="card">
          <div className="actions">
            <button className="button button-secondary" onClick={handleExport}>
              Exportar Perfil
            </button>
            <button className="button button-secondary" onClick={handleImport}>
              Importar Perfil
            </button>
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="button button-primary" onClick={saveProfile}>
          Salvar Perfil
        </button>
      </div>

      {status && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}
    </div>
  );
}
