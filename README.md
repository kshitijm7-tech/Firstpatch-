# FirstPatch

**Understand a real open-source issue, explore the code behind it, and leave with an evidence-backed contribution plan.**

FirstPatch is a full-stack developer tool built to analyze public GitHub issues, cross-reference repository source trees, and produce structured, evidence-grounded contribution guides using Gemma.

---

## Key Features

1. **End-to-End Issue Analysis**:
   - Accepts public GitHub issue URLs (`https://github.com/{owner}/{repo}/issues/{number}`).
   - Fetches real issue metadata, author, labels, and issue discussion comments.
   - Retrieves repository metadata, README, CONTRIBUTING documentation, and recursive file tree snapshots.
   - Intelligent candidate file selection: scores candidate source files using stack traces, backticked tokens, and issue keyword relevance.

2. **Server-Side Evidence Grounding (`src/validate.ts`)**:
   - **Verified from GitHub**: Cites specific `source_id` entries with verbatim excerpts verified against fetched text snapshots. Flags any fact that cannot be substantiated.
   - **Snapshot File Tree Integrity**: Checks file paths against the repository tree snapshot. Categorizes files as `exists`, `not_found_in_complete_tree`, or `not_checked` (if tree retrieval was partial).
   - **Suggested Tests — NOT RUN**: Strict integrity guarantee. FirstPatch never executes test commands or shell scripts. Tests are flagged `status: "not_run"` for contributor execution.
   - **AI Suggestions Notice**: AI hypotheses and recommendations are separated from verified facts and labeled with confidence levels and human review notices.

3. **Security & Prompt-Injection Isolation**:
   - **Untrusted External Data Boundary**: Issue bodies, comments, README files, and repository source code are explicitly encapsulated within an untrusted data block with security directives warning against prompt injection.
   - **Zero Secret Leaks**: API keys (`GEMINI_API_KEY`) and tokens (`GITHUB_TOKEN`) reside exclusively on the server and are scrubbed from all error responses.
   - **Zero Code Execution**: No repositories are cloned, no dependencies are installed from analyzed repositories, and no pull requests are opened.
   - **Rate Limiting & Timeouts**: In-memory rate limiting and request timeouts protect the server against abuse.

4. **Optional Graphify Integration (`src/graphify.ts`)**:
   - Includes a non-blocking adapter placeholder ready for Graphify when available. FirstPatch functions completely without Graphify.

---

## Architecture & Module Organization

```
├── server.ts                  # Express backend entry point + Vite middleware mounting
├── src/
│   ├── parseIssueUrl.ts       # Strict GitHub issue URL validator (HTTPS, domain, path, PR reject)
│   ├── github.ts              # GitHub REST API client (tree, README, comments, candidate scoring)
│   ├── prompt.ts              # Defensive prompt builder with security directives
│   ├── gemma.ts               # @google/genai SDK model caller with Zod validation & retry
│   ├── schema.ts              # Zod schemas for raw model guide and validated response
│   ├── validate.ts            # Server-side evidence grounding and tree verification logic
│   ├── errors.ts              # Typed error classes and secret-scrubbing error sanitizer
│   ├── graphify.ts            # Optional Graphify adapter placeholder
│   ├── App.tsx                # Main React SPA component
│   └── components/
│       ├── TopBar.tsx         # Top Bar Contract header
│       ├── IssueInput.tsx     # Issue URL input with verified public issue examples
│       ├── ProgressIndicator.tsx # 5-step pipeline progress visualizer
│       ├── GuideView.tsx      # 4 distinct sections, Markdown export, and evidence registry
│       ├── ErrorAlert.tsx     # Actionable error cards (404, rate-limits, PRs, timeouts)
│       └── HealthModal.tsx    # Configuration and service health inspector (/api/health)
└── test/
    └── run-tests.ts           # Unit tests (URL, schema, grounding, tree, injection fixture)
```

---

## Environment Variables & Setup

Support the following server-side environment variables:

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | API key for Gemini / Gemma models via `@google/genai`. Configured in AI Studio Secrets panel. |
| `GEMMA_MODEL` | **Yes** | Exact model ID (e.g. `gemini-2.5-flash` or `gemini-3.8-flash`). |
| `GITHUB_TOKEN` | Optional | GitHub personal access token with public read access to increase rate limits from 60 to 5,000 req/hr. |
| `PORT` | Optional | Port for the HTTP server (default: `3000`). |

### How to configure in Google AI Studio

1. Open the **Settings > Secrets** panel in the AI Studio UI.
2. Ensure your `GEMINI_API_KEY` is present.
3. Configure `GEMMA_MODEL` (e.g. `gemini-2.5-flash`).
4. (Optional) Add `GITHUB_TOKEN` for higher GitHub rate limits.

> **Important**: Never paste your API keys into frontend code or commit `.env` files with credentials. Use `.env.example` as a template only.

---

## Running the Application

### Development
```bash
npm run dev
```
Starts the full-stack server on `http://localhost:3000` with live Vite integration.

### Testing
```bash
npm test
```
Executes the comprehensive unit test suite covering:
- GitHub issue URL validation, SSRF vectors, and pull-request rejection.
- Model guide schema validation.
- Evidence grounding and excerpt verification.
- Repository tree completeness and traversal protection.
- Prompt-injection isolation fixture.
- Secret sanitization and error masking.

### Production Build
```bash
npm run build
npm start
```

---

## Repeatable Demo Flow

1. Open FirstPatch in your browser.
2. In the URL input field, click any of the verified public examples (e.g., `facebook/react #28000` or `vitejs/vite #14000`), or paste a public GitHub issue URL.
3. Click **Analyze Issue**.
4. Observe the 5-step pipeline progress:
   - Validating URL
   - Fetching GitHub context
   - Scanning file tree & candidate files
   - Gemma reasoning
   - Server-side evidence validation
5. Review the generated contribution guide across the 4 distinct sections:
   - **1. Verified from GitHub**: Read grounded facts with verbatim excerpts and links to GitHub sources.
   - **2. AI Suggestions**: Review suggested hypotheses with confidence ratings and human review disclaimers.
   - **3. Relevant Repository Files**: Inspect verified file paths with snapshot existence statuses.
   - **4. Suggested Tests — NOT RUN**: Check suggested test commands and copy them for local execution.
6. Click **Copy Markdown** to copy the entire guide into your clipboard for your issue comment or pull request draft.
7. Click **System Status** in the header to inspect engine health and configuration status (`/api/health`).

---

## Known Limitations

- **In-Memory Rate Limiting**: The built-in rate limiter is memory-backed and resets if the server restarts.
- **Tree Capping**: Very large repositories (>3,000 files) are capped to prevent memory bloat; files outside the snapshot are marked `not_checked` rather than nonexistent.
- **Read-Only**: FirstPatch does not run tests, clone repos, or push commits. Contributor verification must take place in your local clone.
