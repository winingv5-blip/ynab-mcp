## Why

YNAB's own interface makes it hard to query and act on budget data conversationally — finding patterns, moving money, or describing transactions requires navigating multiple screens. An MCP server exposes YNAB's full API as Claude tools, enabling natural-language budget management from within Claude.

## What Changes

- New TypeScript MCP server project (`ynab-mcp`) built from scratch
- Full read/write access to YNAB via the official YNAB JavaScript SDK
- ~20 tools covering accounts, transactions, scheduled transactions, and budget management
- Personal-use design: single API token in `.env`, no OAuth flow required
- Amounts handled in dollars (converted to YNAB milliunits internally)
- Budget selection defaults to `"last-used"` with optional override

## Capabilities

### New Capabilities

- `server-setup`: MCP server scaffolding, YNAB client initialization, milliunit helpers, and tool registration
- `account-tools`: Read-only tools for listing budgets and accounts with balances
- `transaction-tools`: Full CRUD for transactions including split transaction support
- `scheduled-transaction-tools`: Full CRUD for scheduled/recurring transactions
- `budget-tools`: Category queries, monthly budget summaries, and moving money between categories

### Modified Capabilities

## Impact

- New project with no existing code — no migration concerns
- Dependencies: `@modelcontextprotocol/sdk`, `ynab` (official JS SDK), `typescript`, `zod`
- Requires a YNAB personal access token (free, from YNAB developer settings)
- Configured in Claude Desktop via `claude_desktop_config.json`
