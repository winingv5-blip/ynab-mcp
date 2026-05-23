## Context

Brand-new project. No existing code. YNAB exposes a REST API with a free personal access token — no OAuth needed for single-user use. The MCP protocol lets Claude discover and call tools; the server runs as a local process spawned by Claude Desktop.

YNAB API quirks that shape the design:
- All amounts are in **milliunits** (1/1000 of currency unit). $13.00 = 13000.
- Outflows (spending) are **negative**, inflows are **positive**.
- Categories and accounts are referenced by UUID in the API but by name in conversation.
- Most endpoints require a `budget_id`; the magic value `"last-used"` covers the common case.
- Split transactions have subtransactions that must sum to the parent amount.

## Goals / Non-Goals

**Goals:**
- Full read/write YNAB access from Claude (~20 tools)
- Clean dollar-based interface (milliunits hidden from Claude)
- Name-to-ID resolution for categories, accounts, payees
- First-class support for split transactions and scheduled transactions
- Simple local setup: clone, add token, configure Claude Desktop

**Non-Goals:**
- Multi-user / OAuth support
- Multiple simultaneous budget support (last-used default covers single-user needs)
- A web UI or HTTP API layer
- Real-time webhooks or push notifications

## Decisions

### 1. TypeScript + official YNAB JS SDK

**Decision:** Use TypeScript with the `ynab` npm package.

**Rationale:** The official YNAB SDK provides fully-typed response objects, eliminating hand-written type definitions for every API response. TypeScript catches milliunit/dollar conversion errors at compile time. The MCP SDK (`@modelcontextprotocol/sdk`) also has first-class TypeScript support.

**Alternatives considered:** Python — fewer examples, no official YNAB SDK, more glue code.

### 2. Budget ID defaulting to `"last-used"`

**Decision:** All tools accept an optional `budget_id` parameter defaulting to `"last-used"`.

**Rationale:** Personal-use single-budget workflow. YNAB natively supports this magic ID. Claude doesn't need to look up budget IDs for the common case, but power users with multiple budgets can override.

**Alternatives considered:** Require explicit budget selection on every call — too much friction; store a configured default in `.env` — adds setup complexity with no benefit over YNAB's own mechanism.

### 3. Dollar-based amounts, internal milliunit conversion

**Decision:** All tool inputs/outputs use dollars (floating point). Conversion happens in a shared helper.

**Rationale:** Claude will express amounts as dollars. Exposing milliunits would cause constant off-by-1000 errors. Centralizing conversion in one helper (`toMilliunits` / `fromMilliunits`) makes it easy to audit.

### 4. Name-to-ID resolution at call time

**Decision:** Tools that write data accept human-readable names (category name, account name, payee name) and resolve to IDs by fetching the relevant list and fuzzy-matching.

**Rationale:** Claude knows names, not UUIDs. Embedding ID lookup in each write tool keeps the tool interface natural. The cost is one extra API call per write operation — acceptable for personal interactive use.

**Alternatives considered:** Require IDs — terrible UX; cache ID maps in memory — adds complexity, stale cache risk.

### 5. File structure — tools split by domain

**Decision:**
```
src/
  index.ts           ← server setup, tool registration
  client.ts          ← YNAB SDK singleton, dollar↔milliunit helpers
  tools/
    accounts.ts      ← get_budgets, get_accounts
    transactions.ts  ← get/create/update/delete/approve transactions
    budget.ts        ← categories, move_money, month summary
    scheduled.ts     ← scheduled transaction CRUD
```

**Rationale:** Keeps files focused (~100-200 lines each). Domain grouping matches YNAB API resource grouping. `index.ts` stays thin — just imports and registers tool arrays from each domain file.

### 6. Zod for tool input validation

**Decision:** Define tool input schemas with Zod; derive MCP JSON Schema from them.

**Rationale:** Single source of truth for validation and type inference. Catches bad inputs before they hit the YNAB API with clearer error messages.

## Risks / Trade-offs

- **YNAB API rate limits** (200 req/hour) → For conversational use this is fine; bulk operations could hit limits. Mitigation: document the limit; no automatic retry logic needed.
- **Name matching ambiguity** → If two categories share a name, the first match wins. Mitigation: return a helpful error asking the user to be more specific.
- **Milliunit rounding** → Dollar amounts with more than 3 decimal places lose precision. Mitigation: round to nearest milliunit on input; irrelevant in practice for budget amounts.
- **YNAB API token in plaintext `.env`** → Standard personal-tool risk. Mitigation: `.env` in `.gitignore`, `.env.example` committed instead.

## Migration Plan

New project — no migration. Setup steps:
1. `npm install`
2. `npm run build`
3. Add `YNAB_API_TOKEN` to `.env`
4. Add server entry to `claude_desktop_config.json`
5. Restart Claude Desktop
