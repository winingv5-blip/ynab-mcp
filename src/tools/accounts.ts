import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ynabAPI, DEFAULT_BUDGET_ID, fromMilliunits } from "../client.js";

export function registerAccountTools(server: McpServer): void {
  server.tool(
    "get_budgets",
    "List all YNAB budgets accessible with this API token",
    {},
    async () => {
      try {
        const { data } = await ynabAPI.budgets.getBudgets();
        const budgets = data.budgets.map((b) => ({
          id: b.id,
          name: b.name,
          last_modified_on: b.last_modified_on,
        }));
        return { content: [{ type: "text" as const, text: JSON.stringify(budgets, null, 2) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.tool(
    "get_accounts",
    "List all accounts in a budget with their current balances",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used budget)"),
      include_closed: z.boolean().optional().describe("Include closed accounts (default: false)"),
    },
    async ({ budget_id, include_closed }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const { data } = await ynabAPI.accounts.getAccounts(bid);
        let accounts = data.accounts.filter((a) => !a.deleted);
        if (!include_closed) {
          accounts = accounts.filter((a) => !a.closed);
        }
        const result = accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          balance: fromMilliunits(a.balance),
          cleared_balance: fromMilliunits(a.cleared_balance),
          on_budget: a.on_budget,
          closed: a.closed,
        }));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );
}
