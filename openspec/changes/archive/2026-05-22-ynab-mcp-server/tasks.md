## 1. Project Scaffold

- [x] 1.1 Initialize `package.json` with name, scripts (`build`, `start`, `dev`), and dependencies: `@modelcontextprotocol/sdk`, `ynab`, `zod`, `dotenv`
- [x] 1.2 Add dev dependencies: `typescript`, `@types/node`, `tsx`
- [x] 1.3 Create `tsconfig.json` targeting `ES2022`, `NodeNext` module resolution, output to `dist/`
- [x] 1.4 Create `.env.example` with `YNAB_API_TOKEN=your_token_here`
- [x] 1.5 Create `.gitignore` covering `node_modules/`, `dist/`, `.env`

## 2. Core Server & Client

- [x] 2.1 Create `src/client.ts` — initialize YNAB API client singleton from `YNAB_API_TOKEN`, exit with clear error if token missing
- [x] 2.2 Add `toMilliunits(dollars: number): number` and `fromMilliunits(milliunits: number): number` helpers to `src/client.ts`
- [x] 2.3 Create `src/index.ts` — initialize MCP `Server` instance, configure stdio transport, import and register tools from all domain modules, call `server.connect()`

## 3. Account Tools

- [x] 3.1 Create `src/tools/accounts.ts` with `get_budgets` tool — calls `ynabClient.budgets.getBudgets()`, returns id/name/last_modified_on for each budget
- [x] 3.2 Add `get_accounts` tool to `src/tools/accounts.ts` — accepts optional `budget_id` (default `"last-used"`) and `include_closed` (default `false`), returns accounts with dollar balances

## 4. Transaction Tools

- [x] 4.1 Create `src/tools/transactions.ts` with `get_transactions` tool — accepts `budget_id`, `since_date`, `account_name`, `category_name`, `unapproved_only`; resolves account/category names to IDs; returns transactions with dollar amounts
- [x] 4.2 Add name-to-ID helper functions in `src/tools/transactions.ts` for resolving account and category names (fetch list, find match, throw on ambiguity)
- [x] 4.3 Add `create_transaction` tool — accepts `account_name`, `date`, `amount`, `payee_name`, optional `category_name`, `memo`, `flag_color`, `subtransactions`; validates split totals match parent; creates via YNAB API
- [x] 4.4 Add `update_transaction` tool — accepts `id` and any updatable fields (`memo`, `category_name`, `flag_color`, `approved`, `cleared`); applies partial update via YNAB API
- [x] 4.5 Add `approve_transactions` tool — fetches unapproved transactions (with optional `account_name` filter), bulk-approves via YNAB API, returns count approved
- [x] 4.6 Add `delete_transaction` tool — accepts `id`, calls YNAB delete endpoint, returns confirmation

## 5. Scheduled Transaction Tools

- [x] 5.1 Create `src/tools/scheduled.ts` with `get_scheduled_transactions` tool — returns all scheduled transactions with dollar amounts and human-readable frequency
- [x] 5.2 Add `create_scheduled_transaction` tool — accepts `account_name`, `date_first`, `frequency`, `amount`, `payee_name`, optional `category_name` and `memo`; validates frequency enum; resolves names to IDs
- [x] 5.3 Add `update_scheduled_transaction` tool — accepts `id` and updatable fields (`amount`, `date_next`, `frequency`, `memo`, `category_name`, `payee_name`)
- [x] 5.4 Add `delete_scheduled_transaction` tool — accepts `id`, deletes via YNAB API, returns confirmation

## 6. Budget Tools

- [x] 6.1 Create `src/tools/budget.ts` with `get_categories` tool — returns all non-hidden category groups and categories with dollar amounts (budgeted/activity/balance), excluding internal YNAB categories
- [x] 6.2 Add `get_month_summary` tool — accepts optional `month` (YYYY-MM-DD, defaults to current month), returns income/budgeted/activity/to_be_budgeted/age_of_money in dollars
- [x] 6.3 Add `update_category_budget` tool — accepts `category_name`, `amount`, optional `month`; resolves category name; updates budgeted amount via YNAB API
- [x] 6.4 Add `move_money` tool — accepts `from_category`, `to_category`, `amount`, optional `month`; resolves both category names (treating `"Ready to Assign"` as special); performs two `update_category_budget` calls; warns if source will go negative

## 7. Polish & Setup Docs

- [x] 7.1 Create `README.md` with setup instructions: install deps, get YNAB token, configure `.env`, add to `claude_desktop_config.json`, restart Claude Desktop
- [x] 7.2 Add the `claude_desktop_config.json` snippet to README showing correct `command`/`args`/`env` shape
- [x] 7.3 Run `npm run build` and verify `dist/index.js` is produced with no TypeScript errors
