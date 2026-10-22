/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { PersonalizedIntelligence } from '../../schema.js';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface LearningPathwaySectionProps {
  personalizedIntel?: PersonalizedIntelligence;
  onEditPassport?: () => void;
}

export const LearningPathwaySection: React.FC<LearningPathwaySectionProps> = ({
  personalizedIntel,
  onEditPassport,
}) => {
  if (!personalizedIntel) {
    return null;
  }

  const {
    fit_reason,
    skills_you_have,
    concepts_to_learn,
    skill_gap_pathway,
    estimated_time_hours,
  } = personalizedIntel;

  return (
    <section
      id="section-learning-pathway"
      className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-indigo-900/40 shadow-xl space-y-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 font-mono">
            <GraduationCap className="w-4 h-4 text-indigo-400" />
            <span>Personalized Contribution Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Developer Fit & Skill-Gap Learning Pathway
          </h2>
          <p className="text-xs text-slate-400">
            Tailored learning guide connecting your verified skills to the architectural concepts required for this specific issue.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center gap-2 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-300">Est. Prep:</span>
            <span className="font-bold text-white">{estimated_time_hours}</span>
          </div>

          {onEditPassport && (
            <button
              onClick={onEditPassport}
              className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
            >
              Update Passport
            </button>
          )}
        </div>
      </div>

      {/* Rationale & Fit Analysis Card */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300 font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Why This Issue Fits Your Background</span>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">
          {fit_reason}
        </p>
      </div>

      {/* Skills Matrix Grid: What you have vs What you'll learn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Skills You Bring */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-emerald-900/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>Skills You Bring to this Issue</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-500/80">Directly applicable</span>
          </div>

          {skills_you_have && skills_you_have.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {skills_you_have.map((s: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-mono bg-emerald-950/50 text-emerald-300 border border-emerald-800/50 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No direct 1:1 matching skills found from your passport.
            </p>
          )}
        </div>

        {/* Concepts to Learn */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-amber-900/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400 font-mono">
              <AlertTriangle className="w-4 h-4" />
              <span>Target Concepts to Review</span>
            </div>
            <span className="text-[11px] font-mono text-amber-500/80">Skill-gap focus</span>
          </div>

          {concepts_to_learn && concepts_to_learn.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {concepts_to_learn.map((c: string, idx: number) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-950/50 text-amber-300 border border-amber-800/50 flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {c}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No significant architectural gaps identified for your level.
            </p>
          )}
        </div>
      </div>

      {/* Ordered Learning Pathway */}
      {skill_gap_pathway && skill_gap_pathway.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>Ordered Preparation Steps (Inspect Before Modifying Code)</span>
          </div>

          <div className="space-y-3">
            {skill_gap_pathway.map((item, idx: number) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-4 hover:border-slate-700 transition-colors"
              >
                {/* Step indicator */}
                <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center font-mono font-bold text-sm text-indigo-300 shrink-0">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-white tracking-tight">
                      {item.topic}
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                        item.status === 'ready'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                      }`}
                    >
                      {item.status === 'ready' ? 'Ready' : 'Learning Needed'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {item.why}
                  </p>

                  <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <span className="text-slate-500">Suggested resource:</span>
                    <span className="text-indigo-300">{item.suggested_resource}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
