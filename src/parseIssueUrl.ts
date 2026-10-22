/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InvalidUrlError, PullRequestUrlError } from './errors.js';

export interface ParsedIssueUrl {
  owner: string;
  repo: string;
  issueNumber: number;
  canonicalUrl: string;
}

// GitHub user/org name pattern: alphanumeric and hyphens, no consecutive hyphens, cannot start/end with hyphen, max 39 chars
const OWNER_REGEX = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

// GitHub repo name pattern: alphanumeric, hyphen, underscore, and dot, 1-100 characters
const REPO_REGEX = /^[a-zA-Z0-9_.-]{1,100}$/;

/**
 * Validates and extracts owner, repo, and issueNumber from a GitHub issue URL.
 * Strictly checks protocol, hostname, credentials, path components, and issue number.
 */
export function parseIssueUrl(rawUrl: string): ParsedIssueUrl {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new InvalidUrlError('Please provide a valid GitHub issue URL.');
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length > 500) {
    throw new InvalidUrlError('URL exceeds acceptable length.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new InvalidUrlError('Malformed URL. Please enter a valid HTTPS URL.');
  }

  // Enforce HTTPS
  if (parsed.protocol !== 'https:') {
    throw new InvalidUrlError('URL must use HTTPS protocol (https://github.com/...).');
  }

  // Enforce exact github.com hostname (case-insensitive)
  if (parsed.hostname.toLowerCase() !== 'github.com') {
    throw new InvalidUrlError('Only public repositories on github.com are supported.');
  }

  // Reject credentials in URL
  if (parsed.username || parsed.password) {
    throw new InvalidUrlError('URLs containing user credentials are not allowed.');
  }

  // Reject non-standard ports
  if (parsed.port && parsed.port !== '443' && parsed.port !== '') {
    throw new InvalidUrlError('Custom ports are not allowed.');
  }

  // Clean pathname and split segments
  const path = parsed.pathname.replace(/\/+/g, '/').replace(/\/$/, '');
  const segments = path.split('/').filter(Boolean);

  // Check if someone passed a pull request URL
  if (segments.length >= 3 && segments[2].toLowerCase() === 'pull') {
    throw new PullRequestUrlError();
  }

  // Expected segments: [owner, repo, 'issues', issueNumber]
  if (segments.length !== 4) {
    throw new InvalidUrlError(
      'URL path must match the format: /<owner>/<repo>/issues/<issue_number>'
    );
  }

  const [owner, repo, issuesWord, issueNumStr] = segments;

  if (issuesWord.toLowerCase() !== 'issues') {
    throw new InvalidUrlError('URL must point to an "issues" page.');
  }

  // Validate owner
  if (!OWNER_REGEX.test(owner)) {
    throw new InvalidUrlError(`Invalid GitHub username or organization name: "${owner}".`);
  }

  // Validate repository name
  if (!REPO_REGEX.test(repo) || repo === '.' || repo === '..') {
    throw new InvalidUrlError(`Invalid GitHub repository name: "${repo}".`);
  }

  // Validate issue number: positive integer, up to 9 digits (safe against overflow)
  if (!/^[1-9]\d{0,8}$/.test(issueNumStr)) {
    throw new InvalidUrlError('Issue number must be a valid positive integer.');
  }

  const issueNumber = parseInt(issueNumStr, 10);
  if (!Number.isSafeInteger(issueNumber) || issueNumber <= 0) {
    throw new InvalidUrlError('Invalid issue number.');
  }

  const canonicalUrl = `https://github.com/${owner}/${repo}/issues/${issueNumber}`;

  return {
    owner,
    repo,
    issueNumber,
    canonicalUrl,
  };
}
