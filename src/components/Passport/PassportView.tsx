/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type { DeveloperPassport, GitHubProfileIntelligence } from '../../schema.js';
import {
  User,
  GitBranch,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Clock,
  Code2,
  FolderGit2,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  Award,
} from 'lucide-react';

interface PassportViewProps {
  passport: DeveloperPassport;
  onUpdatePassport: (updated: DeveloperPassport) => void;
  profileIntel: GitHubProfileIntelligence | null;
  isLoadingProfile: boolean;
  profileError: string | null;
  passportStorageStatus: 'saved' | 'unavailable';
  onLoadGitHubProfile: (username: string) => void;
  onGoToDiscovery: () => void;
}

const COMMON_LANGUAGES = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C++', 'Ruby'];
const COMMON_FRAMEWORKS = ['React', 'Node.js', 'Express', 'Vite', 'Next.js', 'Tailwind CSS', 'Vue', 'Docker'];
const COMMON_LEARN_TOPICS = ['Rust', 'WebAssembly', 'Compiler Design', 'AST Parsers', 'Distributed Systems', 'GraphQL', 'eBPF'];
const COMMON_DOMAINS = ['Developer Tools', 'Web Frameworks', 'Compilers & Bundlers', 'UI & Styling', 'CLI Tools', 'Data & ML'];

export const PassportView: React.FC<PassportViewProps> = ({
  passport,
  onUpdatePassport,
  profileIntel,
  isLoadingProfile,
  profileError,
  passportStorageStatus,
  onLoadGitHubProfile,
  onGoToDiscovery,
}) => {
  const [usernameInput, setUsernameInput] = useState(passport.github_username);
  const [customLang, setCustomLang] = useState('');
  const [customLearn, setCustomLearn] = useState('');

  const toggleLanguage = (lang: string) => {
    const next = passport.languages.includes(lang)
      ? passport.languages.filter((l) => l !== lang)
      : [...passport.languages, lang];
    onUpdatePassport({ ...passport, languages: next });
  };

  const toggleFramework = (fw: string) => {
    const next = passport.frameworks.includes(fw)
      ? passport.frameworks.filter((f) => f !== fw)
      : [...passport.frameworks, fw];
    onUpdatePassport({ ...passport, frameworks: next });
  };

  const toggleLearnTopic = (topic: string) => {
    const next = passport.want_to_learn.includes(topic)
      ? passport.want_to_learn.filter((t) => t !== topic)
      : [...passport.want_to_learn, topic];
    onUpdatePassport({ ...passport, want_to_learn: next });
  };

  const toggleDomain = (domain: string) => {
    const next = passport.preferred_domains.includes(domain)
      ? passport.preferred_domains.filter((d) => d !== domain)
      : [...passport.preferred_domains, domain];
    onUpdatePassport({ ...passport, preferred_domains: next });
  };

  const handleAddCustomLang = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLang.trim();
    if (trimmed && !passport.languages.includes(trimmed)) {
      onUpdatePassport({ ...passport, languages: [...passport.languages, trimmed] });
      setCustomLang('');
    }
  };

  const handleAddCustomLearn = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customLearn.trim();
    if (trimmed && !passport.want_to_learn.includes(trimmed)) {
      onUpdatePassport({ ...passport, want_to_learn: [...passport.want_to_learn, trimmed] });
      setCustomLearn('');
    }
  };

  const handleLoadProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = usernameInput.trim();
    if (trimmed) {
      onUpdatePassport({ ...passport, github_username: trimmed });
      onLoadGitHubProfile(trimmed);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 text-xs font-semibold border border-indigo-800/60">
              <Award className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personalized Contribution Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Developer Passport
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Define your technical background and learning goals. FirstPatch reconciles self-reported
              skills against real public GitHub repository evidence to personalize issue discovery and contribution guides.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onGoToDiscovery}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-md shadow-indigo-950"
            >
              <span>Discover Matching Issues</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Passport Preferences Editor (cols: 7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* GitHub Profile Sync */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  GitHub Profile Intelligence
                </h2>
              </div>
              <span className="text-[11px] text-slate-500">Read-Only Public Inspection</span>
            </div>

            <form onSubmit={handleLoadProfileSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-mono text-xs">
                  @
                </span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="github-username"
                  className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-xs font-mono text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoadingProfile || !usernameInput.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
              >
                {isLoadingProfile ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span>Sync GitHub Evidence</span>
              </button>
            </form>

            <p className="text-[11px] text-slate-500 leading-normal">
              Fetches public repository languages and topics to ground your skills profile with observable repository evidence.
            </p>
            <p className="text-[11px] text-slate-500 leading-normal flex items-start gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Only this passport is saved in this browser. GitHub evidence is fetched on demand and is not stored locally.</span>
            </p>
            {passportStorageStatus === 'unavailable' && (
              <p className="text-[11px] text-amber-300" role="status">
                Browser storage is unavailable, so your passport will reset when this page closes.
              </p>
            )}
            {profileError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300" role="alert">
                <p className="font-semibold">Could not sync GitHub evidence</p>
                <p className="mt-1">{profileError}</p>
                <p className="mt-1 text-rose-300/80">Check the username and try again. Only public GitHub data is inspected.</p>
              </div>
            )}
          </div>

          {/* Languages & Frameworks Selection */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white">
                  Known Programming Languages
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {passport.languages.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_LANGUAGES.map((lang) => {
                  const active = passport.languages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => toggleLanguage(lang)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
              <form onSubmit={handleAddCustomLang} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customLang}
                  onChange={(e) => setCustomLang(e.target.value)}
                  placeholder="Add custom language (e.g. Kotlin, Elixir)..."
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customLang.trim()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Add
                </button>
              </form>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white">
                  Familiar Frameworks & Tools
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {passport.frameworks.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_FRAMEWORKS.map((fw) => {
                  const active = passport.frameworks.includes(fw);
                  return (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => toggleFramework(fw)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {fw}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Technologies to Learn */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Target Technologies You Want to Learn
                </label>
                <span className="text-[11px] text-purple-400/80 font-mono">
                  {passport.want_to_learn.length} targets
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMMON_LEARN_TOPICS.map((topic) => {
                  const active = passport.want_to_learn.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleLearnTopic(topic)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-purple-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
              <form onSubmit={handleAddCustomLearn} className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customLearn}
                  onChange={(e) => setCustomLearn(e.target.value)}
                  placeholder="Add target technology to learn (e.g. Zig, LLVM)..."
                  className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!customLearn.trim()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Add
                </button>
              </form>
            </div>

            {/* Preferred Domains */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white block mb-2">
                Preferred Project Domains
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMON_DOMAINS.map((domain) => {
                  const active = passport.preferred_domains.includes(domain);
                  return (
                    <button
                      key={domain}
                      type="button"
                      onClick={() => toggleDomain(domain)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? 'bg-blue-600 text-white font-semibold shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {domain}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Experience, Difficulty, Time Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-800/80">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white block mb-1.5">
                  Experience Level
                </label>
                <select
                  value={passport.experience_level}
                  onChange={(e) =>
                    onUpdatePassport({
                      ...passport,
                      experience_level: e.target.value as 'beginner' | 'intermediate' | 'advanced',
                    })
                  }
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none font-medium"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white block mb-1.5">
                  Preferred Difficulty
                </label>
                <select
                  value={passport.preferred_difficulty}
                  onChange={(e) =>
                    onUpdatePassport({
                      ...passport,
                      preferred_difficulty: e.target.value as any,
                    })
                  }
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none font-medium"
                >
                  <option value="any">Any Difficulty</option>
                  <option value="beginner">Good First Issue / Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-white block mb-1.5">
                  Available Contribution Time
                </label>
                <select
                  value={passport.available_time}
                  onChange={(e) =>
                    onUpdatePassport({
                      ...passport,
                      available_time: e.target.value,
                    })
                  }
                  className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none font-medium"
                >
                  <option value="1-3 hours/week">1-3 hours/week</option>
                  <option value="3-5 hours/week">3-5 hours/week</option>
                  <option value="5-10 hours/week">5-10 hours/week</option>
                  <option value="Weekend sprint">Weekend sprint</option>
                </select>
              </div>
            </div>

            {/* Learning Goals Text */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white block mb-1.5">
                Specific Learning Goals or Areas of Interest
              </label>
              <textarea
                value={passport.learning_goals}
                onChange={(e) =>
                  onUpdatePassport({ ...passport, learning_goals: e.target.value })
                }
                rows={2}
                placeholder="e.g. Master React reconciler internals, understand AST codegen, contribute to CLI tools..."
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Evidence-Backed Skills Profile (cols: 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Evidence-Backed Skills Overview
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {profileIntel ? `${profileIntel.detected_skills.length} skills mapped` : 'Awaiting sync'}
              </span>
            </div>

            {isLoadingProfile ? (
              <div className="space-y-3" role="status" aria-live="polite">
                <div className="h-16 rounded-xl bg-slate-950 border border-slate-800 animate-pulse" />
                <div className="h-4 rounded bg-slate-800 animate-pulse w-4/5" />
                <div className="h-14 rounded-xl bg-slate-950 border border-slate-800 animate-pulse" />
                <p className="text-xs text-slate-400">Inspecting recent public repository metadata…</p>
              </div>
            ) : profileIntel ? (
              <div className="space-y-3">
                {/* User Card */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                  <img
                    src={profileIntel.avatar_url}
                    alt={profileIntel.username}
                    className="w-10 h-10 rounded-full border border-slate-700 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-xs text-white block truncate">
                      {profileIntel.name || profileIntel.username}
                    </span>
                    <span className="font-mono text-[11px] text-indigo-400 block truncate">
                      @{profileIntel.username} · {profileIntel.public_repos_count} public repos
                    </span>
                  </div>
                  <a
                    href={profileIntel.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed italic">
                  {profileIntel.recent_activity_summary}
                </p>

                {/* Skill Evidence Rows */}
                 <div className="space-y-2 pt-2">
                   <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                     <span className="font-semibold text-slate-300">Evidence key: </span>
                     repository evidence is observed in the sampled public repositories; self-reported is from your passport; potential gap is a learning target. Absence of evidence is not proof of absence.
                   </div>
                   {profileIntel.detected_skills.map((skill, i) => {
                    const isRepoEvidence = skill.evidence_status === 'repository_evidence_found';
                    const isGap = skill.evidence_status === 'potential_gap';

                    return (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          isRepoEvidence
                            ? 'bg-slate-950 border-emerald-900/60'
                            : isGap
                            ? 'bg-purple-950/20 border-purple-900/50'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-200">
                            {skill.name}
                          </span>
                          <span
                            className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                              isRepoEvidence
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : isGap
                                ? 'bg-purple-950 text-purple-400 border border-purple-800/60'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isRepoEvidence
                              ? 'Repository Evidence'
                              : isGap
                              ? 'Potential Gap / Target'
                              : 'Self-Reported'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          {skill.evidence_detail}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Top Repositories Snapshot */}
                {profileIntel.top_repositories.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                      Audited Public Repositories (Sample)
                    </span>
                    <div className="space-y-1.5">
                      {profileIntel.top_repositories.slice(0, 4).map((repo) => (
                        <div
                          key={repo.name}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/60 text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-mono font-medium text-slate-300 truncate block">
                              {repo.name}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate block">
                              {repo.language || 'Unknown'} · ★ {repo.stars}
                            </span>
                          </div>
                          <a
                            href={repo.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-500 hover:text-slate-300"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center space-y-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                <Code2 className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter your GitHub username to audit your public repositories and ground your Passport with real codebase evidence.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
