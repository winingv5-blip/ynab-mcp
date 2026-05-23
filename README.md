# ynab-mcp

A Model Context Protocol server that gives Claude full read/write access to your YNAB budget.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Get your YNAB API token

1. Log in to YNAB
2. Go to **Account Settings → Developer Settings**
3. Click **New Token** and copy it

### 3. Configure your token

```bash
cp .env.example .env
# Edit .env and replace your_token_here with your actual token
```

### 4. Build

```bash
npm run build
```

### 5. Configure Claude Desktop

Add the following to your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ynab": {
      "command": "node",
      "args": ["/absolute/path/to/ynab-mcp/dist/index.js"],
      "env": {
        "YNAB_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

Replace `/absolute/path/to/ynab-mcp` with the actual path to this directory.

### 6. Restart Claude Desktop

The YNAB tools will appear in Claude's tool list.

---

## Available Tools

| Tool | Description |
|---|---|
| `get_budgets` | List all budgets |
| `get_accounts` | List accounts with balances |
| `get_transactions` | Get transactions (filter by date, account, category, approval) |
| `create_transaction` | Create a transaction (simple or split) |
| `update_transaction` | Update memo, category, flag, approved, cleared |
| `approve_transactions` | Bulk approve unapproved transactions |
| `delete_transaction` | Delete a transaction |
| `get_scheduled_transactions` | List all recurring transactions |
| `create_scheduled_transaction` | Set up a new recurring transaction |
| `update_scheduled_transaction` | Update amount, date, frequency, etc. |
| `delete_scheduled_transaction` | Cancel a recurring transaction |
| `get_categories` | List all categories with budgeted/activity/balance |
| `get_month_summary` | Monthly income, spending, and ready-to-assign totals |
| `update_category_budget` | Set a category's budgeted amount |
| `move_money` | Move money between categories (or to/from Ready to Assign) |

## Notes

- All amounts are in **dollars** — no milliunits.
- Budget selection defaults to your **last-used budget**. Pass `budget_id` to target a specific one.
- YNAB API rate limit: 200 requests/hour (fine for conversational use).
- The YNAB API token is stored in `.env` (never commit this file).
