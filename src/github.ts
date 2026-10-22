/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  GitHubApiError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  PullRequestUrlError,
  RequestTimeoutError,
} from './errors.js';
import type {
  IssueMetadata,
  RepositoryMetadata,
  SourceRegistryItem,
} from './schema.js';

const GITHUB_API_BASE = 'https://api.github.com';
const TIMEOUT_MS = 12000;
const MAX_TREE_ENTRIES = 3000;
const MAX_CANDIDATE_FILES = 6;
const MAX_FILE_SIZE_BYTES = 100 * 1024; // 100 KB
const MAX_COMMENT_LENGTH = 1500;
const MAX_README_LENGTH = 6000;
const MAX_CONTRIBUTING_LENGTH = 4000;
const MAX_FILE_CONTENT_LENGTH = 4000;
const MAX_ISSUE_BODY_LENGTH = 4000;
const MAX_TEXT_FIELD_LENGTH = 500;

function boundedText(value: unknown, fallback = '', max = MAX_TEXT_FIELD_LENGTH): string {
  return typeof value === 'string' ? value.slice(0, max) : fallback;
}

function githubWebUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'github.com'
      ? url.toString()
      : fallback;
  } catch {
    return fallback;
  }
}

const IGNORED_PATH_PREFIXES = [
  'node_modules/',
  'vendor/',
  'dist/',
  'build/',
  'coverage/',
  '.git/',
  '.next/',
  '.nuxt/',
  'target/',
  'out/',
  'bin/',
  'obj/',
  'venv/',
  '.venv/',
  '__pycache__/',
];

const IGNORED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.zip', '.tar', '.gz', '.7z', '.rar',
  '.pdf', '.exe', '.dll', '.so', '.dylib', '.bin',
  '.map', '.min.js', '.min.css',
  '.lock',
]);

const IGNORED_FILENAMES = new Set([
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'cargo.lock',
  'gemfile.lock',
  'poetry.lock',
  'composer.lock',
]);

export interface GitHubContext {
  issue: IssueMetadata;
  repository: RepositoryMetadata;
  comments: Array<{ id: number; author: string; body: string; html_url: string }>;
  tree: {
    paths: string[];
    isComplete: boolean;
    totalEntries: number;
  };
  sources: SourceRegistryItem[];
  truncationFlags: {
    issue_body: boolean;
    comments: boolean;
    readme: boolean;
    contributing: boolean;
    candidate_files: boolean;
  };
  warnings: string[];
}

/**
 * Fetch wrapper with timeout, token auth, and structured error handling.
 */
async function githubFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'FirstPatch-Applet (Google AI Studio Build)',
  };

  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_BASE}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string> || {}),
      },
      signal: controller.signal,
    });
    return res;
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      throw new RequestTimeoutError(`fetching GitHub data (${endpoint})`);
    }
    throw new GitHubApiError(`Network error while contacting GitHub: ${(err as Error)?.message || 'Unknown network error'}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks for rate limits or HTTP errors and throws typed errors.
 */
function handleGitHubErrors(res: Response, resourceDesc: string): void {
  const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
  const rateLimitReset = res.headers.get('x-ratelimit-reset');

  if ((res.status === 403 || res.status === 429) && rateLimitRemaining === '0') {
    const resetSec = rateLimitReset ? parseInt(rateLimitReset, 10) : undefined;
    throw new GitHubRateLimitError(resetSec);
  }

  if (res.status === 404) {
    throw new GitHubNotFoundError(resourceDesc);
  }

  if (res.status >= 500) {
    throw new GitHubApiError(`GitHub service returned error ${res.status}. Please try again later.`);
  }

  if (!res.ok) {
    throw new GitHubApiError(`GitHub API responded with status ${res.status} for ${resourceDesc}.`, res.status);
  }
}

/**
 * Decodes base64 content returned by GitHub Content API.
 */
function decodeBase64Content(content: string): string {
  try {
    const clean = content.replace(/\s/g, '');
    return Buffer.from(clean, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

/**
 * Retrieves full issue and repository context.
 */
export async function fetchGitHubContext(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubContext> {
  const warnings: string[] = [];
  const sources: SourceRegistryItem[] = [];
  const truncationFlags = {
    issue_body: false,
    comments: false,
    readme: false,
    contributing: false,
    candidate_files: false,
  };

  // 1. Fetch Issue
  const issueRes = await githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}`);
  handleGitHubErrors(issueRes, `issue #${issueNumber} in ${owner}/${repo}`);
  const rawIssue = await issueRes.json();
  if (!rawIssue || typeof rawIssue !== 'object' || Array.isArray(rawIssue)) {
    throw new GitHubApiError('GitHub returned an invalid issue response.');
  }

  // Reject pull requests
  if (rawIssue.pull_request) {
    throw new PullRequestUrlError();
  }

  const rawBody = boundedText(rawIssue.body, '', MAX_ISSUE_BODY_LENGTH + 1);
  const isBodyTruncated = rawBody.length > MAX_ISSUE_BODY_LENGTH;
  const issueBodyExcerpt = isBodyTruncated
    ? rawBody.slice(0, MAX_ISSUE_BODY_LENGTH)
    : rawBody;
  truncationFlags.issue_body = isBodyTruncated;

  const issue: IssueMetadata = {
    owner,
    repo,
    number: issueNumber,
    title: boundedText(rawIssue.title, `Issue #${issueNumber}`),
    body: issueBodyExcerpt,
    author: boundedText(rawIssue.user?.login, 'unknown', 100),
    state: rawIssue.state === 'closed' ? 'closed' : 'open',
    created_at: boundedText(rawIssue.created_at, new Date().toISOString(), 50),
    html_url: githubWebUrl(rawIssue.html_url, `https://github.com/${owner}/${repo}/issues/${issueNumber}`),
    labels: Array.isArray(rawIssue.labels)
      ? rawIssue.labels.map((l: { name: string; color: string; description?: string }) => ({
          name: boundedText(l?.name, 'unnamed', 100),
          color: boundedText(l?.color, '', 20),
          description: boundedText(l?.description, '', 300) || undefined,
        }))
      : [],
  };

  // Register issue description as source
  sources.push({
    id: 'src_issue_desc',
    type: 'issue_body',
    label: `Issue #${issueNumber}: ${issue.title}`,
    url: issue.html_url,
    content: `${issue.title}\n\n${issueBodyExcerpt}`,
    length: issueBodyExcerpt.length,
    truncated: isBodyTruncated,
  });

  // 2. Parallel fetch: Repository metadata and Comments
  const [repoRes, commentsRes] = await Promise.all([
    githubFetch(`/repos/${owner}/${repo}`),
    githubFetch(`/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=15`),
  ]);

  handleGitHubErrors(repoRes, `repository ${owner}/${repo}`);
  const rawRepo = await repoRes.json();
  if (!rawRepo || typeof rawRepo !== 'object' || Array.isArray(rawRepo)) {
    throw new GitHubApiError('GitHub returned an invalid repository response.');
  }

  const repository: RepositoryMetadata = {
    owner,
    repo,
    description: boundedText(rawRepo.description, '', 1000) || null,
    primary_language: boundedText(rawRepo.language, '', 100) || null,
    default_branch: boundedText(rawRepo.default_branch, 'main', 200),
    license: boundedText(rawRepo.license?.spdx_id || rawRepo.license?.name, '', 100) || null,
    topics: Array.isArray(rawRepo.topics) ? rawRepo.topics.filter((t: unknown): t is string => typeof t === 'string').slice(0, 30).map((t: string) => t.slice(0, 100)) : [],
    stars: typeof rawRepo.stargazers_count === 'number' ? rawRepo.stargazers_count : undefined,
    html_url: githubWebUrl(rawRepo.html_url, `https://github.com/${owner}/${repo}`),
  };

  sources.push({
    id: 'src_repo_meta',
    type: 'repo_meta',
    label: `Repository Metadata (${owner}/${repo})`,
    url: repository.html_url,
    content: `Description: ${repository.description || 'None'}\nLanguage: ${repository.primary_language || 'Unknown'}\nTopics: ${repository.topics.join(', ') || 'None'}`,
    length: 100,
    truncated: false,
  });

  // Comments processing
  const comments: Array<{ id: number; author: string; body: string; html_url: string }> = [];
  if (commentsRes.ok) {
    const rawComments = await commentsRes.json();
    if (Array.isArray(rawComments)) {
      for (const c of rawComments.slice(0, 15)) {
        const bodyText = boundedText(c?.body, '', MAX_COMMENT_LENGTH * 2);
        const isCommentTrunc = bodyText.length > MAX_COMMENT_LENGTH;
        if (isCommentTrunc) truncationFlags.comments = true;
        const commentExcerpt = isCommentTrunc
          ? bodyText.slice(0, MAX_COMMENT_LENGTH)
          : bodyText;

        const commentItem = {
          id: typeof c?.id === 'number' ? c.id : 0,
          author: boundedText(c?.user?.login, 'unknown', 100),
          body: commentExcerpt,
          html_url: githubWebUrl(c?.html_url, `${issue.html_url}#issuecomment-${c?.id || 0}`),
        };
        comments.push(commentItem);

        sources.push({
          id: `src_comment_${c.id}`,
          type: 'issue_comment',
          label: `Comment by @${commentItem.author}`,
          url: commentItem.html_url,
          content: commentExcerpt,
          length: commentExcerpt.length,
          truncated: isCommentTrunc,
        });
      }
    }
  }

  // 3. Fetch File Tree
  let treePaths: string[] = [];
  let isTreeComplete = false;
  let treeEntriesCount = 0;

  try {
    const treeRes = await githubFetch(
      `/repos/${owner}/${repo}/git/trees/${repository.default_branch}?recursive=1`
    );
    if (treeRes.ok) {
      const treeData = await treeRes.json();
      const rawTree = Array.isArray(treeData.tree) ? treeData.tree : [];
      treeEntriesCount = rawTree.length;
      isTreeComplete = !treeData.truncated && treeEntriesCount < MAX_TREE_ENTRIES;

      treePaths = rawTree
        .slice(0, MAX_TREE_ENTRIES)
        .filter((item: { type?: string }) => item.type === 'blob')
        .map((item: { path?: unknown }) => typeof item.path === 'string' ? item.path.slice(0, 500) : '')
        .filter(Boolean);

      if (treeData.truncated || treeEntriesCount >= MAX_TREE_ENTRIES) {
        warnings.push(
          `Repository file tree exceeded limit and was capped at ${treePaths.length} files. File existence verification is marked partial.`
        );
      }
    } else {
      warnings.push(`File tree retrieval returned ${treeRes.status}; file paths marked not_checked.`);
    }
  } catch (err) {
    warnings.push(`Unable to retrieve file tree: ${(err as Error).message}`);
  }

  // 4. Parallel fetch: README and CONTRIBUTING
  const [readmeRes, contributingRes] = await Promise.all([
    githubFetch(`/repos/${owner}/${repo}/readme`),
    fetchContributing(owner, repo, treePaths),
  ]);

  if (readmeRes.ok) {
    try {
      const readmeData = await readmeRes.json();
      const decodedReadme = decodeBase64Content(readmeData.content || '');
      const isReadmeTrunc = decodedReadme.length > MAX_README_LENGTH;
      truncationFlags.readme = isReadmeTrunc;
      const readmeExcerpt = isReadmeTrunc
        ? decodedReadme.slice(0, MAX_README_LENGTH)
        : decodedReadme;

      sources.push({
        id: 'src_readme',
        type: 'readme',
        label: 'README.md',
        url: githubWebUrl(readmeData.html_url, `https://github.com/${owner}/${repo}/blob/${repository.default_branch}/README.md`),
        content: readmeExcerpt,
        length: readmeExcerpt.length,
        truncated: isReadmeTrunc,
      });
    } catch {
      // Non-fatal
    }
  }

  if (contributingRes) {
    const isContribTrunc = contributingRes.content.length > MAX_CONTRIBUTING_LENGTH;
    truncationFlags.contributing = isContribTrunc;
    const contribExcerpt = isContribTrunc
      ? contributingRes.content.slice(0, MAX_CONTRIBUTING_LENGTH)
      : contributingRes.content;

    sources.push({
      id: 'src_contributing',
      type: 'contributing',
      label: contributingRes.path,
      url: contributingRes.url,
      content: contribExcerpt,
      length: contribExcerpt.length,
      truncated: isContribTrunc,
    });
  }

  // 5. Candidate Source Files Scoring & Retrieval
  const candidatePaths = selectCandidateFiles(
    treePaths,
    rawIssue.title || '',
    rawBody,
    repository.primary_language
  );

  const candidateFetches: Promise<SourceRegistryItem | null>[] = candidatePaths
    .slice(0, MAX_CANDIDATE_FILES)
    .map(async (path): Promise<SourceRegistryItem | null> => {
      try {
        const res = await githubFetch(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`);
        if (!res.ok) return null;
        const fileData = await res.json();
        if (fileData.size > MAX_FILE_SIZE_BYTES) return null;
        if (fileData.content) {
          const decoded = decodeBase64Content(fileData.content);
          const isFileTrunc = decoded.length > MAX_FILE_CONTENT_LENGTH;
          if (isFileTrunc) truncationFlags.candidate_files = true;
          const excerpt = isFileTrunc ? decoded.slice(0, MAX_FILE_CONTENT_LENGTH) : decoded;

          // Clean slug for source ID
          const slug = path.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 40);

          return {
            id: `src_file_${slug}`,
            type: 'source_file' as const,
            label: path,
            url: githubWebUrl(fileData.html_url, `https://github.com/${owner}/${repo}/blob/${repository.default_branch}/${path}`),
            content: excerpt,
            length: excerpt.length,
            truncated: isFileTrunc,
          };
        }
      } catch {
        return null;
      }
      return null;
    });

  const fetchedCandidates = (await Promise.all(candidateFetches)).filter(
    (item): item is SourceRegistryItem => item !== null
  );

  for (const item of fetchedCandidates) {
    sources.push(item);
  }

  return {
    issue,
    repository,
    comments,
    tree: {
      paths: treePaths,
      isComplete: isTreeComplete,
      totalEntries: treeEntriesCount,
    },
    sources,
    truncationFlags,
    warnings,
  };
}

/**
 * Helper to find CONTRIBUTING file among tree paths or via standard locations.
 */
async function fetchContributing(
  owner: string,
  repo: string,
  treePaths: string[]
): Promise<{ path: string; url: string; content: string } | null> {
  const possiblePaths = [
    'CONTRIBUTING.md',
    '.github/CONTRIBUTING.md',
    'contributing.md',
    '.github/contributing.md',
    'docs/CONTRIBUTING.md',
  ];

  let targetPath = possiblePaths.find((p) =>
    treePaths.some((tp) => tp.toLowerCase() === p.toLowerCase())
  );

  if (!targetPath) {
    targetPath = 'CONTRIBUTING.md';
  }

  try {
    const res = await githubFetch(`/repos/${owner}/${repo}/contents/${targetPath}`);
    if (res.ok) {
      const data = await res.json();
      if (data.content) {
        return {
          path: targetPath,
          url: data.html_url || `https://github.com/${owner}/${repo}/blob/HEAD/${targetPath}`,
          content: decodeBase64Content(data.content),
        };
      }
    }
  } catch {
    // Missing contributing file is normal
  }
  return null;
}

/**
 * Scores files in the tree based on keywords, stack traces, and relevance to the issue.
 */
export function selectCandidateFiles(
  paths: string[],
  title: string,
  body: string,
  primaryLanguage: string | null
): string[] {
  const combinedText = `${title} ${body}`;

  // Issue authors often link directly to the relevant source file. Preserve
  // those paths even when GitHub returns a truncated tree and the path is
  // outside the first bounded tree slice.
  const explicitCandidates = extractExplicitCandidatePaths(combinedText);
  if (!paths.length) return explicitCandidates.slice(0, MAX_CANDIDATE_FILES);

  // Filter out noisy paths
  const eligiblePaths = paths.filter((p) => {
    const lower = p.toLowerCase();
    for (const prefix of IGNORED_PATH_PREFIXES) {
      if (lower.startsWith(prefix) || lower.includes('/' + prefix)) return false;
    }
    const extMatch = lower.match(/\.[a-z0-9]+$/);
    if (extMatch && IGNORED_EXTENSIONS.has(extMatch[0])) return false;
    const filename = lower.split('/').pop() || '';
    if (IGNORED_FILENAMES.has(filename)) return false;
    return true;
  });

  const normalizedText = combinedText.toLowerCase();

  // Extract explicit backticked paths and words from text
  const backtickMatches = (normalizedText.match(/`([^`]+)`/g) || []).map((m) =>
    m.replace(/`/g, '').trim()
  );

  // Extract stack trace file references (e.g. "at Foo (/src/foo.ts:12:3)")
  const stackMatches = (normalizedText.match(/[a-zA-Z0-9_./\\-]+\.[a-zA-Z]{1,5}/g) || []);

  const keywords = new Set<string>();
  const words = combinedText.split(/[\s,.;:()\[\]{}'"]+/);
  for (const w of words) {
    if (w.length >= 3 && !COMMON_STOP_WORDS.has(w)) {
      keywords.add(w);
    }
  }

  const scored: Array<{ path: string; score: number }> = [];

  for (const p of eligiblePaths) {
    const lowerP = p.toLowerCase();
    const basename = lowerP.split('/').pop() || '';
    let score = 0;

    // Check exact backticked path match
    for (const b of backtickMatches) {
      if (b.length > 2 && (lowerP === b || lowerP.endsWith(b) || b.endsWith(lowerP))) {
        score += 60;
      }
    }

    // Check stack trace match
    for (const s of stackMatches) {
      if (s.length > 3 && (lowerP === s || lowerP.endsWith(s) || basename === s.split('/').pop())) {
        score += 50;
      }
    }

    // Basename keyword match
    for (const kw of keywords) {
      if (basename.includes(kw)) {
        score += 15;
      } else if (lowerP.includes(kw)) {
        score += 4;
      }
    }

    // Prioritize src/ or lib/ or packages/
    if (lowerP.startsWith('src/') || lowerP.startsWith('lib/') || lowerP.startsWith('packages/')) {
      score += 5;
    }

    // Language extension boost
    if (primaryLanguage) {
      const ext = getLanguageExt(primaryLanguage);
      if (ext && lowerP.endsWith(ext)) {
        score += 3;
      }
    }

    // Slight penalty for test files if we are seeking implementation
    if (lowerP.includes('.test.') || lowerP.includes('.spec.') || lowerP.includes('/test/') || lowerP.includes('/tests/')) {
      score -= 2;
    }

    if (score > 0) {
      scored.push({ path: p, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return Array.from(new Set([
    ...explicitCandidates,
    ...scored.map((s) => s.path),
  ])).slice(0, MAX_CANDIDATE_FILES);
}

function extractExplicitCandidatePaths(text: string): string[] {
  const candidates = new Set<string>();
  const addCandidate = (raw: string) => {
    let value = raw.trim().replace(/[)`\]}>,.;]+$/, '');
    if (value.startsWith('http')) {
      try {
        const url = new URL(value);
        if (url.hostname.toLowerCase() !== 'github.com') return;
        const segments = url.pathname.split('/').filter(Boolean);
        const blobIndex = segments.indexOf('blob');
        if (blobIndex < 0 || segments.length <= blobIndex + 2) return;
        value = segments.slice(blobIndex + 2).join('/');
      } catch {
        return;
      }
    }

    value = value
      .replace(/^\.\//, '')
      .replace(/^\//, '')
      .replace(/[#:].*$/, '');

    if (
      value &&
      value.length <= 500 &&
      !value.includes('..') &&
      /^[a-zA-Z0-9_.@/-]+$/.test(value) &&
      (value.includes('/') || /\.[a-zA-Z0-9]{1,8}$/.test(value))
    ) {
      candidates.add(value);
    }
  };

  for (const match of text.match(/`[^`]+`/g) || []) addCandidate(match.slice(1, -1));
  for (const match of text.match(/https?:\/\/github\.com\/[^\s)]+\/blob\/[^\s)#]+/gi) || []) addCandidate(match);
  return Array.from(candidates);
}

function getLanguageExt(lang: string): string | null {
  const map: Record<string, string> = {
    typescript: '.ts',
    javascript: '.js',
    python: '.py',
    go: '.go',
    rust: '.rs',
    ruby: '.rb',
    java: '.java',
    kotlin: '.kt',
    c: '.c',
    'c++': '.cpp',
  };
  return map[lang.toLowerCase()] || null;
}

const COMMON_STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was',
  'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old',
  'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use',
  'that', 'with', 'have', 'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been',
  'good', 'much', 'some', 'time', 'issue', 'bug', 'error', 'fix', 'problem', 'help', 'when',
  'what', 'which', 'where', 'there', 'their', 'about', 'would', 'could', 'should',
]);
