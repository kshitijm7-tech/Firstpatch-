/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  ValidatedCandidateFile,
  ValidatedRelationshipEdge,
  ValidatedRelationshipNode,
} from '../../schema.js';
import {
  FileCode,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  CheckCircle2,
  Terminal,
  Layers,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface EvidenceDrawerProps {
  selectedFile: ValidatedCandidateFile | null;
  selectedEdge: ValidatedRelationshipEdge | null;
  selectedNode: ValidatedRelationshipNode | null;
  investigationPlan: {
    inspect_first: string;
    code_path_to_follow: string;
    project_conventions: string;
    tests_to_inspect: string;
    potential_breakages: string;
    human_investigation_questions: string[];
  };
  onClearSelection: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({
  selectedFile,
  selectedEdge,
  selectedNode,
  investigationPlan,
  onClearSelection,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyExcerpt = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
      {/* Drawer Header */}
      <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            Evidence Drawer & Investigation Plan
          </h3>
        </div>
        {(selectedFile || selectedEdge || selectedNode) && (
          <button
            onClick={onClearSelection}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 transition-colors"
          >
            Clear Target
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ACTIVE EVIDENCE INSPECTION CARD */}
        {selectedFile && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/30 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="font-mono text-xs font-bold text-white break-all">
                  {selectedFile.path}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold shrink-0 ${
                  selectedFile.evidence_status === 'verified'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                    : selectedFile.evidence_status === 'partial'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                    : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                }`}
              >
                {selectedFile.evidence_status.toUpperCase()} EVIDENCE
              </span>
            </div>

            {/* Line Numbers and verified URL */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {selectedFile.line_numbers ? (
                <span className="font-mono text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
                  Lines {selectedFile.line_numbers.startLine}–{selectedFile.line_numbers.endLine}
                </span>
              ) : (
                <span className="font-mono text-slate-400 text-[11px]">
                  Status: {selectedFile.status}
                </span>
              )}

              {selectedFile.url && (
                <a
                  href={selectedFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-mono text-xs text-indigo-400 hover:text-indigo-300 ml-auto"
                >
                  <span>Open on GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Why this evidence matters */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Why this evidence matters:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedFile.why_it_matters}
              </p>
            </div>

            {/* Supporting Excerpt */}
            {selectedFile.supporting_excerpt && (
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    Source Excerpt:
                  </span>
                  <button
                    onClick={() => handleCopyExcerpt(selectedFile.supporting_excerpt)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {selectedFile.supporting_excerpt}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Selected Edge Inspection */}
        {selectedEdge && !selectedFile && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">
                Relationship: {selectedEdge.label}
              </span>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold ${
                  selectedEdge.status === 'verified'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {selectedEdge.status.toUpperCase()}
              </span>
            </div>

            <p className="text-xs text-slate-300">
              {selectedEdge.why}
            </p>

            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
              <span>{selectedEdge.from}</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedEdge.to}</span>
            </div>

            {selectedEdge.source_url && (
              <a
                href={selectedEdge.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-indigo-400 hover:text-indigo-300"
              >
                <span>View Source Reference</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Selected Node Inspection */}
        {selectedNode && !selectedFile && !selectedEdge && (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-indigo-500/30 space-y-2">
            <span className="text-xs font-bold text-white font-mono">
              Node: {selectedNode.label} ({selectedNode.type})
            </span>
            {selectedNode.subtext && (
              <p className="text-xs text-slate-300">
                {selectedNode.subtext}
              </p>
            )}
            {selectedNode.url && (
              <a
                href={selectedNode.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-indigo-400 hover:text-indigo-300 pt-1"
              >
                <span>Open Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* PRIORITIZED 6-FACET INVESTIGATION PLAN */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Prioritized Investigation Trail
            </h4>
          </div>

          <div className="space-y-3 text-xs">
            {/* 1. What to inspect first */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide block">
                1. Inspect First
              </span>
              <p className="text-slate-300 leading-relaxed">
                {investigationPlan.inspect_first}
              </p>
            </div>

            {/* 2. Code path to follow */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wide block">
                2. Execution Path to Trace
              </span>
              <p className="text-slate-300 leading-relaxed">
                {investigationPlan.code_path_to_follow}
              </p>
            </div>

            {/* 3. Project conventions */}
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide block">
                3. Project Conventions to Check
              </span>
              <p className="text-slate-300 leading-relaxed">
                {investigationPlan.project_conventions}
              </p>
            </div>

            {/* 4. Tests to inspect (marked NOT RUN) */}
            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                  4. Tests to Inspect (NOT RUN)
                </span>
                <span className="text-[10px] font-mono text-amber-500 font-bold">
                  UNEXECUTED
                </span>
              </div>
              <p className="text-amber-200/90 leading-relaxed">
                {investigationPlan.tests_to_inspect}
              </p>
            </div>

            {/* 5. Potential breakages / likely impact */}
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/50 space-y-1">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wide block">
                5. Likely Impact & Regression Risks
              </span>
              <p className="text-rose-200/90 leading-relaxed">
                {investigationPlan.potential_breakages}
              </p>
            </div>

            {/* 6. Human investigation questions */}
            {investigationPlan.human_investigation_questions.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide block">
                  6. Questions Requiring Human Investigation
                </span>
                <ul className="list-disc pl-4 space-y-1 text-slate-300">
                  {investigationPlan.human_investigation_questions.map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
