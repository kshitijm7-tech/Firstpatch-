/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import type {
  ValidatedCandidateFile,
  ValidatedImpactTrail,
  ValidatedRelationshipEdge,
  ValidatedRelationshipNode,
} from '../../schema.js';
import { RelationshipGraph } from './RelationshipGraph.js';
import { EvidenceDrawer } from './EvidenceDrawer.js';
import {
  FileCode,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  GitBranch,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ListFilter,
  Layers,
} from 'lucide-react';

interface ImpactTrailViewProps {
  trail: ValidatedImpactTrail;
  issueTitle: string;
  issueNumber: number;
  /** Optional provenance supplied by a caller that has Graphify metadata. */
  graphifyAvailable?: boolean;
}

export const ImpactTrailView: React.FC<ImpactTrailViewProps> = ({
  trail,
  issueTitle,
  issueNumber,
  graphifyAvailable = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<ValidatedCandidateFile | null>(
    trail.candidate_files[0] || null
  );
  const [selectedEdge, setSelectedEdge] = useState<ValidatedRelationshipEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<ValidatedRelationshipNode | null>(null);

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'left' | 'center' | 'right'>('left');

  const handleSelectFile = (file: ValidatedCandidateFile) => {
    setSelectedFile(file);
    setSelectedEdge(null);
    setSelectedNode(null);
    setMobileTab('right');
  };

  const handleSelectNode = (node: ValidatedRelationshipNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    // If it corresponds to a candidate file, link it
    const matchingFile = trail.candidate_files.find((f) => f.path === node.id);
    if (matchingFile) {
      setSelectedFile(matchingFile);
    } else {
      setSelectedFile(null);
    }
    setMobileTab('right');
  };

  const handleSelectEdge = (edge: ValidatedRelationshipEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setSelectedFile(null);
    setMobileTab('right');
  };

  const handleClearSelection = () => {
    setSelectedFile(null);
    setSelectedEdge(null);
    setSelectedNode(null);
  };

  return (
    <div className="space-y-6">
      {/* Feature Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 text-xs font-semibold border border-indigo-800/60">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Evidence-First Architecture</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex flex-wrap items-center gap-2.5">
              <span>Impact Trail</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide align-middle ${graphifyAvailable ? 'border-cyan-800 bg-cyan-950/60 text-cyan-300' : 'border-amber-800 bg-amber-950/50 text-amber-300'}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                {graphifyAvailable ? 'Graphify native' : 'Local fallback'}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Traceable issue-to-code investigation:
              <span className="font-semibold text-white"> Issue requirements</span> →
              <span className="font-semibold text-white"> Candidate code files</span> →
              <span className="font-semibold text-white"> Traceable code evidence</span> →
              <span className="font-semibold text-white"> Likely impact</span> →
              <span className="font-semibold text-white"> Prioritized investigation plan</span>.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Candidate Files</span>
              <span className="font-mono text-sm font-bold text-white">
                {trail.candidate_files.length} of 5
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Relationships</span>
              <span className="font-mono text-sm font-bold text-indigo-400">
                {trail.relationship_graph.edges.length} mapped
              </span>
            </div>
          </div>
        </div>

        {!graphifyAvailable && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-900/60 bg-amber-950/25 px-3 py-2 text-[11px] leading-relaxed text-amber-200/90" role="status">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
            <span><strong className="font-semibold text-amber-300">Graphify context unavailable.</strong> Showing validated local relationships and clearly marked hypotheses; use the evidence drawer to verify each lead.</span>
          </div>
        )}

        {/* Mobile Tab Switcher */}
        <div className="flex md:hidden items-center gap-1 p-1 mt-5 bg-slate-950 rounded-lg border border-slate-800" role="tablist" aria-label="Impact Trail panels">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'left'}
            onClick={() => setMobileTab('left')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mobileTab === 'left' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Requirements & Files
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'center'}
            onClick={() => setMobileTab('center')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mobileTab === 'center' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Relationship Map
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === 'right'}
            onClick={() => setMobileTab('right')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              mobileTab === 'right' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Evidence Drawer
          </button>
        </div>
      </div>

      {/* 3-Column Desktop Grid / Tabbed Mobile View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Issue Requirements & Candidate Files (cols: 4) */}
        <div
          className={`space-y-6 md:col-span-4 ${
            mobileTab === 'left' ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Issue Requirements Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
              <ListFilter className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Issue Requirements Extraction
              </h3>
            </div>

            {/* Reported Problem */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wide block">
                Reported Problem
              </span>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                {trail.requirements.reported_problem}
              </p>
            </div>

            {/* Expected Behavior */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide block">
                Expected Behavior
              </span>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                {trail.requirements.expected_behavior}
              </p>
            </div>

            {/* Constraints */}
            {trail.requirements.constraints.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block">
                  Relevant Constraints
                </span>
                <ul className="text-xs text-slate-300 space-y-1 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 list-disc pl-5">
                  {trail.requirements.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Unanswered Questions */}
            {trail.requirements.unanswered_questions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wide block">
                  Unanswered Questions
                </span>
                <ul className="text-xs text-slate-400 space-y-1 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 list-disc pl-5">
                  {trail.requirements.unanswered_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Candidate Code Files Card */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Candidate Code Files ({trail.candidate_files.length})
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">Max 5</span>
            </div>

            <div className="space-y-2.5">
              {trail.candidate_files.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/60 p-4 text-center text-xs leading-relaxed text-slate-500">
                  No candidate files were verified in the repository snapshot. Requirements and investigation guidance are still available.
                </div>
              ) : trail.candidate_files.map((file, idx) => {
                const isSelected = selectedFile?.path === file.path;
                const isExists = file.status === 'exists';

                return (
                  <button
                    key={file.path}
                    onClick={() => handleSelectFile(file)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30'
                        : 'bg-slate-950 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-white break-all">
                        {file.path}
                      </span>
                      <span
                        className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          file.evidence_status === 'verified'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : 'bg-amber-950 text-amber-400 border border-amber-800/50'
                        }`}
                      >
                        {file.evidence_status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {file.relevance_explanation}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-500">
                      <span>{isExists ? 'Verified in Snapshot' : file.status}</span>
                      <span className="text-indigo-400 flex items-center gap-0.5">
                        Inspect <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Interactive Relationship View (cols: 4) */}
        <div
          className={`space-y-6 md:col-span-4 ${
            mobileTab === 'center' ? 'block' : 'hidden md:block'
          }`}
        >
          <RelationshipGraph
            nodes={trail.relationship_graph.nodes}
            edges={trail.relationship_graph.edges}
            graphifyAvailable={graphifyAvailable}
            selectedId={selectedFile?.path || selectedEdge?.id || selectedNode?.id || null}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
          />
        </div>

        {/* RIGHT COLUMN: Evidence Drawer & Prioritized Plan (cols: 4) */}
        <div
          className={`space-y-6 md:col-span-4 ${
            mobileTab === 'right' ? 'block' : 'hidden md:block'
          }`}
        >
          <EvidenceDrawer
            selectedFile={selectedFile}
            selectedEdge={selectedEdge}
            selectedNode={selectedNode}
            investigationPlan={trail.investigation_plan}
            onClearSelection={handleClearSelection}
          />
        </div>
      </div>
    </div>
  );
};
