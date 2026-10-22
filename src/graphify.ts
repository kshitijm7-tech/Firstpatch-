/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
}

const GRAPHIFY_TIMEOUT_MS = 2500;

/**
 * Optional Graphify integration adapter.
 * Configured with a bounded timeout and graceful fallback to null.
 * Disabled by default unless explicitly configured via GRAPHIFY_ENDPOINT or environment.
 */
export async function getCodebaseContext(
  owner: string,
  repo: string
): Promise<null | GraphifyCodebaseContext> {
  // If not enabled or no endpoint configured, return null gracefully immediately
  const endpoint = process.env.GRAPHIFY_ENDPOINT?.trim();
  if (!endpoint || process.env.GRAPHIFY_ENABLED !== 'true') {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GRAPHIFY_TIMEOUT_MS);

  try {
    const res = await fetch(`${endpoint}/context?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data || typeof data !== 'object') {
      return null;
    }

    return {
      summary: typeof data.summary === 'string' ? data.summary : '',
      relatedPaths: Array.isArray(data.relatedPaths) ? data.relatedPaths : [],
      relationships: Array.isArray(data.relationships) ? data.relationships : [],
      isAvailable: true,
    };
  } catch {
    // Timeout or network error gracefully falls back to null
    return null;
  } finally {
    clearTimeout(timer);
  }
}
