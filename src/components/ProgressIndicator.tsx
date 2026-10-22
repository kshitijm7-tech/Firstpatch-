/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, GitBranch, Shield, Sparkles, FileSearch } from 'lucide-react';

interface ProgressIndicatorProps {
  isLoading: boolean;
}

const STAGES = [
  {
    id: 1,
    title: 'Validating Issue URL',
    desc: 'Verifying protocol, hostname, credentials, and parameters',
    icon: Shield,
    durationMs: 700,
  },
  {
    id: 2,
    title: 'Fetching GitHub Context',
    desc: 'Retrieving issue metadata, comments, and repository specs',
    icon: GitBranch,
    durationMs: 2500,
  },
  {
    id: 3,
    title: 'Scanning File Tree & Candidates',
    desc: 'Scoring source files and extracting bounded context',
    icon: FileSearch,
    durationMs: 3000,
  },
  {
    id: 4,
    title: 'Gemma Model Reasoning',
    desc: 'Generating structured hypothesis, plan, and tests',
    icon: Sparkles,
    durationMs: 5000,
  },
  {
    id: 5,
    title: 'Server-Side Evidence Validation',
    desc: 'Grounding fact excerpts and checking tree completeness',
    icon: CheckCircle2,
    durationMs: 1500,
  },
];

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ isLoading }) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setCurrentStageIndex(0);
      return;
    }

    let accumulatedTime = 0;
    const timeouts: NodeJS.Timeout[] = [];

    STAGES.forEach((stage, idx) => {
      accumulatedTime += stage.durationMs;
      // Don't advance past stage 4 until server response finishes
      if (idx < STAGES.length - 1) {
        const t = setTimeout(() => {
          setCurrentStageIndex(idx + 1);
        }, accumulatedTime);
        timeouts.push(t);
      }
    });

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="w-full max-w-2xl mx-auto my-12 p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
        <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
        <div>
          <h2 className="text-base font-semibold text-white">
            Analyzing Issue & Repository Context
          </h2>
          <p className="text-xs text-slate-400">
            Pipeline running bounded GitHub reads and server-side model grounding
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentStageIndex;
          const isCurrent = idx === currentStageIndex;
          const IconComponent = stage.icon;

          return (
            <div
              key={stage.id}
              className={`flex items-start gap-4 p-3 rounded-lg transition-all ${
                isCurrent
                  ? 'bg-indigo-950/40 border border-indigo-800/60'
                  : isDone
                  ? 'bg-slate-950/40 border border-slate-800/40 opacity-70'
                  : 'opacity-40'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                ) : (
                  <IconComponent className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm font-medium ${
                      isCurrent ? 'text-white' : isDone ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {stage.title}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Step {stage.id} of {STAGES.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
