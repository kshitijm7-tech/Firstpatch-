/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * Developer Passport schema for contributor profile & learning preferences.
 */
export const DeveloperPassportSchema = z.object({
  github_username: z.string().default(''),
  languages: z.array(z.string()).default(['TypeScript', 'JavaScript']),
  frameworks: z.array(z.string()).default(['React', 'Node.js']),
  want_to_learn: z.array(z.string()).default(['Rust', 'WebAssembly']),
  preferred_domains: z.array(z.string()).default(['Developer Tools', 'Web Frameworks']),
  experience_level: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  learning_goals: z.string().default('Learn open-source contribution patterns and master AST parsers'),
  preferred_difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'any']).default('any'),
  available_time: z.string().default('3-5 hours/week'),
});

export type DeveloperPassport = z.infer<typeof DeveloperPassportSchema>;

/**
 * Detected skill evidence classification.
 */
export type SkillEvidenceStatus =
  | 'self_reported'
  | 'repository_evidence_found'
  | 'potential_gap'
  | 'not_enough_evidence';

export interface DetectedSkill {
  name: string;
  evidence_status: SkillEvidenceStatus;
  evidence_detail: string;
  source_repos: string[];
}

export interface GitHubProfileIntelligence {
  username: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos_count: number;
  detected_skills: DetectedSkill[];
  top_repositories: Array<{
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    topics: string[];
    url: string;
    updated_at: string;
  }>;
  recent_activity_summary: string;
}

export interface DiscoveredIssue {
  id: string;
  owner: string;
  repo: string;
  number: number;
  title: string;
  html_url: string;
  labels: Array<{ name: string; color: string; description?: string }>;
  state: 'open' | 'closed';
  created_at: string;
  estimated_difficulty: 'beginner' | 'intermediate' | 'advanced';
  match_score: number; // 0-100 explainable alignment score
  match_reasons: string[]; // Principal factors behind recommendation
  relevant_skills: string[];
  learning_opportunities: string[];
  uncertainties: string[];
}

/**
 * Raw model-generated personalized intelligence schema.
 */
export const PersonalizedIntelligenceSchema = z.object({
  fit_reason: z.string().min(1, 'Fit reason required'),
  skills_you_have: z.array(z.string()).default([]),
  concepts_to_learn: z.array(z.string()).default([]),
  skill_gap_pathway: z.array(
    z.object({
      topic: z.string().min(1),
      why: z.string().min(1),
      suggested_resource: z.string().default('Official project documentation'),
      status: z.enum(['ready', 'learning_needed']).default('learning_needed'),
    })
  ).default([]),
  estimated_time_hours: z.string().default('2-4 hours'),
});

export type RawModelPersonalizedIntelligence = z.infer<typeof PersonalizedIntelligenceSchema>;

/**
 * Raw model-generated impact trail schema.
 */
export const ImpactTrailSchema = z.object({
  requirements: z.object({
    reported_problem: z.string().min(1, 'Reported problem cannot be empty'),
    expected_behavior: z.string().min(1, 'Expected behavior cannot be empty'),
    constraints: z.array(z.string()).default([]),
    unanswered_questions: z.array(z.string()).default([]),
  }),
  candidate_files: z.array(
    z.object({
      path: z.string().min(1, 'Candidate path required'),
      relevance_explanation: z.string().min(1, 'Relevance explanation required'),
      supporting_excerpt: z.string().default(''),
      source_id: z.string().default(''),
    })
  ).max(5).default([]),
  relationships: z.array(
    z.object({
      from_node: z.string().min(1),
      to_node: z.string().min(1),
      edge_type: z.enum([
        'mentioned_in_issue',
        'contains_matching_symbol',
        'imports_or_calls',
        'potentially_related',
      ]),
      label: z.string().min(1),
      why: z.string().min(1),
      symbol_or_module: z.string().optional(),
      source_id: z.string().optional(),
      excerpt: z.string().optional(),
    })
  ).default([]),
  investigation_plan: z.object({
    inspect_first: z.string().min(1, 'inspect_first required'),
    code_path_to_follow: z.string().min(1, 'code_path_to_follow required'),
    project_conventions: z.string().min(1, 'project_conventions required'),
    tests_to_inspect: z.string().min(1, 'tests_to_inspect required'),
    potential_breakages: z.string().min(1, 'potential_breakages required'),
    human_investigation_questions: z.array(z.string()).default([]),
  }),
});

export type RawModelImpactTrail = z.infer<typeof ImpactTrailSchema>;

/**
 * Raw model-generated guide schema.
 */
export const GuideSchema = z.object({
  issue_summary: z.string().min(1, 'Issue summary cannot be empty'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  difficulty_reason: z.string().min(1, 'Difficulty reasoning required'),

  verified_facts: z.array(
    z.object({
      claim: z.string().min(1, 'Fact claim cannot be empty'),
      source_id: z.string().min(1, 'source_id required'),
      supporting_excerpt: z.string().min(1, 'supporting_excerpt required'),
    })
  ).default([]),

  relevant_files: z.array(
    z.object({
      path: z.string().min(1, 'File path cannot be empty'),
      why: z.string().min(1, 'File relevance reason required'),
    })
  ).default([]),

  ai_suggestions: z.array(
    z.object({
      title: z.string().min(1, 'Suggestion title required'),
      detail: z.string().min(1, 'Suggestion detail required'),
      confidence: z.enum(['low', 'medium', 'high']),
    })
  ).default([]),

  contribution_plan: z.array(
    z.object({
      step: z.number().int().positive(),
      action: z.string().min(1, 'Action description required'),
      files: z.array(z.string()).default([]),
    })
  ).default([]),

  tests: z.array(
    z.object({
      description: z.string().min(1, 'Test description required'),
      command: z.string().nullable().default(null),
    })
  ).default([]),

  open_questions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),

  // Impact Trail segment
  impact_trail: ImpactTrailSchema.optional(),

  // Personalized Intelligence segment
  personalized_intelligence: PersonalizedIntelligenceSchema.optional(),
});

export type RawModelGuide = z.infer<typeof GuideSchema>;

/**
 * Server-derived grounding status for model-claimed facts.
 */
export type GroundingStatus =
  | 'verified'
  | 'unverified_excerpt_not_found'
  | 'unverified_unknown_source';

/**
 * Server-derived existence status for file paths.
 */
export type FileExistenceStatus =
  | 'exists'
  | 'not_found_in_complete_tree'
  | 'not_checked'
  | 'invalid_path';

export interface ValidatedFact {
  claim: string;
  source_id: string;
  supporting_excerpt: string;
  source_url: string | null;
  source_type: string;
  grounding_status: GroundingStatus;
  grounding_reason?: string;
}

export interface ValidatedFile {
  path: string;
  why: string;
  status: FileExistenceStatus;
  url: string | null;
}

export interface ValidatedTest {
  description: string;
  command: string | null;
  status: 'not_run';
}

export interface ValidatedCandidateFile {
  path: string;
  relevance_explanation: string;
  supporting_excerpt: string;
  status: FileExistenceStatus;
  evidence_status: 'verified' | 'partial' | 'unsupported';
  line_numbers?: { startLine: number; endLine: number } | null;
  url: string | null;
  why_it_matters: string;
  source_id?: string;
}

export interface ValidatedRelationshipNode {
  id: string;
  label: string;
  type: 'issue' | 'file' | 'symbol' | 'module';
  subtext?: string;
  status?: FileExistenceStatus;
  url?: string | null;
}

export interface ValidatedRelationshipEdge {
  id: string;
  from: string;
  to: string;
  type:
    | 'mentioned_in_issue'
    | 'contains_matching_symbol'
    | 'imports_or_calls'
    | 'potentially_related';
  label: string;
  why: string;
  is_hypothesis: boolean;
  status: 'verified' | 'ai_hypothesis' | 'unsupported';
  source_excerpt?: string;
  source_url?: string | null;
}

export interface ValidatedImpactTrail {
  requirements: {
    reported_problem: string;
    expected_behavior: string;
    constraints: string[];
    unanswered_questions: string[];
    evidence_claims: Array<{
      claim: string;
      source_id: string;
      excerpt: string;
      status: GroundingStatus;
      url: string | null;
    }>;
  };
  candidate_files: ValidatedCandidateFile[];
  relationship_graph: {
    nodes: ValidatedRelationshipNode[];
    edges: ValidatedRelationshipEdge[];
  };
  investigation_plan: {
    inspect_first: string;
    code_path_to_follow: string;
    project_conventions: string;
    tests_to_inspect: string;
    potential_breakages: string;
    human_investigation_questions: string[];
  };
}

export interface ValidatedPersonalizedIntelligence {
  fit_reason: string;
  skills_you_have: string[];
  concepts_to_learn: string[];
  skill_gap_pathway: Array<{
    topic: string;
    why: string;
    suggested_resource: string;
    status: 'ready' | 'learning_needed';
  }>;
  estimated_time_hours: string;
}

export type PersonalizedIntelligence = ValidatedPersonalizedIntelligence;

export interface ValidatedGuide {
  issue_summary: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  difficulty_reason: string;
  verified_facts: ValidatedFact[];
  relevant_files: ValidatedFile[];
  ai_suggestions: Array<{
    title: string;
    detail: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
  contribution_plan: Array<{
    step: number;
    action: string;
    files: string[];
  }>;
  tests: ValidatedTest[];
  open_questions: string[];
  risks: string[];
  impact_trail: ValidatedImpactTrail;
  personalized_intelligence: ValidatedPersonalizedIntelligence;
}

export interface SourceRegistryItem {
  id: string;
  type: 'issue_body' | 'issue_comment' | 'readme' | 'contributing' | 'source_file' | 'repo_meta';
  label: string;
  url: string;
  content: string;
  length: number;
  truncated: boolean;
}

export interface AnalysisMeta {
  configured_model: string;
  timestamp: string;
  sources_fetched: Array<{
    id: string;
    type: string;
    label: string;
    url: string;
    length: number;
    truncated: boolean;
  }>;
  tree_complete: boolean;
  tree_entries_count: number;
  truncation_flags: {
    issue_body: boolean;
    comments: boolean;
    readme: boolean;
    contributing: boolean;
    candidate_files: boolean;
  };
  graphify_used: boolean;
  warnings: string[];
}

export interface IssueMetadata {
  owner: string;
  repo: string;
  number: number;
  title: string;
  body: string;
  author: string;
  state: 'open' | 'closed';
  created_at: string;
  html_url: string;
  labels: Array<{ name: string; color: string; description?: string }>;
}

export interface RepositoryMetadata {
  owner: string;
  repo: string;
  description: string | null;
  primary_language: string | null;
  default_branch: string;
  license: string | null;
  topics: string[];
  stars?: number;
  html_url: string;
}

export interface FullAnalysisResult {
  issue: IssueMetadata;
  repository: RepositoryMetadata;
  guide: ValidatedGuide;
  meta: AnalysisMeta;
}
