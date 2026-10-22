/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GitHubApiError, GitHubNotFoundError, GitHubRateLimitError, RequestTimeoutError } from './errors.js';
import type {
  DetectedSkill,
  DeveloperPassport,
  DiscoveredIssue,
  GitHubProfileIntelligence,
} from './schema.js';

const GITHUB_API_BASE = 'https://api.github.com';
const TIMEOUT_MS = 10000;
type GitHubFetch = (endpoint: string) => Promise<Response>;

/**
 * Fetch wrapper for profile and issue queries.
 */
async function githubFetch(endpoint: string): Promise<Response> {
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
    const res = await fetch(url, { headers, signal: controller.signal });

    const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
    const rateLimitReset = res.headers.get('x-ratelimit-reset');

    if ((res.status === 403 || res.status === 429) && rateLimitRemaining === '0') {
      const resetSec = rateLimitReset ? parseInt(rateLimitReset, 10) : undefined;
      throw new GitHubRateLimitError(resetSec);
    }

    if (res.status === 404) {
      throw new GitHubNotFoundError(`GitHub user or resource (${endpoint})`);
    }

    if (!res.ok) {
      throw new GitHubApiError(`GitHub API responded with status ${res.status}.`, res.status);
    }

    return res;
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      throw new RequestTimeoutError(`fetching GitHub profile (${endpoint})`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retrieves public GitHub profile intelligence and reconciles detected skills against Passport.
 */
export async function fetchGitHubProfileIntelligence(
  username: string,
  userPassport?: DeveloperPassport
): Promise<GitHubProfileIntelligence> {
  const cleanUsername = username.trim().replace(/^@/, '');
  if (!cleanUsername) {
    throw new GitHubNotFoundError('Username cannot be empty');
  }

  // 1. Fetch public user details
  const userRes = await githubFetch(`/users/${encodeURIComponent(cleanUsername)}`);
  const userData = await userRes.json();

  // 2. Fetch bounded public repositories (up to 10 most recently updated)
  let reposData: any[] = [];
  try {
    const reposRes = await githubFetch(`/users/${encodeURIComponent(cleanUsername)}/repos?sort=updated&per_page=10`);
    reposData = await reposRes.json();
  } catch {
    // Graceful fallback to empty repos if blocked
  }

  const repoList = Array.isArray(reposData) ? reposData : [];

  // Extract detected languages and topics
  const langCountMap = new Map<string, number>();
  const topicSet = new Set<string>();
  const topRepos = repoList.map((r: any) => {
    if (r.language) {
      langCountMap.set(r.language, (langCountMap.get(r.language) || 0) + 1);
    }
    if (Array.isArray(r.topics)) {
      r.topics.forEach((t: string) => topicSet.add(t.toLowerCase()));
    }
    return {
      name: r.name,
      description: r.description || null,
      language: r.language || null,
      stars: r.stargazers_count || 0,
      topics: Array.isArray(r.topics) ? r.topics : [],
      url: r.html_url,
      updated_at: r.updated_at,
    };
  });

  // Reconcile skills
  const detectedSkills: DetectedSkill[] = [];
  const processedSkills = new Set<string>();

  // A. Add technologies detected from public repos
  for (const [lang, count] of langCountMap.entries()) {
    processedSkills.add(lang.toLowerCase());
    const matchingRepoNames = topRepos
      .filter((r) => r.language?.toLowerCase() === lang.toLowerCase())
      .map((r) => r.name);

    detectedSkills.push({
      name: lang,
      evidence_status: 'repository_evidence_found',
      evidence_detail: `Detected as primary language in ${count} public repository snapshot(s): ${matchingRepoNames.slice(0, 3).join(', ')}`,
      source_repos: matchingRepoNames,
    });
  }

  // B. Cross-reference Passport self-reported languages and frameworks
  if (userPassport) {
    const selfReportedAll = [
      ...userPassport.languages,
      ...userPassport.frameworks,
    ];

    for (const skill of selfReportedAll) {
      const lower = skill.toLowerCase();
      if (!processedSkills.has(lower)) {
        processedSkills.add(lower);
        // Check if mentioned in repo topics or descriptions
        const matchingTopics = topRepos.filter(
          (r) =>
            r.topics.some((t: string) => t.toLowerCase().includes(lower)) ||
            (r.description && r.description.toLowerCase().includes(lower))
        );

        if (matchingTopics.length > 0) {
          detectedSkills.push({
            name: skill,
            evidence_status: 'repository_evidence_found',
            evidence_detail: `Mentioned in metadata/topics of repository: ${matchingTopics[0].name}`,
            source_repos: [matchingTopics[0].name],
          });
        } else {
          detectedSkills.push({
            name: skill,
            evidence_status: 'self_reported',
            evidence_detail: 'Self-reported in Developer Passport (no matching public repository code found in recent 10 repos)',
            source_repos: [],
          });
        }
      }
    }

    // C. Add learning goals as potential gaps
    for (const want of userPassport.want_to_learn) {
      if (!processedSkills.has(want.toLowerCase())) {
        processedSkills.add(want.toLowerCase());
        detectedSkills.push({
          name: want,
          evidence_status: 'potential_gap',
          evidence_detail: 'Explicitly declared as target learning technology in Developer Passport',
          source_repos: [],
        });
      }
    }
  }

  const recentActivitySummary = repoList.length > 0
    ? `Active in ${repoList.length} recent public projects. Top languages: ${Array.from(langCountMap.keys()).slice(0, 3).join(', ') || 'Various'}.`
    : 'No recent public repositories found on this GitHub account.';

  return {
    username: cleanUsername,
    name: userData.name || null,
    bio: userData.bio || null,
    avatar_url: userData.avatar_url || `https://github.com/${cleanUsername}.png`,
    html_url: userData.html_url || `https://github.com/${cleanUsername}`,
    public_repos_count: userData.public_repos || 0,
    detected_skills: detectedSkills,
    top_repositories: topRepos,
    recent_activity_summary: recentActivitySummary,
  };
}

/**
 * Curated public repositories representing diverse domains and languages.
 */
const CURATED_REPOSITORIES = [
  { owner: 'expressjs', repo: 'express', language: 'JavaScript', domain: 'Web Frameworks' },
  { owner: 'vitejs', repo: 'vite', language: 'TypeScript', domain: 'Developer Tools' },
  { owner: 'colinhacks', repo: 'zod', language: 'TypeScript', domain: 'Developer Tools' },
  { owner: 'tailwindlabs', repo: 'tailwindcss', language: 'TypeScript', domain: 'UI & Styling' },
  { owner: 'facebook', repo: 'react', language: 'JavaScript', domain: 'UI & Styling' },
  { owner: 'pallets', repo: 'flask', language: 'Python', domain: 'Web Frameworks' },
];

/**
 * Searches real open issues across selected/curated public repositories and ranks them
 * using a transparent, explainable heuristic matching the Developer Passport.
 */
export async function discoverPersonalizedIssues(
  passport: DeveloperPassport,
  fetchIssues: GitHubFetch = githubFetch
): Promise<DiscoveredIssue[]> {
  const issuesToEvaluate: Array<{
    owner: string;
    repo: string;
    rawIssue: any;
    repoMeta: { language: string; domain: string };
  }> = [];

  // Pick target repositories matching user languages or fallback
  const preferredLangs = (passport.languages || []).map((l) => l.toLowerCase());
  const preferredDomains = (passport.preferred_domains || []).map((d) => d.toLowerCase());

  const targetRepos = CURATED_REPOSITORIES.filter((cr) => {
    const langMatch = preferredLangs.includes(cr.language.toLowerCase());
    const domainMatch = preferredDomains.some((pd) => cr.domain.toLowerCase().includes(pd));
    return langMatch || domainMatch;
  });

  const selectedRepos = targetRepos.length >= 2 ? targetRepos.slice(0, 3) : CURATED_REPOSITORIES.slice(0, 3);

  // Fetch real open issues in parallel
  await Promise.all(
    selectedRepos.map(async ({ owner, repo, language, domain }) => {
      try {
        const res = await fetchIssues(`/repos/${owner}/${repo}/issues?state=open&per_page=6`);
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const item of list) {
            // Reject pull requests
            if (!item.pull_request) {
              issuesToEvaluate.push({
                owner,
                repo,
                rawIssue: item,
                repoMeta: { language, domain },
              });
            }
          }
        }
      } catch {
        // Skip inaccessible repo gracefully
      }
    })
  );

  // Score and rank issues
  const userLangSet = new Set((passport.languages || []).map((l) => l.toLowerCase()));
  const userLearnSet = new Set((passport.want_to_learn || []).map((l) => l.toLowerCase()));
  const userDomainSet = new Set((passport.preferred_domains || []).map((d) => d.toLowerCase()));
  const userFrameworkSet = new Set((passport.frameworks || []).map((f) => f.toLowerCase()));

  const scoredIssues: DiscoveredIssue[] = issuesToEvaluate.map(({ owner, repo, rawIssue, repoMeta }) => {
    let score = 40; // Base presence
    const matchReasons: string[] = [];
    const relevantSkills: string[] = [];
    const learningOpportunities: string[] = [];
    const uncertainties: string[] = [];

    const issueTitle = rawIssue.title || '';
    const issueBody = (rawIssue.body || '').slice(0, 1000);
    const combined = `${issueTitle} ${issueBody}`.toLowerCase();
    const labels = Array.isArray(rawIssue.labels)
      ? rawIssue.labels.map((l: any) => ({ name: l.name, color: l.color, description: l.description }))
      : [];

    // 1. Language Match (+25)
    if (userLangSet.has(repoMeta.language.toLowerCase())) {
      score += 25;
      matchReasons.push(`Matches your preferred language: ${repoMeta.language}`);
      relevantSkills.push(repoMeta.language);
    }

    // 2. Domain Match (+15)
    if (userDomainSet.has(repoMeta.domain.toLowerCase())) {
      score += 15;
      matchReasons.push(`Fits your target domain: ${repoMeta.domain}`);
    }

    // 3. Learning Goal Overlap (+20)
    for (const want of userLearnSet) {
      if (combined.includes(want) || repoMeta.domain.toLowerCase().includes(want)) {
        score += 20;
        matchReasons.push(`Contains target learning topic: ${want}`);
        learningOpportunities.push(want);
      }
    }

    // 4. Framework Overlap (+10)
    for (const fw of userFrameworkSet) {
      if (repo.toLowerCase().includes(fw) || combined.includes(fw)) {
        score += 10;
        matchReasons.push(`Involves familiar tool: ${fw}`);
        relevantSkills.push(fw);
      }
    }

    // 5. Label Heuristic: Good First Issue (+15 if beginner/intermediate)
    const hasGoodFirstLabel = labels.some((l: any) =>
      /good\s*first|beginner|easy|help\s*wanted/i.test(l.name)
    );

    let estimatedDifficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate';
    if (hasGoodFirstLabel) {
      estimatedDifficulty = 'beginner';
      if (passport.experience_level === 'beginner' || passport.preferred_difficulty === 'beginner') {
        score += 15;
        matchReasons.push('Tagged with newcomer-friendly label: good first issue');
      }
    } else if (combined.includes('refactor') || combined.includes('architecture') || combined.includes('rfc')) {
      estimatedDifficulty = 'advanced';
    }

    // Estimated difficulty fit (+10)
    if (
      passport.preferred_difficulty === 'any' ||
      passport.preferred_difficulty === estimatedDifficulty
    ) {
      score += 10;
      matchReasons.push(`Estimated difficulty (${estimatedDifficulty}) matches your preference`);
    }

    // Missing info check
    if (issueBody.length < 150) {
      uncertainties.push('Issue description is brief; local reproduction will be necessary.');
    }
    if (!labels.length) {
      uncertainties.push('Issue has no maintainer triage labels yet.');
    }
    if (uncertainties.length === 0) {
      uncertainties.push('Repository context and local reproduction still need verification before implementation.');
    }

    if (learningOpportunities.length === 0) {
      learningOpportunities.push(`Codebase conventions and architecture in ${owner}/${repo}`);
    }

    return {
      id: `${owner}_${repo}_${rawIssue.number}`,
      owner,
      repo,
      number: rawIssue.number,
      title: issueTitle,
      html_url: rawIssue.html_url,
      labels,
      state: rawIssue.state === 'closed' ? 'closed' : 'open',
      created_at: rawIssue.created_at,
      estimated_difficulty: estimatedDifficulty,
      match_score: Math.min(100, score),
      match_reasons: matchReasons.length > 0 ? matchReasons : ['Active open-source issue in popular repository'],
      relevant_skills: Array.from(new Set(relevantSkills)),
      learning_opportunities: learningOpportunities,
      uncertainties,
    };
  });

  // Sort by match score descending
  scoredIssues.sort((a, b) => b.match_score - a.match_score);
  return scoredIssues.slice(0, 8);
}
