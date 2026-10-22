/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GitHubContext } from './github.js';
import type {
  AnalysisMeta,
  FileExistenceStatus,
  GroundingStatus,
  RawModelGuide,
  SourceRegistryItem,
  ValidatedFact,
  ValidatedFile,
  ValidatedGuide,
  ValidatedTest,
} from './schema.js';

/**
 * Normalizes text for lenient yet robust excerpt containment matching:
 * trims, collapses multiple spaces and newlines, and converts to lowercase.
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[\t ]+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Validates whether an excerpt is genuinely contained in the source content.
 */
export function verifyExcerptInSource(
  excerpt: string,
  sourceContent: string
): boolean {
  if (!excerpt || !sourceContent) return false;

  const normExcerpt = normalizeText(excerpt);
  const normSource = normalizeText(sourceContent);

  if (normSource.includes(normExcerpt)) {
    return true;
  }

  // Also check without punctuation for minor quotes / markdown differences
  const stripPunct = (s: string) => s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, '');
  const cleanExcerpt = stripPunct(normExcerpt).replace(/\s+/g, ' ').trim();
  const cleanSource = stripPunct(normSource).replace(/\s+/g, ' ').trim();

  if (cleanExcerpt.length >= 10 && cleanSource.includes(cleanExcerpt)) {
    return true;
  }

  return false;
}

/**
 * Normalizes and checks safety of repository file paths.
 * Rejects traversal (..), absolute paths, and malformed characters.
 */
export function sanitizeFilePath(rawPath: string): {
  normalizedPath: string;
  isValid: boolean;
  reason?: string;
} {
  if (!rawPath || typeof rawPath !== 'string') {
    return { normalizedPath: '', isValid: false, reason: 'Empty path' };
  }

  const clean = rawPath.trim().replace(/\\/g, '/');

  // Check for path traversal attempts
  if (clean.includes('..') || clean.startsWith('/') || clean.startsWith('~')) {
    return {
      normalizedPath: clean,
      isValid: false,
      reason: 'Absolute paths and traversal segments (..) are prohibited',
    };
  }

  // Strip leading ./
  const stripped = clean.replace(/^\.\//, '');

  // Basic sanity check on allowed path characters
  if (!/^[a-zA-Z0-9_.\-/@]+$/.test(stripped)) {
    return {
      normalizedPath: stripped,
      isValid: false,
      reason: 'Path contains prohibited characters',
    };
  }

  return { normalizedPath: stripped, isValid: true };
}

/**
 * Validates the raw model guide against real GitHub context and source registry.
 */
export function validateGuide(
  rawGuide: RawModelGuide,
  context: GitHubContext,
  modelId: string,
  graphifyUsed = false
): { guide: ValidatedGuide; meta: AnalysisMeta } {
  const warnings = [...context.warnings];
  const sourceMap = new Map<string, SourceRegistryItem>();
  for (const s of context.sources) {
    sourceMap.set(s.id, s);
  }

  // 1. Validate Verified Facts
  const validatedFacts: ValidatedFact[] = (rawGuide.verified_facts || []).map((fact) => {
    const source = sourceMap.get(fact.source_id);

    if (!source) {
      return {
        claim: fact.claim,
        source_id: fact.source_id,
        supporting_excerpt: fact.supporting_excerpt,
        source_url: null,
        source_type: 'unknown',
        grounding_status: 'unverified_unknown_source' as GroundingStatus,
        grounding_reason: `Source ID "${fact.source_id}" was not found in the verified server source registry.`,
      };
    }

    const excerptMatches = verifyExcerptInSource(
      fact.supporting_excerpt,
      source.content
    );

    if (!excerptMatches) {
      return {
        claim: fact.claim,
        source_id: fact.source_id,
        supporting_excerpt: fact.supporting_excerpt,
        source_url: source.url,
        source_type: source.type,
        grounding_status: 'unverified_excerpt_not_found' as GroundingStatus,
        grounding_reason: 'Supporting excerpt could not be verified in the source text.',
      };
    }

    return {
      claim: fact.claim,
      source_id: fact.source_id,
      supporting_excerpt: fact.supporting_excerpt,
      source_url: source.url,
      source_type: source.type,
      grounding_status: 'verified' as GroundingStatus,
    };
  });

  const ungroundedCount = validatedFacts.filter((f) => f.grounding_status !== 'verified').length;
  if (ungroundedCount > 0) {
    warnings.push(`${ungroundedCount} fact(s) could not be verified against retrieved GitHub sources.`);
  }

  // 2. Validate Relevant Files
  const treeSet = new Set(context.tree.paths.map((p) => p.toLowerCase()));
  const branch = context.repository.default_branch || 'main';

  const validatedFiles: ValidatedFile[] = (rawGuide.relevant_files || []).map((item) => {
    const { normalizedPath, isValid, reason } = sanitizeFilePath(item.path);

    if (!isValid) {
      return {
        path: item.path,
        why: item.why,
        status: 'invalid_path' as FileExistenceStatus,
        url: null,
      };
    }

    const lowerPath = normalizedPath.toLowerCase();
    const isPresent = treeSet.has(lowerPath);

    let status: FileExistenceStatus;
    if (isPresent) {
      status = 'exists';
    } else if (context.tree.isComplete) {
      status = 'not_found_in_complete_tree';
    } else {
      status = 'not_checked';
    }

    const fileUrl = status === 'exists'
      ? `https://github.com/${context.repository.owner}/${context.repository.repo}/blob/${branch}/${normalizedPath}`
      : null;

    return {
      path: normalizedPath,
      why: item.why,
      status,
      url: fileUrl,
    };
  });

  // 3. Validate Tests: strictly enforce status = "not_run"
  const validatedTests: ValidatedTest[] = (rawGuide.tests || []).map((t) => ({
    description: t.description,
    command: t.command,
    status: 'not_run' as const,
  }));

  // Construct meta object
  const meta: AnalysisMeta = {
    configured_model: modelId,
    timestamp: new Date().toISOString(),
    sources_fetched: context.sources.map((s) => ({
      id: s.id,
      type: s.type,
      label: s.label,
      url: s.url,
      length: s.length,
      truncated: s.truncated,
    })),
    tree_complete: context.tree.isComplete,
    tree_entries_count: context.tree.totalEntries,
    truncation_flags: context.truncationFlags,
    graphify_used: graphifyUsed,
    warnings,
  };

  const validatedGuide: ValidatedGuide = {
    issue_summary: rawGuide.issue_summary,
    difficulty: rawGuide.difficulty,
    difficulty_reason: rawGuide.difficulty_reason,
    verified_facts: validatedFacts,
    relevant_files: validatedFiles,
    ai_suggestions: rawGuide.ai_suggestions || [],
    contribution_plan: rawGuide.contribution_plan || [],
    tests: validatedTests,
    open_questions: rawGuide.open_questions || [],
    risks: rawGuide.risks || [],
  };

  return { guide: validatedGuide, meta };
}
