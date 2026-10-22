/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ValidatedRelationshipEdge, ValidatedRelationshipNode } from '../../schema.js';
import { GitPullRequest, FileCode, Code2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface RelationshipGraphProps {
  nodes: ValidatedRelationshipNode[];
  edges: ValidatedRelationshipEdge[];
  selectedId: string | null;
  onSelectNode: (node: ValidatedRelationshipNode) => void;
  onSelectEdge: (edge: ValidatedRelationshipEdge) => void;
}

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  nodes,
  edges,
  selectedId,
  onSelectNode,
  onSelectEdge,
}) => {
  const issueNode = nodes.find((n) => n.type === 'issue') || nodes[0];
  const fileNodes = nodes.filter((n) => n.type === 'file');
  const symbolNodes = nodes.filter((n) => n.type === 'symbol' || n.type === 'module');

  return (
    <div className="flex flex-col h-full bg-slate-950/80 rounded-xl border border-slate-800 p-4 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Issue-to-Code Relationship Map
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-0.5 bg-emerald-500 rounded-full" />
            Verified Source
          </span>
          <span className="flex items-center gap-1.5 text-indigo-400">
            <span className="w-2.5 h-0.5 bg-indigo-500 border-b border-dashed border-indigo-400" />
            AI Hypothesis
          </span>
        </div>
      </div>

      {/* Compact Interactive Node Map */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-between gap-6 py-4 overflow-x-auto">
        {/* Left Column: Root Issue Node */}
        {issueNode && (
          <div className="w-full md:w-56 shrink-0 flex flex-col items-center">
            <button
              onClick={() => onSelectNode(issueNode)}
              className={`w-full text-left p-3.5 rounded-xl transition-all border ${
                selectedId === issueNode.id
                  ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-950'
                  : 'bg-slate-900 hover:bg-slate-800/90 border-indigo-500/40 hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
                  {issueNode.label}
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                  ROOT
                </span>
              </div>
              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                {issueNode.subtext || 'Reported Issue Root'}
              </p>
            </button>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Origin Issue</span>
          </div>
        )}

        {/* Middle Connectors & Edges List */}
        <div className="flex-1 flex flex-col gap-2.5 w-full min-w-[200px]">
          {edges.map((edge) => {
            const isSelected = selectedId === edge.id;
            const isVerified = edge.status === 'verified';

            return (
              <button
                key={edge.id}
                onClick={() => onSelectEdge(edge)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all text-xs flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                    : isVerified
                    ? 'bg-slate-900/90 hover:bg-slate-800/80 border-emerald-900/60'
                    : 'bg-slate-900/50 hover:bg-slate-800/60 border-slate-800 border-dashed'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isVerified ? 'bg-emerald-400' : 'bg-indigo-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-200 block truncate">
                      {edge.label}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">
                      {edge.from === 'issue' ? 'Issue' : edge.from} → {edge.to.split('/').pop()}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold ${
                      isVerified
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isVerified ? 'VERIFIED' : 'HYPOTHESIS'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Candidate File Nodes */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2.5">
          {fileNodes.map((fn) => {
            const isSelected = selectedId === fn.id;
            const isExists = fn.status === 'exists';

            return (
              <button
                key={fn.id}
                onClick={() => onSelectNode(fn)}
                className={`w-full text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/30 shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="font-mono text-xs font-semibold text-white truncate">
                      {fn.label}
                    </span>
                  </div>
                  {isExists ? (
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">
                      EXISTS
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-amber-400 font-bold">
                      PARTIAL
                    </span>
                  )}
                </div>

                {fn.subtext && (
                  <p className="text-[11px] font-mono text-slate-500 truncate mt-1">
                    {fn.subtext}
                  </p>
                )}
              </button>
            );
          })}

          {/* Any Symbol nodes */}
          {symbolNodes.map((sn) => {
            const isSelected = selectedId === sn.id;
            return (
              <button
                key={sn.id}
                onClick={() => onSelectNode(sn)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-slate-800 border-indigo-500'
                    : 'bg-slate-900/60 hover:bg-slate-800/60 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono text-xs text-amber-300 truncate">
                    {sn.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
        Click any node or relationship link to inspect evidence, line numbers, and impact details in the Evidence Drawer.
      </div>
    </div>
  );
};
