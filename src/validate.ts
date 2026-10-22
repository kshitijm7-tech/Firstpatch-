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
  ValidatedCandidateFile,
  ValidatedFact,
  ValidatedFile,
  ValidatedGuide,
  ValidatedImpactTrail,
  ValidatedRelationshipEdge,
  ValidatedRelationshipNode,
  ValidatedTest,
  DeveloperPassport,
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
 * Searches for an excerpt in raw file text to calculate reliable 1-indexed line numbers.
 */
export function findLineNumbers(
  fileContent: string,
  excerpt: string
): { startLine: number; endLine: number } | null {
  if (!fileContent || !excerpt) return null;

  const cleanExcerpt = excerpt.trim();
  if (cleanExcerpt.length < 5) return null;

  // 1. Direct search
  let charIdx = fileContent.indexOf(cleanExcerpt);

  // 2. Case-insensitive search
  if (charIdx === -1) {
    const normContent = fileContent.toLowerCase();
    const normExcerpt = cleanExcerpt.toLowerCase();
    charIdx = normContent.indexOf(normExcerpt);

    // 3. Fallback: match first significant line of excerpt
    if (charIdx === -1) {
      const firstLine = cleanExcerpt.split('\n')[0].trim().toLowerCase();
      if (firstLine.length >= 6) {
        charIdx = normContent.indexOf(firstLine);
      }
    }
  }

  if (charIdx === -1) return null;

  const preText = fileContent.slice(0, charIdx);
  const startLine = (preText.match(/\n/g) || []).length + 1;
  const matchExcerptLines = (cleanExcerpt.match(/\n/g) || []).length;
  const endLine = startLine + matchExcerptLines;

  return { startLine, endLine };
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
 * Validates the raw model guide against real GitHub context and source registry,
 * synthesizing the validated Impact Trail.
 */
export function validateGuide(
  rawGuide: RawModelGuide,
  context: GitHubContext,
  modelId: string,
  graphifyUsed = false,
  passport?: DeveloperPassport
): { guide: ValidatedGuide; meta: AnalysisMeta } {
  const warnings = [...context.warnings];
  const sourceMap = new Map<string, SourceRegistryItem>();
  for (const s of context.sources) {
    sourceMap.set(s.id, s);
  }

  const treeSet = new Set(context.tree.paths.map((p) => p.toLowerCase()));
  const branch = context.repository.default_branch || 'main';
  const issueText = `${context.issue.title}\n\n${context.issue.body}`.toLowerCase();

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
  const validatedFiles: ValidatedFile[] = (rawGuide.relevant_files || []).map((item) => {
    const { normalizedPath, isValid } = sanitizeFilePath(item.path);

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

  // 4. Validate and construct the IMPACT TRAIL
  const rawImpact = rawGuide.impact_trail;

  // A. Requirements extraction & evidence claims
  const rawReq = rawImpact?.requirements || {
    reported_problem: rawGuide.issue_summary || context.issue.title,
    expected_behavior: 'Resolved issue matching expected behavior described by author.',
    constraints: [],
    unanswered_questions: rawGuide.open_questions || [],
  };

  const evidenceClaims = validatedFacts.map((f) => ({
    claim: f.claim,
    source_id: f.source_id,
    excerpt: f.supporting_excerpt,
    status: f.grounding_status,
    url: f.source_url,
  }));

  // B. Candidate files (up to 5)
  const candidateRawList = (rawImpact?.candidate_files && rawImpact.candidate_files.length > 0)
    ? rawImpact.candidate_files.slice(0, 5)
    : (rawGuide.relevant_files || []).slice(0, 5).map((f) => ({
        path: f.path,
        relevance_explanation: f.why,
        supporting_excerpt: '',
        source_id: '',
      }));

  const validatedCandidateFiles: ValidatedCandidateFile[] = candidateRawList.map((cf) => {
    const { normalizedPath, isValid } = sanitizeFilePath(cf.path);
    const lowerPath = normalizedPath.toLowerCase();
    const isPresent = treeSet.has(lowerPath);

    let status: FileExistenceStatus = 'invalid_path';
    if (isValid) {
      if (isPresent) status = 'exists';
      else if (context.tree.isComplete) status = 'not_found_in_complete_tree';
      else status = 'not_checked';
    }

    // Try finding candidate file content in fetched source registry
    const matchingSource = context.sources.find(
      (s) => s.type === 'source_file' && s.label.toLowerCase() === lowerPath
    );

    let lineNumbers: { startLine: number; endLine: number } | null = null;
    let evidenceStatus: 'verified' | 'partial' | 'unsupported' = 'unsupported';
    let validatedExcerpt = cf.supporting_excerpt || '';

    if (matchingSource && cf.supporting_excerpt) {
      const inSource = verifyExcerptInSource(cf.supporting_excerpt, matchingSource.content);
      if (inSource) {
        evidenceStatus = 'verified';
        lineNumbers = findLineNumbers(matchingSource.content, cf.supporting_excerpt);
      } else {
        evidenceStatus = isPresent ? 'partial' : 'unsupported';
      }
    } else if (isPresent) {
      // Check if file is mentioned in issue description or stack trace
      if (issueText.includes(lowerPath) || issueText.includes(lowerPath.split('/').pop() || '')) {
        evidenceStatus = 'verified';
        if (!validatedExcerpt) {
          validatedExcerpt = `File mentioned in issue description or stack trace.`;
        }
      } else {
        evidenceStatus = 'partial';
      }
    }

    // Direct URL with line anchor if available
    let fileUrl: string | null = null;
    if (status === 'exists') {
      const baseFileUrl = `https://github.com/${context.repository.owner}/${context.repository.repo}/blob/${branch}/${normalizedPath}`;
      fileUrl = lineNumbers
        ? `${baseFileUrl}#L${lineNumbers.startLine}-L${lineNumbers.endLine}`
        : baseFileUrl;
    }

    return {
      path: normalizedPath,
      relevance_explanation: cf.relevance_explanation,
      supporting_excerpt: validatedExcerpt,
      status,
      evidence_status: evidenceStatus,
      line_numbers: lineNumbers,
      url: fileUrl,
      why_it_matters: cf.relevance_explanation,
      source_id: cf.source_id || matchingSource?.id,
    };
  });

  // C. Relationship View: Nodes & Edges
  const nodesMap = new Map<string, ValidatedRelationshipNode>();

  // Root issue node
  nodesMap.set('issue', {
    id: 'issue',
    label: `Issue #${context.issue.number}`,
    type: 'issue',
    subtext: context.issue.title.slice(0, 36) + (context.issue.title.length > 36 ? '...' : ''),
    url: context.issue.html_url,
  });

  // File nodes from candidate files
  for (const cf of validatedCandidateFiles) {
    const filename = cf.path.split('/').pop() || cf.path;
    const dir = cf.path.includes('/') ? cf.path.slice(0, cf.path.lastIndexOf('/')) : '';
    nodesMap.set(cf.path, {
      id: cf.path,
      label: filename,
      type: 'file',
      subtext: dir,
      status: cf.status,
      url: cf.url,
    });
  }

  // Edges
  const edges: ValidatedRelationshipEdge[] = [];
  const rawEdges = rawImpact?.relationships || [];

  if (rawEdges.length > 0) {
    for (const r of rawEdges) {
      const fromNode = r.from_node.trim();
      const toNode = r.to_node.trim();

      // Ensure nodes exist or register symbol nodes
      if (!nodesMap.has(fromNode)) {
        nodesMap.set(fromNode, {
          id: fromNode,
          label: fromNode,
          type: fromNode.includes('/') ? 'file' : 'symbol',
        });
      }
      if (!nodesMap.has(toNode)) {
        nodesMap.set(toNode, {
          id: toNode,
          label: toNode,
          type: toNode.includes('/') ? 'file' : 'symbol',
        });
      }

      // Check if relationship is backed by real text evidence or is hypothesis
      const isMentionedInIssue =
        r.edge_type === 'mentioned_in_issue' &&
        (issueText.includes(toNode.toLowerCase()) || issueText.includes(toNode.split('/').pop()?.toLowerCase() || ''));

      const isVerified = isMentionedInIssue || Boolean(r.source_id && sourceMap.has(r.source_id));

      edges.push({
        id: `edge_${fromNode}_${toNode}_${edges.length}`,
        from: fromNode,
        to: toNode,
        type: r.edge_type,
        label: r.label,
        why: r.why,
        is_hypothesis: !isVerified,
        status: isVerified ? 'verified' : 'ai_hypothesis',
        source_excerpt: r.excerpt,
        source_url: r.source_id ? sourceMap.get(r.source_id)?.url : null,
      });
    }
  } else {
    // Synthesize verified or hypothesis issue-to-file relationships
    validatedCandidateFiles.forEach((cf, idx) => {
      const lower = cf.path.toLowerCase();
      const filename = lower.split('/').pop() || '';
      const isMentioned = issueText.includes(lower) || issueText.includes(filename);

      edges.push({
        id: `edge_issue_${cf.path}_${idx}`,
        from: 'issue',
        to: cf.path,
        type: isMentioned ? 'mentioned_in_issue' : 'potentially_related',
        label: isMentioned ? 'Mentioned in issue / trace' : 'Candidate investigation area',
        why: cf.relevance_explanation,
        is_hypothesis: !isMentioned,
        status: isMentioned ? 'verified' : 'ai_hypothesis',
        source_excerpt: cf.supporting_excerpt,
        source_url: cf.url,
      });
    });
  }

  // D. Prioritized Investigation Plan
  const rawPlan = rawImpact?.investigation_plan || {
    inspect_first: rawGuide.contribution_plan?.[0]?.action || 'Inspect the issue description and verify reproducing steps.',
    code_path_to_follow: validatedCandidateFiles[0]?.path
      ? `Trace entry point and logic in ${validatedCandidateFiles[0].path}`
      : 'Trace through the core module identified in the issue description.',
    project_conventions: 'Review CONTRIBUTING.md, lint rules, and existing test naming patterns.',
    tests_to_inspect: rawGuide.tests?.[0]?.description || 'Run the repository test suite against the target module.',
    potential_breakages: rawGuide.risks?.[0] || 'Unintended side effects in dependent consumers of this module.',
    human_investigation_questions: rawGuide.open_questions || [],
  };

  const validatedImpactTrail: ValidatedImpactTrail = {
    requirements: {
      reported_problem: rawReq.reported_problem,
      expected_behavior: rawReq.expected_behavior,
      constraints: rawReq.constraints || [],
      unanswered_questions: rawReq.unanswered_questions || [],
      evidence_claims: evidenceClaims,
    },
    candidate_files: validatedCandidateFiles,
    relationship_graph: {
      nodes: Array.from(nodesMap.values()),
      edges,
    },
    investigation_plan: {
      inspect_first: rawPlan.inspect_first,
      code_path_to_follow: rawPlan.code_path_to_follow,
      project_conventions: rawPlan.project_conventions,
      tests_to_inspect: rawPlan.tests_to_inspect,
      potential_breakages: rawPlan.potential_breakages,
      human_investigation_questions: rawPlan.human_investigation_questions || [],
    },
  };

  // 5. Validate and construct Personalized Intelligence
  const rawPI = rawGuide.personalized_intelligence;
  
  // Extract user skills and learning targets from passport if available
  const userMatchingSkills = passport
    ? [...passport.languages, ...passport.frameworks].filter(
        (s) =>
          context.repository.primary_language?.toLowerCase().includes(s.toLowerCase()) ||
          context.repository.topics.some((t) => t.toLowerCase().includes(s.toLowerCase())) ||
          context.repository.repo.toLowerCase().includes(s.toLowerCase())
      )
    : [];

  const validatedPI = {
    fit_reason:
      rawPI?.fit_reason ||
      (passport
        ? `Aligns with your ${passport.experience_level} background in ${
            userMatchingSkills.length > 0 ? userMatchingSkills.join(', ') : passport.languages.join(', ')
          } and your goal to ${passport.learning_goals}.`
        : `Aligns with open-source engineering in ${context.repository.primary_language || 'modern'} software projects.`),
    skills_you_have:
      rawPI?.skills_you_have && rawPI.skills_you_have.length > 0
        ? rawPI.skills_you_have
        : userMatchingSkills.length > 0
        ? userMatchingSkills
        : [context.repository.primary_language || 'Core engineering', 'Git workflow'],
    concepts_to_learn:
      rawPI?.concepts_to_learn && rawPI.concepts_to_learn.length > 0
        ? rawPI.concepts_to_learn
        : passport?.want_to_learn && passport.want_to_learn.length > 0
        ? passport.want_to_learn
        : [`Module structure of ${context.repository.repo}`, 'Issue reproduction & test harness'],
    skill_gap_pathway:
      rawPI?.skill_gap_pathway && rawPI.skill_gap_pathway.length > 0
        ? rawPI.skill_gap_pathway.map((item) => ({
            topic: item.topic,
            why: item.why,
            suggested_resource: item.suggested_resource || 'Official project documentation',
            status: item.status || ('learning_needed' as const),
          }))
        : [
            {
              topic: `Repository architecture of ${context.repository.repo}`,
              why: 'Understand where the reported defect fits into the overall repository module boundaries.',
              suggested_resource: 'README.md and project docs',
              status: 'ready' as const,
            },
            {
              topic: 'Local reproduction & unit test suite',
              why: 'Verify the failure locally before modifying code.',
              suggested_resource: 'Existing test files in repository',
              status: 'learning_needed' as const,
            },
          ],
    estimated_time_hours: rawPI?.estimated_time_hours || (passport?.available_time ? `Est. ${passport.available_time}` : '3-5 hours'),
  };

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
    impact_trail: validatedImpactTrail,
    personalized_intelligence: validatedPI,
  };

  return { guide: validatedGuide, meta };
}
