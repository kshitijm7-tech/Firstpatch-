/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

/**
 * Raw model-generated guide schema.
 * Notice: the model does NOT generate server-trusted properties such as
 * `verified`, `grounded`, `status`, `source_url`, `tree_complete`, or timestamps.
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
