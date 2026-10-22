/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GitHubContext } from './github.js';
import type {
  BoundedGraph,
  GraphEdge,
  GraphEvidence,
  GraphNode,
  GraphNodeType,
} from './schema.js';

/** Compatibility shape retained for existing server consumers. */
export interface GraphifyRelationship {
  source: string;
  target: string;
  type: 'imports' | 'calls' | 'extends' | 'references';
}

export interface GraphifyCodebaseContext {
  summary: string;
  relatedPaths: string[];
  relationships?: GraphifyRelationship[];
  isAvailable: boolean;
  status?: 'available' | 'partial' | 'unavailable';
  graph?: BoundedGraph;
  warnings?: string[];
}

export interface GraphifyAnalysisResult extends GraphifyCodebaseContext {
  graph: BoundedGraph;
}

const GRAPHIFY_TIMEOUT_MS = 2500;
const MAX_NODES = 120;
const MAX_EDGES = 240;
const MAX_EVIDENCE = 3;
const MAX_TEXT = 240;

function evidence(sourceId: string, content: string, match?: RegExpMatchArray): GraphEvidence {
  const excerpt = (match?.[0] || content).replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT);
  const before = match?.index === undefined ? '' : content.slice(0, match.index);
  const line = before ? before.split('\n').length : 1;
  return { sourceId, excerpt, lineStart: line, lineEnd: line };
}

function addNode(nodes: Map<string, GraphNode>, id: string, type: GraphNodeType, label: string, path?: string) {
  if (!nodes.has(id) && nodes.size < MAX_NODES) nodes.set(id, { id, type, label, ...(path ? { path } : {}) });
  return nodes.get(id);
}

function addEdge(edges: Map<string, GraphEdge>, from: string, to: string, type: GraphEdge['type'], ev: GraphEvidence) {
  if (edges.size >= MAX_EDGES || !from || !to || from === to) return;
  const id = `${type}:${from}->${to}`;
  const existing = edges.get(id);
  if (existing) {
    if (existing.evidence.length < MAX_EVIDENCE) existing.evidence.push(ev);
    return;
  }
  edges.set(id, { id, from, to, type, evidence: [ev] });
}

function sourcePath(source: { id: string; label: string }): string | undefined {
  if (source.label && /\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|php|cs|cpp?|h)$/.test(source.label)) return source.label.replace(/^\.\//, '');
  const match = source.id.match(/^src_file_(.+)$/);
  return match?.[1]?.replace(/_/g, '/') || undefined;
}

function resolveImport(from: string, specifier: string, paths: Set<string>): string | undefined {
  if (!specifier.startsWith('.')) return undefined;
  const base = from.split('/').slice(0, -1).join('/');
  const raw = `${base}/${specifier}`.replace(/\/+/g, '/');
  const normalized: string[] = [];
  for (const part of raw.split('/')) {
    if (part === '..') normalized.pop(); else if (part !== '.') normalized.push(part);
  }
  const candidate = normalized.join('/');
  return [candidate, ...['.ts', '.tsx', '.js', '.jsx', '.py'].map((ext) => `${candidate}${ext}`), ...['index.ts', 'index.js'].map((name) => `${candidate}/${name}`)]
    .find((path) => paths.has(path));
}

/** Deterministic local analysis. It only reads retrieved source registry text. */
export function buildLocalGraph(context: GitHubContext): BoundedGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const warnings = [...context.warnings];
  const issueId = `issue:${context.issue.number}`;
  const repoId = `repository:${context.repository.owner}/${context.repository.repo}`;
  addNode(nodes, issueId, 'issue', `Issue #${context.issue.number}`);
  addNode(nodes, repoId, 'repository', `${context.repository.owner}/${context.repository.repo}`);
  addEdge(edges, repoId, issueId, 'contains', { sourceId: `issue:${context.issue.number}`, excerpt: context.issue.title.slice(0, MAX_TEXT) });

  const sourceFiles = context.sources.map((source) => ({ source, path: sourcePath(source) })).filter((x): x is { source: typeof x.source; path: string } => Boolean(x.path));
  // Include fetched candidate files even when a truncated tree did not
  // contain their paths. Their presence is still bounded by the source
  // registry and is not treated as proof that the complete repository tree
  // contains anything else.
  const paths = new Set([
    ...context.tree.paths.map((p) => p.replace(/^\.\//, '')),
    ...sourceFiles.map((x) => x.path),
  ]);
  const allText = context.sources.filter((s) => s.type === 'issue_body' || s.type === 'issue_comment');
  for (const path of [...paths].sort()) {
    const source = sourceFiles.find((x) => x.path === path)?.source;
    const fileId = `file:${path}`;
    addNode(nodes, fileId, 'file', path, path);
    addEdge(edges, repoId, fileId, 'contains', source ? evidence(source.id, source.content) : { sourceId: 'tree', excerpt: path });
    if (!source) continue;
    const text = source.content;
    const symbolMatches = [...text.matchAll(/\b(?:(?:function|class)\s+|(?:const|let|var)\s+)([A-Za-z_$][\w$]*)/g)].slice(0, 8);
    for (const match of symbolMatches) {
      const symbol = match[1];
      const symbolId = `symbol:${path}#${symbol}`;
      addNode(nodes, symbolId, 'symbol', symbol);
      addEdge(edges, fileId, symbolId, 'contains', evidence(source.id, text, match));
    }
    const imports = [...text.matchAll(/(?:import\s+(?:[^'";]+?\s+from\s+)?|require\s*\(|from\s+|import\s+)(['"])([^'"]+)\1/g)];
    for (const match of imports) {
      const target = resolveImport(path, match[2], paths);
      if (!target) continue;
      const targetId = `file:${target}`;
      addNode(nodes, targetId, 'file', target, target);
      addEdge(edges, fileId, targetId, match[0].trim().startsWith('require') ? 'requires' : 'imports', evidence(source.id, text, match));
    }
  }

  for (const source of allText) {
    for (const match of source.content.matchAll(/(?:`|\b)((?:[\w.-]+\/)*[\w.-]+\.(?:[cm]?[jt]sx?|py|rb|go|rs|java|kt|php|cs))(?=`|\b)/g)) {
      const path = match[1].replace(/^\.\//, '');
      if (!paths.has(path)) continue;
      addEdge(edges, issueId, `file:${path}`, 'mentions', evidence(source.id, source.content, match));
    }
  }

  const sourceByPath = new Map(sourceFiles.map((x) => [x.path, x.source]));
  for (const [path, source] of sourceByPath) {
    if (!/(^|\/)(test|tests|__tests__|spec|specs)(\/|\.)|\.(test|spec)\./i.test(path)) continue;
    const testId = `test:${path}`;
    addNode(nodes, testId, 'test', path, path);
    addEdge(edges, repoId, testId, 'contains', evidence(source.id, source.content));
    for (const match of source.content.matchAll(/(?:import\s+[^'";]+?from\s+|require\s*\(|describe\s*\(|it\s*\()["']([^"']+)["']/g)) {
      const target = resolveImport(path, match[1], paths);
      if (target) addEdge(edges, testId, `file:${target}`, 'tests', evidence(source.id, source.content, match));
    }
  }

  const status = context.sources.length === 0 ? 'unavailable' : (context.tree.isComplete ? 'available' : 'partial');
  if (!context.tree.isComplete) warnings.push('Repository tree is incomplete; graph is partial.');
  return { nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)), edges: [...edges.values()].sort((a, b) => a.id.localeCompare(b.id)), status, warnings: [...new Set(warnings)] };
}

function normalizeExternal(value: unknown): GraphifyAnalysisResult | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const graph = data.graph as Partial<BoundedGraph> | undefined;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return null;
  const nodeTypes = new Set(['issue', 'repository', 'file', 'module', 'symbol', 'test']);
  const safePath = (path: unknown): path is string => typeof path === 'string' && path.length <= 500 && !path.startsWith('/') && !path.split('/').includes('..');
  const nodes = graph.nodes.filter((n): n is GraphNode => Boolean(
    n && typeof n === 'object' && typeof (n as GraphNode).id === 'string' && (n as GraphNode).id.length <= 500 &&
    nodeTypes.has((n as GraphNode).type) && typeof (n as GraphNode).label === 'string' && (n as GraphNode).label.length <= MAX_TEXT &&
    (!(n as GraphNode).path || safePath((n as GraphNode).path))
  )).slice(0, MAX_NODES).map((n) => ({ ...n, evidence: Array.isArray(n.evidence) ? n.evidence.filter((e) => e && typeof e.sourceId === 'string' && typeof e.excerpt === 'string').slice(0, MAX_EVIDENCE) : [] }));
  const ids = new Set(nodes.map((n) => n.id));
  const edgeTypes = new Set(['mentions', 'contains', 'imports', 'requires', 'references', 'tests']);
  const edges = graph.edges.filter((e): e is GraphEdge => Boolean(
    e && typeof e === 'object' && typeof (e as GraphEdge).from === 'string' && typeof (e as GraphEdge).to === 'string' &&
    ids.has((e as GraphEdge).from) && ids.has((e as GraphEdge).to) && edgeTypes.has((e as GraphEdge).type) && Array.isArray((e as GraphEdge).evidence)
  )).slice(0, MAX_EDGES).map((e) => ({ ...e, evidence: e.evidence.filter((item) => item && typeof item.sourceId === 'string' && typeof item.excerpt === 'string').slice(0, MAX_EVIDENCE) }));
  if (!nodes.length) return null;
  const bounded: BoundedGraph = { nodes, edges, status: graph.status === 'partial' ? 'partial' : 'available', warnings: Array.isArray(graph.warnings) ? graph.warnings.filter((w): w is string => typeof w === 'string').slice(0, 20) : [] };
  return { summary: typeof data.summary === 'string' ? data.summary.slice(0, MAX_TEXT) : 'External graph available.', relatedPaths: nodes.flatMap((n) => n.path ? [n.path] : []).slice(0, 40), relationships: [], isAvailable: true, status: bounded.status, graph: bounded, warnings: bounded.warnings };
}

/** Optional remote Graphify adapter; malformed or timed-out responses return null. */
export async function getCodebaseContext(owner: string, repo: string): Promise<null | GraphifyCodebaseContext> {
  const endpoint = process.env.GRAPHIFY_ENDPOINT?.trim();
  if (!endpoint || process.env.GRAPHIFY_ENABLED !== 'true') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GRAPHIFY_TIMEOUT_MS);
  try {
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/context?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return normalizeExternal(await res.json());
  } catch { return null; } finally { clearTimeout(timer); }
}

/** Local fallback entry point used by callers that already fetched GitHubContext. */
export function getLocalCodebaseContext(context: GitHubContext): GraphifyAnalysisResult {
  const graph = buildLocalGraph(context);
  return { summary: `${graph.nodes.length} nodes and ${graph.edges.length} evidence-backed relationships`, relatedPaths: graph.nodes.flatMap((n) => n.path ? [n.path] : []), relationships: graph.edges.filter((e) => e.type === 'imports' || e.type === 'requires').map((e) => ({ source: e.from, target: e.to, type: e.type === 'imports' ? 'imports' : 'references' })), isAvailable: graph.status !== 'unavailable', status: graph.status, graph, warnings: graph.warnings };
}
