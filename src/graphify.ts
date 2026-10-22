/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface GraphifyCodebaseContext {
  summary: string;
  relatedPaths: string[];
}

/**
 * Optional Graphify integration adapter.
 * Placeholder until Graphify service interface is available.
 * Returns null by default to indicate no external graph service was invoked.
 */
export async function getCodebaseContext(
  _owner: string,
  _repo: string
): Promise<null | GraphifyCodebaseContext> {
  // Graphify is optional and disabled in this MVP.
  // FirstPatch relies on verified GitHub tree snapshots and source files.
  return null;
}
