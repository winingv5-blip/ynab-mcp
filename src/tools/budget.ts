import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ynabAPI,
  DEFAULT_BUDGET_ID,
  fromMilliunits,
  toMilliunits,
  resolveCategoryId,
} from "../client.js";

const READY_TO_ASSIGN = "Ready to Assign";

function currentMonthStr(): string {
  return new Date().toISOString().slice(0, 7) + "-01";
}

export function registerBudgetTools(server: McpServer): void {
  server.tool(
    "get_categories",
    "List all budget categories with their current month amounts (budgeted, activity, balance)",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
    },
    async ({ budget_id }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const { data } = await ynabAPI.categories.getCategories(bid);
        const result = data.category_groups
          .filter((g) => !g.deleted && !g.hidden && g.name !== "Internal Master Category")
          .map((g) => ({
            group: g.name,
            categories: g.categories
              .filter((c) => !c.deleted && !c.hidden)
              .map((c) => ({
                id: c.id,
                name: c.name,
                budgeted: fromMilliunits(c.budgeted),
                activity: fromMilliunits(c.activity),
                balance: fromMilliunits(c.balance),
              })),
          }));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.tool(
    "get_month_summary",
    "Get a monthly budget summary: income, budgeted, activity, ready to assign, age of money",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      month: z
        .string()
        .optional()
        .describe("Month as YYYY-MM-DD (default: current month)"),
    },
    async ({ budget_id, month }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const monthStr = month ?? currentMonthStr();
        const { data } = await ynabAPI.months.getBudgetMonth(bid, monthStr);
        const m = data.month;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  month: m.month,
                  income: fromMilliunits(m.income),
                  budgeted: fromMilliunits(m.budgeted),
                  activity: fromMilliunits(m.activity),
                  to_be_budgeted: fromMilliunits(m.to_be_budgeted),
                  age_of_money: m.age_of_money,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.tool(
    "update_category_budget",
    "Set the budgeted amount for a named category in a given month",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      category_name: z.string().describe("Category name"),
      amount: z.number().describe("New budgeted amount in dollars"),
      month: z
        .string()
        .optional()
        .describe("Month as YYYY-MM-DD (default: current month)"),
    },
    async ({ budget_id, category_name, amount, month }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const monthStr = month ?? currentMonthStr();
        const categoryId = await resolveCategoryId(bid, category_name);

        const { data } = await ynabAPI.categories.updateMonthCategory(bid, monthStr, categoryId, {
          category: { budgeted: toMilliunits(amount) },
        });

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  category: data.category.name,
                  budgeted: fromMilliunits(data.category.budgeted),
                  balance: fromMilliunits(data.category.balance),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.tool(
    "move_money",
    `Move budget money between categories. Use "${READY_TO_ASSIGN}" as a category name to assign from or return money to unbudgeted funds.`,
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      from_category: z
        .string()
        .describe(`Source category name, or "${READY_TO_ASSIGN}"`),
      to_category: z
        .string()
        .describe(`Destination category name, or "${READY_TO_ASSIGN}"`),
      amount: z.number().describe("Amount to move in dollars (positive number)"),
      month: z
        .string()
        .optional()
        .describe("Month as YYYY-MM-DD (default: current month)"),
    },
    async ({ budget_id, from_category, to_category, amount, month }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const monthStr = month ?? currentMonthStr();
        const messages: string[] = [];

        if (from_category !== READY_TO_ASSIGN) {
          const fromId = await resolveCategoryId(bid, from_category);
          const { data: fromData } = await ynabAPI.categories.getMonthCategoryById(bid, monthStr, fromId);
          const currentBudgeted = fromMilliunits(fromData.category.budgeted);

          if (currentBudgeted < amount) {
            messages.push(
              `Warning: "${from_category}" will go negative (currently $${currentBudgeted.toFixed(2)}, moving $${amount.toFixed(2)}).`
            );
          }

          await ynabAPI.categories.updateMonthCategory(bid, monthStr, fromId, {
            category: { budgeted: toMilliunits(currentBudgeted - amount) },
          });
        }

        if (to_category !== READY_TO_ASSIGN) {
          const toId = await resolveCategoryId(bid, to_category);
          const { data: toData } = await ynabAPI.categories.getMonthCategoryById(bid, monthStr, toId);
          const currentBudgeted = fromMilliunits(toData.category.budgeted);

          await ynabAPI.categories.updateMonthCategory(bid, monthStr, toId, {
            category: { budgeted: toMilliunits(currentBudgeted + amount) },
          });
        }

        messages.unshift(
          `Moved $${amount.toFixed(2)} from "${from_category}" to "${to_category}".`
        );
        return { content: [{ type: "text" as const, text: messages.join(" ") }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );
}
