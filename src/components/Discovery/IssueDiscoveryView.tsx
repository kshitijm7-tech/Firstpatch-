/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import type { DeveloperPassport, DiscoveredIssue } from '../../schema.js';
import {
  Sparkles,
  RefreshCw,
  FolderGit2,
  ExternalLink,
  ArrowRight,
  SlidersHorizontal,
  GraduationCap,
  AlertCircle,
  HelpCircle,
  Clock,
  Compass,
} from 'lucide-react';

interface IssueDiscoveryViewProps {
  passport: DeveloperPassport;
  onSelectIssue: (issueUrl: string) => void;
  onEditPassport: () => void;
}

export const IssueDiscoveryView: React.FC<IssueDiscoveryViewProps> = ({
  passport,
  onSelectIssue,
  onEditPassport,
}) => {
  const [issues, setIssues] = useState<DiscoveredIssue[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDifficultyFilter, setSelectedDifficultyFilter] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [evaluatedCount, setEvaluatedCount] = useState<number>(0);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passport }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to discover issues.');
      }

      setIssues(data.issues || []);
      setEvaluatedCount(data.total_evaluated || (data.issues || []).length);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown network failure during discovery';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passport.github_username, passport.preferred_difficulty]);

  const filteredIssues = issues.filter((item) => {
    if (selectedDifficultyFilter !== 'all' && item.estimated_difficulty !== selectedDifficultyFilter) {
      return false;
    }
    if (item.match_score < minScoreFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner / Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
              <Compass className="w-4 h-4" />
              <span>Personalized Issue Discovery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Tailored Open-Source Contribution Matches
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real open-source issues evaluated against your Developer Passport{' '}
              <span className="font-mono text-indigo-300">
                {passport.github_username ? `@${passport.github_username}` : '(Local Profile)'}
              </span>
              . Every recommendation includes transparent heuristic scoring, grounded learning requirements, and identified uncertainties.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={fetchRecommendations}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Scanning Repos...' : 'Refresh Matches'}</span>
            </button>

            <button
              onClick={onEditPassport}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Adjust Passport</span>
            </button>
          </div>
        </div>

        {/* Passport summary pill strip */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="text-slate-500">Active Profile Fit:</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-slate-300">
            {passport.experience_level.toUpperCase()}
          </span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-400">Prefers: <strong className="text-slate-200">{passport.preferred_difficulty}</strong> issues</span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-400">
            {passport.languages.length > 0 ? passport.languages.slice(0, 3).join(', ') : 'No languages'}
          </span>
          {passport.want_to_learn.length > 0 && (
            <>
              <span className="text-slate-700">·</span>
              <span className="text-slate-400">
                Learning target: <strong className="text-indigo-300">{passport.want_to_learn[0]}</strong>
              </span>
            </>
          )}
          <span className="text-slate-700">·</span>
          <span className="font-mono text-slate-500 text-[11px]">
            {evaluatedCount} candidate issues scanned
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Difficulty:</span>
          <div className="flex items-center gap-1.5">
            {['all', 'beginner', 'intermediate', 'advanced'].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedDifficultyFilter(tier)}
                className={`px-3 py-1 rounded-md capitalize transition-colors font-medium ${
                  selectedDifficultyFilter === tier
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="min-match-score" className="text-slate-400 font-medium">
            Min Match: <span className="text-indigo-400 font-mono font-bold">{minScoreFilter}%</span>
          </label>
          <input
            id="min-match-score"
            type="range"
            min={0}
            max={80}
            step={10}
            value={minScoreFilter}
            onChange={(e) => setMinScoreFilter(Number(e.target.value))}
            className="w-28 accent-indigo-500 cursor-pointer"
          />
          <span className="text-slate-500 font-mono text-[11px]">
            Showing {filteredIssues.length} of {issues.length}
          </span>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Discovery failed</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse space-y-4">
              <div className="h-5 bg-slate-800 rounded w-1/3" />
              <div className="h-4 bg-slate-800/60 rounded w-2/3" />
              <div className="h-16 bg-slate-950/60 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Issues List */}
      {!isLoading && filteredIssues.length > 0 && (
        <div className="space-y-4">
          {filteredIssues.map((item) => (
            <div
              key={`${item.owner}/${item.repo}#${item.number}`}
              className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between gap-6"
            >
              {/* Header / Meta */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-indigo-400 font-semibold flex items-center gap-1">
                      <FolderGit2 className="w-3.5 h-3.5" />
                      {item.owner}/{item.repo}
                    </span>
                    <span className="text-slate-700">·</span>
                    <span className="font-mono text-slate-400">#{item.number}</span>
                    <span className="text-slate-700">·</span>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                        item.estimated_difficulty === 'beginner'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : item.estimated_difficulty === 'intermediate'
                          ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {item.estimated_difficulty}
                    </span>
                  </div>

                  {/* Match Score Badge */}
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-xs uppercase font-mono tracking-wider text-slate-500 block">
                        Match Score
                      </span>
                      <span className="text-base font-bold font-mono text-emerald-400">
                        {item.match_score}%
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-full border-2 border-emerald-500/40 bg-emerald-950/30 flex items-center justify-center text-xs font-mono font-bold text-emerald-300">
                      {item.match_score}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white tracking-tight hover:text-indigo-300 transition-colors">
                  <a
                    href={item.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5"
                  >
                    <span>{item.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-50 shrink-0" />
                  </a>
                </h3>

                {/* Labels if available */}
                {item.labels && item.labels.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {item.labels.map((l) => (
                      <span
                        key={l.name}
                        className="px-2 py-0.5 rounded text-[11px] font-mono border"
                        style={{
                          borderColor: `#${l.color}40`,
                          backgroundColor: `#${l.color}15`,
                          color: `#${l.color}`,
                        }}
                      >
                        {l.name}
                      </span>
                    ))}
                  </div>
                )}

                {/* Heuristic Breakdown Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                  {/* Fit Reasons */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-400 font-semibold text-[11px] uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Why This Fits You</span>
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {item.match_reasons.map((r: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-tight">
                          <span className="text-indigo-400">✓</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Learning Opportunity */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Learning Target</span>
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {item.learning_opportunities.map((o: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-tight">
                          <span className="text-amber-400">→</span>
                          <span>{o}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Uncertainties / Pre-checks */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>To Verify</span>
                    </div>
                    <ul className="space-y-1 text-slate-400">
                      {item.uncertainties.map((u: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-tight">
                          <span className="text-slate-600">?</span>
                          <span>{u}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Relevant Skills Tags */}
                {item.relevant_skills.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2">
                    <span className="text-[11px] text-slate-500 font-medium">Matching Skills:</span>
                    {item.relevant_skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950/40 text-indigo-300 border border-indigo-800/40"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Est. {item.estimated_difficulty === 'beginner' ? '2-4' : item.estimated_difficulty === 'intermediate' ? '4-8' : '8-16'} hrs
                  </span>
                  <span>·</span>
                  <span>Zero local cloning</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={item.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>View Issue</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => onSelectIssue(item.html_url)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-900/30"
                  >
                    <span>Investigate & Generate Trail</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredIssues.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Compass className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No matching issues with current filters</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try adjusting your difficulty filter, lowering the minimum match score, or adding more programming languages in your Developer Passport.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedDifficultyFilter('all');
                setMinScoreFilter(0);
              }}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Reset Filters
            </button>
            <button
              onClick={onEditPassport}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
            >
              Update Passport
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
