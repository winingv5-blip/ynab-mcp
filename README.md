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
| `get_month_summary` | Monthly income, budgeted, activity, and ready-to-assign totals |
| `update_category_budget` | Set a category's budgeted amount |
| `move_money` | Move money between categories (or to/from Ready to Assign) |

## Notes

- All amounts are in **dollars** — no milliunits.
- Budget selection defaults to your **last-used budget**. Pass `budget_id` to target a specific one.
- YNAB API rate limit: 200 requests/hour (fine for conversational use).
- The YNAB API token is stored in `.env` (never commit this file).

---

## Prompt Ideas

Example prompts you can use with Claude once this MCP server is connected.

### Budget Overview & Health Checks

- "Give me a snapshot of my budget this month — income, spending, and what's left to assign."
- "Which categories am I over budget on this month?"
- "How much do I have left to spend on groceries, dining, and entertainment combined?"
- "What's my net worth across all my accounts?"

### Spending Analysis

- "Show me my top 10 biggest expenses this month."
- "How much did I spend on subscriptions in the last 30 days?"
- "Compare my dining spending this month vs. last month."
- "What did I spend money on last weekend? (Fri–Sun)"
- "Find any transactions over $100 that aren't approved yet."

### Transaction Management

- "I just bought groceries for $47.83 at Kroger — log it to my Groceries category."
- "Add a split transaction: $120 from Target — $80 household, $40 clothing."
- "Approve all unapproved transactions from the last 7 days."
- "Add a memo to my last Amazon transaction saying 'office supplies'."
- "Delete that coffee shop charge from yesterday, it was a duplicate."

### Recurring / Scheduled Transactions

- "What bills are coming up in the next 2 weeks?"
- "Set up a recurring $15/month Netflix charge starting June 1st."
- "My gym membership went up to $35 — update the scheduled transaction."
- "Cancel the scheduled transaction for my old streaming service."

### Budget Adjustments

- "Move $50 from Dining Out to Groceries."
- "I have $200 ready to assign — spread it across my savings goals."
- "Zero out my Clothing category and move the balance to Ready to Assign."
- "Set my Vacation fund budget to $300 this month."

### Planning & Goal Tracking

- "Am I on track to stay under budget this month based on my spending so far?"
- "How much should I budget per week for the rest of the month to not overspend?"
- "Which categories have money left that I probably won't use this month?"
- "What recurring expenses do I have, and what's my fixed cost baseline each month?"
