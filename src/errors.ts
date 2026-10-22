/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly resetTime?: string;

  constructor(message: string, code: string, statusCode = 400, resetTime?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = message;
    this.statusCode = statusCode;
    this.resetTime = resetTime;
  }
}

export class InvalidUrlError extends AppError {
  constructor(message: string) {
    super(
      message || 'Invalid GitHub issue URL. Expected format: https://github.com/owner/repo/issues/123',
      'INVALID_URL',
      400
    );
  }
}

export class PullRequestUrlError extends AppError {
  constructor() {
    super(
      'The provided URL points to a pull request, not an issue. FirstPatch only analyzes public GitHub issues.',
      'PULL_REQUEST_NOT_SUPPORTED',
      400
    );
  }
}

export class GitHubNotFoundError extends AppError {
  constructor(resource: string) {
    super(
      `GitHub ${resource} not found. Please ensure the repository and issue are public and spelled correctly.`,
      'GITHUB_NOT_FOUND',
      404
    );
  }
}

export class GitHubRateLimitError extends AppError {
  constructor(resetTimestamp?: number) {
    const resetDate = resetTimestamp ? new Date(resetTimestamp * 1000).toLocaleTimeString() : undefined;
    const msg = resetDate
      ? `GitHub API rate limit exceeded. Rate limit resets at ${resetDate}. Consider configuring a GITHUB_TOKEN on the server for higher limits.`
      : 'GitHub API rate limit reached. Please wait a moment or configure a server-side GITHUB_TOKEN.';
    super(msg, 'GITHUB_RATE_LIMIT', 429, resetDate);
  }
}

export class GitHubApiError extends AppError {
  constructor(message: string, statusCode = 502) {
    super(message || 'Failed to communicate with GitHub API.', 'GITHUB_API_ERROR', statusCode);
  }
}

export class ModelConfigError extends AppError {
  constructor(message: string) {
    super(
      message,
      'MODEL_CONFIG_ERROR',
      500
    );
  }
}

export class ModelUnavailableError extends AppError {
  constructor(message: string) {
    super(
      message || 'The configured AI model is temporarily unavailable or quota has been reached.',
      'MODEL_UNAVAILABLE',
      503
    );
  }
}

export class ModelOutputValidationError extends AppError {
  constructor(message: string) {
    super(
      message || 'Model output failed schema validation after corrective retry.',
      'MODEL_VALIDATION_ERROR',
      502
    );
  }
}

export class RequestTimeoutError extends AppError {
  constructor(operation: string) {
    super(
      `Request timed out while ${operation}. Please try again later.`,
      'REQUEST_TIMEOUT',
      504
    );
  }
}

/**
 * Sanitizes errors to never expose secret keys, internal stack traces, or raw provider dumps.
 */
export function sanitizeError(err: unknown): { error: string; code: string; resetTime?: string } {
  if (err instanceof AppError) {
    return {
      error: err.userMessage,
      code: err.code,
      resetTime: err.resetTime,
    };
  }

  const rawMessage = (err instanceof Error) ? err.message : String(err);

  // Guard against leaking API keys in raw error strings
  const cleaned = rawMessage
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/ghp_[0-9A-Za-z]{36}/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/github_pat_[0-9A-Za-z_]{82}/g, '[REDACTED_GITHUB_PAT]');

  return {
    error: 'An unexpected error occurred while processing the request. Please try again.',
    code: 'INTERNAL_ERROR',
  };
}
