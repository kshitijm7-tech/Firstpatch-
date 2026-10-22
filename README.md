# FirstPatch

**Understand a real open-source issue, explore the code behind it, and leave with an evidence-backed contribution plan.**

FirstPatch is an evidence-first open-source contribution investigation tool.

---

## The Differentiating Workflow: Impact Trail

```
Real GitHub issue ──▶ Issue requirements ──▶ Candidate code files ──▶ Traceable code evidence ──▶ Likely impact ──▶ Prioritized investigation plan
```

The **Impact Trail** provides:

1. **Issue Requirements Extraction**:
   - Reported defect or feature requirement.
   - Expected behavior.
   - Architectural and backwards-compatibility constraints.
   - Unanswered questions requiring contributor clarification.
   - Factual claims grounded against original issue text and comments.

2. **Candidate Code Files (Up to 5)**:
   - Evaluated using stack traces, backticked tokens, issue keywords, and recursive Git tree snapshots.
   - Each file displays its path, status (`exists`, `not_found_in_complete_tree`, `not_checked`), evidence status (`verified`, `partial`, `unsupported`), and calculated line numbers (`#L...`).
   - Direct validated GitHub links with exact line anchors.

3. **Interactive Relationship View**:
   - Visual issue-to-code relationship map connecting the origin issue, candidate files, and symbols.
   - Distinguishes **Verified Sources** (solid edges grounded in issue mentions or source references) from **AI Hypotheses** (dashed edges with hypothesis tags).
   - Selecting any node or edge opens the **Evidence Drawer**.

4. **Evidence Drawer**:
   - Repository-relative path.
   - Verbatim supporting excerpt with computed 1-indexed line numbers.
   - Direct GitHub file and branch link.
   - Rationale explaining why this evidence matters.
   - Evidence status: `verified`, `partial`, or `unsupported`.

5. **Prioritized 6-Facet Investigation Plan**:
   - **Inspect First**: Specific file, line, or configuration to start with.
   - **Execution Path to Trace**: Recommended code path and call chain.
   - **Project Conventions**: Coding style, lint rules, and architectural patterns.
   - **Tests to Inspect (NOT RUN)**: Existing test suites to inspect and run locally. FirstPatch never executes commands.
   - **Likely Impact & Regressions**: Potential breakages and downstream consumer impact.
   - **Human Investigation Questions**: Critical architectural decisions requiring maintainer review.

---

## Core Principles & Security Guarantee

- **Zero Command Execution**: FirstPatch never executes shell commands or suggested tests. All tests are marked `NOT RUN`.
- **Zero Repository Cloning**: All repository information is obtained via read-only GitHub REST API snapshots.
- **Untrusted External Data Isolation**: Issue descriptions, comments, and repository source code are boxed in `<UNTRUSTED_REPOSITORY_DATA>` blocks preceded by strict `<SECURITY_DIRECTIVE>` warnings.
- **Server-Side API Key Security**: `GEMINI_API_KEY` and optional `GITHUB_TOKEN` remain strictly on the server and are scrubbed from all error responses.
- **Bounded Context**: Tree scans are capped at 3,000 files; candidate files are bounded at 6 files (<100 KB each); comments are capped at 15.

---

## Architecture & Module Organization

```
├── server.ts                             # Express backend entry point + Vite middleware mounting
├── src/
│   ├── parseIssueUrl.ts                  # Strict GitHub issue URL validator (HTTPS, domain, path, PR reject)
│   ├── github.ts                         # GitHub REST API client (tree, README, comments, candidate scoring)
│   ├── prompt.ts                         # Defensive prompt builder with security directives & Impact Trail
│   ├── gemma.ts                          # @google/genai SDK model caller with Zod validation & retry
│   ├── schema.ts                         # Zod schemas for Guide and Impact Trail
│   ├── validate.ts                       # Server-side evidence grounding, line numbers, and tree verification
│   ├── errors.ts                         # Typed error classes and secret-scrubbing error sanitizer
│   ├── graphify.ts                       # Optional Graphify adapter with bounded timeout & fallback
│   ├── App.tsx                           # Main React SPA component
│   └── components/
│       ├── TopBar.tsx                    # Top Bar Contract header with Impact Trail navigation
│       ├── IssueInput.tsx                # Issue URL input with verified public issue examples
│       ├── ProgressIndicator.tsx            # 5-step pipeline progress visualizer
│       ├── GuideView.tsx                 # Complete guide display with 4 integrity sections & Markdown export
│       ├── ErrorAlert.tsx                # Actionable error cards (404, rate-limits, PRs, timeouts)
│       ├── HealthModal.tsx               # Configuration and service health inspector (/api/health)
│       └── ImpactTrail/
│           ├── ImpactTrailView.tsx       # 3-panel responsive Impact Trail container
│           ├── RelationshipGraph.tsx     # Issue-to-code interactive relationship map
│           └── EvidenceDrawer.tsx        # Evidence inspection card & 6-facet investigation plan
└── test/
    └── run-tests.ts                      # Unit tests (URL, schema, grounding, line numbers, injection fixture)
```

---

## Environment Variables & Setup

Support the following server-side environment variables:

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | API key for Gemini / Gemma models via `@google/genai`. Injected automatically in AI Studio. |
| `GEMMA_MODEL` | **Yes** | Exact accessible Gemma 4 model ID configured in the AI Studio Secrets panel or `.env`; FirstPatch rejects non-Gemma-4 model IDs. |
| `OLLAMA_ENABLED` | Optional | Set to `true` to enable local Phi/Llama fallback through Ollama when Gemma 4 is unavailable. |
| `OLLAMA_BASE_URL` | Optional | Ollama server URL (default: `http://localhost:11434`). |
| `OLLAMA_PHI_MODEL` | Optional | Installed Ollama Phi model name, used first as fallback. |
| `OLLAMA_LLAMA_MODEL` | Optional | Installed Ollama Llama model name, used second as fallback. |
| `GITHUB_TOKEN` | Optional | GitHub personal access token with public read access to increase rate limits from 60 to 5,000 req/hr. |
| `GRAPHIFY_ENABLED` | Optional | Set to `true` to try the bounded external Graphify adapter; the local evidence-backed fallback remains available. |
| `GRAPHIFY_ENDPOINT` | Optional | Server-side HTTPS endpoint exposing the Graphify `/context` contract. Never expose credentials in the browser. |
| `PORT` | Optional | Port for the HTTP server (default: `3000`). |

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
Executes the comprehensive unit test suite (24 tests) covering:
- GitHub issue URL validation, SSRF vectors, and pull-request rejection.
- Model guide and Impact Trail schema validation.
- Evidence grounding, line number calculation, and excerpt verification.
- Repository tree completeness and traversal protection.
- Prompt-injection isolation fixture.
- Key/token sanitization in error handling.

### Production Build
```bash
npm run build
npm start
```

---

## Repeatable Demo Flow

1. Open FirstPatch in your browser.
2. In the URL input field, click any verified example (e.g., `expressjs/express #7538` or `vitejs/vite #23860`), or paste a public GitHub issue URL.
3. Click **Analyze Issue**.
4. Review the generated **Impact Trail**:
   - **Issue Requirements**: Read extracted problem, expected behavior, and constraints.
   - **Candidate Files**: Click any candidate file to inspect its relevance and verified line numbers.
   - **Relationship Map**: View the issue-to-code connections; notice the distinction between verified links and AI hypotheses.
   - **Evidence Drawer**: Review verbatim excerpts, line anchors, and why the evidence matters.
   - **Prioritized Plan**: Read the 6-facet investigation plan.
5. Review the remaining four integrity sections (*Verified from GitHub*, *AI Suggestions*, *Relevant Files*, *Suggested Tests — NOT RUN*).
6. Click **Copy Markdown** to copy the complete guide and Impact Trail into your clipboard.
7. Click **System Status** in the header to inspect engine health and configuration status (`/api/health`).
