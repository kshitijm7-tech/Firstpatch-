/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ValidatedRelationshipEdge, ValidatedRelationshipNode } from '../../schema.js';
import { ArrowRight, Code2, FileCode, GitPullRequest, Link2, Network, ShieldCheck } from 'lucide-react';

interface RelationshipGraphProps {
  nodes: ValidatedRelationshipNode[];
  edges: ValidatedRelationshipEdge[];
  selectedId: string | null;
  onSelectNode: (node: ValidatedRelationshipNode) => void;
  onSelectEdge: (edge: ValidatedRelationshipEdge) => void;
  /** True only when the optional Graphify service supplied this relationship map. */
  graphifyAvailable?: boolean;
}

const nodeTypeLabel: Record<ValidatedRelationshipNode['type'], string> = {
  issue: 'Issue',
  repository: 'Repository',
  file: 'File',
  symbol: 'Symbol',
  module: 'Module',
  test: 'Test',
};

const edgeTypeLabel: Record<ValidatedRelationshipEdge['type'], string> = {
  mentioned_in_issue: 'Mentioned in issue',
  contains_matching_symbol: 'Contains matching symbol',
  imports_or_calls: 'Imports or calls',
  potentially_related: 'Potentially related',
};

const statusLabel = (status: ValidatedRelationshipEdge['status']) =>
  status === 'verified' ? 'Verified' : status === 'ai_hypothesis' ? 'Hypothesis' : 'Unverified';

const NodeIcon: React.FC<{ type: ValidatedRelationshipNode['type'] }> = ({ type }) => {
  if (type === 'issue') return <GitPullRequest className="h-3.5 w-3.5" aria-hidden="true" />;
  if (type === 'file') return <FileCode className="h-3.5 w-3.5" aria-hidden="true" />;
  return <Code2 className="h-3.5 w-3.5" aria-hidden="true" />;
};

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  nodes,
  edges,
  selectedId,
  onSelectNode,
  onSelectEdge,
  graphifyAvailable = false,
}) => {
  const issueNode = nodes.find((node) => node.type === 'issue');
  const visibleNodes = nodes.filter((node) => node.type !== 'issue');
  const hasGraph = Boolean(issueNode || visibleNodes.length || edges.length);

  return (
    <section className="flex min-h-[420px] flex-col rounded-xl border border-slate-800 bg-slate-950/80 p-4" aria-labelledby="relationship-map-title">
      <div className="mb-4 flex flex-col gap-3 border-b border-slate-800/80 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            <h3 id="relationship-map-title" className="text-xs font-bold uppercase tracking-wider text-white">
              Issue-to-code relationship map
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {nodes.length} nodes · {edges.length} relationships · select a row to inspect evidence
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
          graphifyAvailable
            ? 'border-cyan-800/70 bg-cyan-950/50 text-cyan-300'
            : hasGraph
            ? 'border-amber-800/70 bg-amber-950/40 text-amber-300'
            : 'border-slate-700 bg-slate-900 text-slate-400'
        }`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
          {graphifyAvailable ? 'Graphify native' : hasGraph ? 'Local fallback · partial' : 'No graph data'}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 text-[10px] text-slate-400" aria-label="Relationship map legend">
        <span className="inline-flex items-center gap-1 rounded border border-emerald-900/70 bg-emerald-950/30 px-2 py-1 text-emerald-300"><ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified source</span>
        <span className="inline-flex items-center gap-1 rounded border border-indigo-900/70 bg-indigo-950/30 px-2 py-1 text-indigo-300"><Link2 className="h-3 w-3" aria-hidden="true" /> Hypothesis / unverified</span>
      </div>

      {!hasGraph ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
          <Network className="mb-3 h-8 w-8 text-slate-600" aria-hidden="true" />
          <h4 className="text-sm font-semibold text-slate-200">No relationships mapped yet</h4>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">The readable evidence and candidate-file list remain available alongside this empty graph.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto" role="list" aria-label="Relationship map items">
          {issueNode && (
            <button
              type="button"
              role="listitem"
              onClick={() => onSelectNode(issueNode)}
              aria-pressed={selectedId === issueNode.id}
              className={`w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${selectedId === issueNode.id ? 'border-indigo-500 bg-indigo-950/70' : 'border-indigo-800/60 bg-slate-900 hover:border-indigo-500/70'}`}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-indigo-300"><NodeIcon type={issueNode.type} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate font-mono text-xs font-bold text-white">{issueNode.label}</span><span className="mt-1 block text-[10px] uppercase tracking-wide text-indigo-300">Issue · root</span>{issueNode.subtext && <span className="mt-1 block text-xs text-slate-400">{issueNode.subtext}</span>}</span>
                <span className="rounded border border-indigo-800 bg-indigo-950 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">ROOT</span>
              </div>
            </button>
          )}

          {edges.length > 0 && <div className="hidden items-center gap-2 px-2 text-[10px] uppercase tracking-wider text-slate-600 sm:flex"><span className="h-px flex-1 bg-slate-800" /> relationships <span className="h-px flex-1 bg-slate-800" /></div>}

          {edges.map((edge) => {
            const verified = edge.status === 'verified';
            return (
              <button
                type="button"
                role="listitem"
                key={edge.id}
                onClick={() => onSelectEdge(edge)}
                aria-pressed={selectedId === edge.id}
                className={`w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${selectedId === edge.id ? 'border-indigo-500 bg-slate-800' : verified ? 'border-emerald-900/70 bg-slate-900 hover:border-emerald-700' : 'border-dashed border-slate-700 bg-slate-900/60 hover:border-indigo-700'}`}
              >
                <div className="flex items-start gap-2">
                  <ArrowRight className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${verified ? 'text-emerald-400' : 'text-indigo-400'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-200">{edge.label}</span><span className="mt-1 block truncate font-mono text-[10px] text-slate-500">{edge.from} → {edge.to}</span><span className="mt-2 inline-flex flex-wrap items-center gap-1.5"><span className="rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">{edgeTypeLabel[edge.type]}</span><span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${verified ? 'bg-emerald-950 text-emerald-300' : 'bg-indigo-950 text-indigo-300'}`}>{statusLabel(edge.status)}</span></span></span>
                </div>
              </button>
            );
          })}

          {visibleNodes.map((node) => (
            <button type="button" role="listitem" key={node.id} onClick={() => onSelectNode(node)} aria-pressed={selectedId === node.id} className={`w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${selectedId === node.id ? 'border-indigo-500 bg-slate-800' : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'}`}>
              <div className="flex items-start gap-2"><span className="mt-0.5 text-amber-400"><NodeIcon type={node.type} /></span><span className="min-w-0 flex-1"><span className="block truncate font-mono text-xs font-semibold text-white">{node.label}</span><span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-500">{nodeTypeLabel[node.type]}{node.status ? ` · ${node.status}` : ''}</span>{node.subtext && <span className="mt-1 block truncate text-[11px] text-slate-500">{node.subtext}</span>}</span></div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 border-t border-slate-800/80 pt-3 text-center text-[11px] text-slate-500">Every hypothesis is labeled so you can distinguish an AI lead from verified repository evidence.</p>
    </section>
  );
};
