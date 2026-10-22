/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseIssueUrl } from './src/parseIssueUrl.js';
import { fetchGitHubContext } from './src/github.js';
import { buildContributionPrompt } from './src/prompt.js';
import { generateContributionGuide } from './src/gemma.js';
import { validateGuide } from './src/validate.js';
import { getCodebaseContext, getLocalCodebaseContext } from './src/graphify.js';
import { AppError, sanitizeError } from './src/errors.js';
import { DeveloperPassportSchema } from './src/schema.js';
import { validateGraph } from './src/validate.js';
import { fetchGitHubProfileIntelligence, discoverPersonalizedIssues } from './src/passport.js';
import { ZodError } from 'zod';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('--production');

// Strict body parser bounded to 100 KB
app.use(express.json({ limit: '100kb' }));

// In-memory demo rate limiter (resets on server restart)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_REQUESTS = 30;

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const forwarded = typeof req.headers['x-forwarded-for'] === 'string'
    ? req.headers['x-forwarded-for'].split(',')[0].trim()
    : '';
  const clientIp = (forwarded || req.socket.remoteAddress || 'unknown').slice(0, 100);
  const now = Date.now();

  const record = rateLimitMap.get(clientIp);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return next();
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const minutesLeft = Math.ceil((record.resetAt - now) / 60000);
    res.status(429).json({
      error: `Too many requests from this IP. Please wait ${minutesLeft} minute(s) before trying again. Note: In-memory rate limiting is demo-level.`,
      code: 'CLIENT_RATE_LIMIT',
      resetTime: new Date(record.resetAt).toISOString(),
    });
    return;
  }

  record.count += 1;
  next();
}

// Clean up stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// API Routes

/**
 * Health check endpoint - returns service health and configuration flags without secrets.
 */
app.get('/api/health', (_req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const modelId = process.env.GEMMA_MODEL?.trim() || null;
  const hasGithubToken = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0);

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      geminiApiKeyConfigured: hasGeminiKey,
      gemmaModelConfigured: Boolean(modelId),
      modelId: modelId,
      githubTokenConfigured: hasGithubToken,
      ollamaEnabled: process.env.OLLAMA_ENABLED === 'true',
      ollamaBaseUrlConfigured: Boolean(process.env.OLLAMA_BASE_URL?.trim()),
      ollamaPhiModelConfigured: Boolean(process.env.OLLAMA_PHI_MODEL?.trim()),
      ollamaLlamaModelConfigured: Boolean(process.env.OLLAMA_LLAMA_MODEL?.trim()),
    },
    service: 'FirstPatch Analysis Engine',
  });
});

/**
 * GitHub Profile Intelligence endpoint
 */
app.post('/api/profile', rateLimiter, async (req, res) => {
  try {
    const { username, passport: rawPassport } = req.body || {};
    if (!username || typeof username !== 'string' || !/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username.replace(/^@/, '').trim())) {
      return res.status(400).json({
        error: 'Missing or invalid GitHub username.',
        code: 'INVALID_USERNAME',
      });
    }

    const passport = DeveloperPassportSchema.parse(rawPassport || {});
    const profileIntelligence = await fetchGitHubProfileIntelligence(username, passport);
    return res.json({ intelligence: profileIntelligence });
  } catch (err: unknown) {
    const sanitized = sanitizeError(err);
    const statusCode = err instanceof ZodError ? 400 : err instanceof AppError ? err.statusCode : 500;
    return res.status(statusCode).json(sanitized);
  }
});

/**
 * Personalized Issue Discovery endpoint
 */
app.post('/api/discover', rateLimiter, async (req, res) => {
  try {
    const { passport: rawPassport } = req.body || {};
    const safePassport = DeveloperPassportSchema.parse(rawPassport || {});

    const issues = await discoverPersonalizedIssues(safePassport);
    return res.json({ issues, total_evaluated: issues.length });
  } catch (err: unknown) {
    const sanitized = sanitizeError(err);
    const statusCode = err instanceof ZodError ? 400 : err instanceof AppError ? err.statusCode : 500;
    return res.status(statusCode).json(sanitized);
  }
});

/**
 * Main Analysis endpoint
 */
app.post('/api/analyze', rateLimiter, async (req, res) => {
  try {
    const { url, passport: rawPassport } = req.body || {};

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'Missing required "url" parameter in request body.',
        code: 'MISSING_URL',
      });
    }

    // Step 1: Validate GitHub issue URL
    const parsed = parseIssueUrl(url);
    const passport = DeveloperPassportSchema.parse(rawPassport || {});

    // Step 2: Fetch real issue and repository data from GitHub
    const githubContext = await fetchGitHubContext(
      parsed.owner,
      parsed.repo,
      parsed.issueNumber
    );

    // Build a bounded local graph from the retrieved snapshot first. An
    // optional native Graphify response may enrich it, but never bypasses
    // server-side evidence validation.
    const localGraphContext = getLocalCodebaseContext(githubContext);
    const nativeGraphContext = await getCodebaseContext(parsed.owner, parsed.repo);
    const candidateGraphContext = nativeGraphContext?.graph
      ? nativeGraphContext
      : localGraphContext;
    const validatedGraph = validateGraph(candidateGraphContext.graph, githubContext);
    const graphifyStatus = nativeGraphContext?.graph
      ? 'native' as const
      : validatedGraph.status === 'unavailable'
      ? 'unavailable' as const
      : 'local_fallback' as const;
    const graphifyUsed = graphifyStatus === 'native';

    // Step 3: Construct prompt with defensive security directives & developer passport
    const prompt = buildContributionPrompt(githubContext, passport, validatedGraph);

    // Step 4: Invoke configured Gemma model with SDK and schema validation
    const { guide: rawGuide, modelId, provider, fallbackUsed } = await generateContributionGuide(prompt);

    // Step 5: Validate model guide against real source registry and file tree
    const { guide: validatedGuide, meta } = validateGuide(
      rawGuide,
      githubContext,
      modelId,
      graphifyUsed,
      passport,
      validatedGraph,
      graphifyStatus,
      provider,
      fallbackUsed
    );

    // Return complete, verified analysis result
    return res.json({
      issue: githubContext.issue,
      repository: githubContext.repository,
      guide: validatedGuide,
      meta,
    });
  } catch (err: unknown) {
    const sanitized = sanitizeError(err);
    const statusCode = err instanceof ZodError ? 400 : err instanceof AppError ? err.statusCode : 500;
    return res.status(statusCode).json(sanitized);
  }
});

// Keep parser and unexpected middleware failures JSON-shaped and free of
// framework/provider details.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Request body must contain valid JSON.', code: 'INVALID_JSON' });
  }
  return res.status(500).json({ error: 'An unexpected error occurred while processing the request.', code: 'INTERNAL_ERROR' });
});

// Dev server vs Production setup
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static frontend build in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FirstPatch server running on http://0.0.0.0:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start FirstPatch server:', err);
  process.exit(1);
});
