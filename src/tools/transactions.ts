import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  ynabAPI,
  DEFAULT_BUDGET_ID,
  fromMilliunits,
  toMilliunits,
  resolveAccountId,
  resolveCategoryId,
} from "../client.js";

const FLAG_COLOR = ["red", "orange", "yellow", "green", "blue", "purple"] as const;
const CLEARED = ["cleared", "uncleared", "reconciled"] as const;

export function registerTransactionTools(server: McpServer): void {
  // Helper: resolve optional account/category names to IDs for filtering
  async function resolveOptionalAccountId(
    budgetId: string,
    accountName: string | undefined
  ): Promise<string | undefined> {
    return accountName ? resolveAccountId(budgetId, accountName) : undefined;
  }

  async function resolveOptionalCategoryId(
    budgetId: string,
    categoryName: string | undefined
  ): Promise<string | undefined> {
    return categoryName ? resolveCategoryId(budgetId, categoryName) : undefined;
  }

  server.tool(
    "get_transactions",
    "Get transactions with optional filters for date, account, category, or approval status",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      since_date: z.string().optional().describe("Return transactions on or after this date (YYYY-MM-DD)"),
      account_name: z.string().optional().describe("Filter by account name"),
      category_name: z.string().optional().describe("Filter by category name"),
      unapproved_only: z.boolean().optional().describe("Return only unapproved transactions"),
    },
    async ({ budget_id, since_date, account_name, category_name, unapproved_only }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const accountId = await resolveOptionalAccountId(bid, account_name);
        const categoryId = await resolveOptionalCategoryId(bid, category_name);

        let transactions;
        if (accountId) {
          const { data } = await ynabAPI.transactions.getTransactionsByAccount(bid, accountId, since_date);
          transactions = data.transactions;
        } else if (categoryId) {
          const { data } = await ynabAPI.transactions.getTransactionsByCategory(bid, categoryId, since_date);
          transactions = data.transactions;
        } else {
          const { data } = await ynabAPI.transactions.getTransactions(bid, since_date);
          transactions = data.transactions;
        }

        // Apply any in-memory filters not handled by the API endpoint
        if (accountId && categoryId) {
          transactions = transactions.filter((t) => t.category_id === categoryId);
        }
        if (unapproved_only) {
          transactions = transactions.filter((t) => !t.approved);
        }

        const result = transactions
          .filter((t) => !t.deleted)
          .map((t) => ({
            id: t.id,
            date: t.date,
            amount: fromMilliunits(t.amount),
            memo: t.memo,
            cleared: t.cleared,
            approved: t.approved,
            flag_color: t.flag_color,
            account_name: t.account_name,
            category_name: t.category_name,
            payee_name: t.payee_name,
          }));

        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.tool(
    "create_transaction",
    "Create a new transaction. Provide subtransactions to create a split transaction.",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      account_name: z.string().describe("Account name"),
      date: z.string().describe("Transaction date (YYYY-MM-DD)"),
      amount: z.number().describe("Amount in dollars (negative for spending/outflow, positive for income/inflow)"),
      payee_name: z.string().optional().describe("Payee name"),
      category_name: z.string().optional().describe("Category name (omit for split transactions)"),
      memo: z.string().optional().describe("Memo"),
      flag_color: z.enum(FLAG_COLOR).optional().describe("Flag color"),
      approved: z.boolean().optional().describe("Mark as approved (default: true)"),
      subtransactions: z
        .array(
          z.object({
            amount: z.number().describe("Amount in dollars"),
            category_name: z.string().optional().describe("Category name"),
            memo: z.string().optional().describe("Memo"),
            payee_name: z.string().optional().describe("Payee name"),
          })
        )
        .optional()
        .describe("Subtransactions for split transactions (amounts must sum to parent amount)"),
    },
    async ({ budget_id, account_name, date, amount, payee_name, category_name, memo, flag_color, approved, subtransactions }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;

        if (subtransactions && subtransactions.length > 0) {
          const subTotal = subtransactions.reduce((sum, s) => sum + toMilliunits(s.amount), 0);
          if (toMilliunits(amount) !== subTotal) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Split validation error: subtransaction amounts (${ subtransactions.reduce((s, t) => s + t.amount, 0)}) must sum to parent amount (${amount}).`,
                },
              ],
              isError: true,
            };
          }
        }

        const accountId = await resolveAccountId(bid, account_name);
        const categoryId =
          category_name && !subtransactions ? await resolveCategoryId(bid, category_name) : undefined;

        const resolvedSubs = subtransactions
          ? await Promise.all(
              subtransactions.map(async (s) => ({
                amount: toMilliunits(s.amount),
                category_id: s.category_name ? await resolveCategoryId(bid, s.category_name) : undefined,
                memo: s.memo ?? undefined,
                payee_name: s.payee_name ?? undefined,
              }))
            )
          : undefined;

        const { data } = await ynabAPI.transactions.createTransaction(bid, {
          transaction: {
            account_id: accountId,
            date,
            amount: toMilliunits(amount),
            payee_name: payee_name ?? undefined,
            category_id: categoryId,
            memo: memo ?? undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            flag_color: (flag_color as any) ?? undefined,
            approved: approved ?? true,
            subtransactions: resolvedSubs,
          },
        });

        const t = data.transaction;
        if (!t) {
          return {
            content: [{ type: "text" as const, text: `Transaction created. IDs: ${data.transaction_ids.join(", ")}` }],
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                { id: t.id, date: t.date, amount: fromMilliunits(t.amount), payee_name: t.payee_name },
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
    "update_transaction",
    "Update fields of an existing transaction by ID",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      id: z.string().describe("Transaction ID"),
      memo: z.string().optional().describe("New memo"),
      category_name: z.string().optional().describe("New category name"),
      flag_color: z.enum(FLAG_COLOR).optional().describe("New flag color"),
      approved: z.boolean().optional().describe("Set approved status"),
      cleared: z.enum(CLEARED).optional().describe("Set cleared status"),
    },
    async ({ budget_id, id, memo, category_name, flag_color, approved, cleared }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const { data: current } = await ynabAPI.transactions.getTransactionById(bid, id);
        const t = current.transaction;

        const categoryId = category_name
          ? await resolveCategoryId(bid, category_name)
          : (t.category_id ?? undefined);

        if (category_name && t.subtransactions && t.subtransactions.length > 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Cannot change category on a split transaction. Delete and recreate the transaction to modify splits.",
              },
            ],
            isError: true,
          };
        }

        const { data } = await ynabAPI.transactions.updateTransaction(bid, id, {
          transaction: {
            account_id: t.account_id,
            date: t.date,
            amount: t.amount,
            payee_id: t.payee_id ?? undefined,
            category_id: categoryId,
            memo: memo ?? t.memo ?? undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cleared: (cleared ?? t.cleared) as any,
            approved: approved ?? t.approved,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            flag_color: (flag_color ?? t.flag_color ?? undefined) as any,
            subtransactions: t.subtransactions
              ?.filter((s) => !s.deleted)
              .map((s) => ({
                amount: s.amount,
                payee_id: s.payee_id ?? undefined,
                category_id: s.category_id ?? undefined,
                memo: s.memo ?? undefined,
              })),
          },
        });

        const u = data.transaction;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: u.id,
                  date: u.date,
                  amount: fromMilliunits(u.amount),
                  memo: u.memo,
                  category_name: u.category_name,
                  approved: u.approved,
                  cleared: u.cleared,
                  flag_color: u.flag_color,
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
    "approve_transactions",
    "Bulk approve all unapproved transactions, optionally filtered by account",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      account_name: z.string().optional().describe("Only approve transactions in this account"),
    },
    async ({ budget_id, account_name }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;

        let transactions;
        if (account_name) {
          const accountId = await resolveAccountId(bid, account_name);
          const { data } = await ynabAPI.transactions.getTransactionsByAccount(bid, accountId);
          transactions = data.transactions;
        } else {
          const { data } = await ynabAPI.transactions.getTransactions(bid);
          transactions = data.transactions;
        }

        const unapproved = transactions.filter((t) => !t.approved && !t.deleted);
        if (unapproved.length === 0) {
          return { content: [{ type: "text" as const, text: "No unapproved transactions found." }] };
        }

        await ynabAPI.transactions.updateTransactions(bid, {
          transactions: unapproved.map((t) => ({
            id: t.id,
            account_id: t.account_id,
            date: t.date,
            amount: t.amount,
            approved: true,
          })),
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `Approved ${unapproved.length} transaction${unapproved.length === 1 ? "" : "s"}.`,
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
    "delete_transaction",
    "Delete a transaction by ID",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      id: z.string().describe("Transaction ID to delete"),
    },
    async ({ budget_id, id }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        await ynabAPI.transactions.deleteTransaction(bid, id);
        return { content: [{ type: "text" as const, text: `Transaction ${id} deleted.` }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );
}
