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

const FREQUENCY = [
  "never",
  "daily",
  "weekly",
  "everyOtherWeek",
  "twiceAMonth",
  "every4Weeks",
  "monthly",
  "everyOtherMonth",
  "every3Months",
  "every4Months",
  "twiceAYear",
  "yearly",
  "everyOtherYear",
] as const;

const FREQUENCY_LABELS: Record<string, string> = {
  never: "Never",
  daily: "Daily",
  weekly: "Weekly",
  everyOtherWeek: "Every other week",
  twiceAMonth: "Twice a month",
  every4Weeks: "Every 4 weeks",
  monthly: "Monthly",
  everyOtherMonth: "Every other month",
  every3Months: "Every 3 months",
  every4Months: "Every 4 months",
  twiceAYear: "Twice a year",
  yearly: "Yearly",
  everyOtherYear: "Every other year",
};

export function registerScheduledTools(server: McpServer): void {
  server.tool(
    "get_scheduled_transactions",
    "List all scheduled (recurring) transactions",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
    },
    async ({ budget_id }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const { data } = await ynabAPI.scheduledTransactions.getScheduledTransactions(bid);
        const result = data.scheduled_transactions
          .filter((t) => !t.deleted)
          .map((t) => ({
            id: t.id,
            date_next: t.date_next,
            frequency: FREQUENCY_LABELS[t.frequency] ?? t.frequency,
            amount: fromMilliunits(t.amount),
            account_name: t.account_name,
            category_name: t.category_name,
            payee_name: t.payee_name,
            memo: t.memo,
          }));
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );

  server.tool(
    "create_scheduled_transaction",
    "Create a new scheduled (recurring) transaction",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      account_name: z.string().describe("Account name"),
      date_first: z.string().describe("First occurrence date (YYYY-MM-DD)"),
      frequency: z.enum(FREQUENCY).describe(
        "Recurrence frequency: never, daily, weekly, every_other_week, twice_a_month, every_4_weeks, monthly, every_3_months, every_6_months, yearly"
      ),
      amount: z
        .number()
        .describe("Amount in dollars (negative for spending/outflow, positive for income/inflow)"),
      payee_name: z.string().describe("Payee name"),
      category_name: z.string().optional().describe("Category name"),
      memo: z.string().optional().describe("Memo"),
    },
    async ({ budget_id, account_name, date_first, frequency, amount, payee_name, category_name, memo }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const accountId = await resolveAccountId(bid, account_name);
        const categoryId = category_name ? await resolveCategoryId(bid, category_name) : undefined;

        const { data } = await ynabAPI.scheduledTransactions.createScheduledTransaction(bid, {
          scheduled_transaction: {
            account_id: accountId,
            date: date_first,
            frequency,
            amount: toMilliunits(amount),
            payee_name,
            category_id: categoryId,
            memo: memo ?? undefined,
          },
        });

        const st = data.scheduled_transaction;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: st.id,
                  date_next: st.date_next,
                  frequency: FREQUENCY_LABELS[st.frequency] ?? st.frequency,
                  amount: fromMilliunits(st.amount),
                  payee_name: st.payee_name,
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
    "update_scheduled_transaction",
    "Update an existing scheduled transaction by ID",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      id: z.string().describe("Scheduled transaction ID"),
      amount: z.number().optional().describe("New amount in dollars"),
      date_next: z
        .string()
        .optional()
        .describe("New next occurrence date (YYYY-MM-DD) — reschedules the transaction"),
      frequency: z.enum(FREQUENCY).optional().describe("New recurrence frequency"),
      memo: z.string().optional().describe("New memo"),
      category_name: z.string().optional().describe("New category name"),
      payee_name: z.string().optional().describe("New payee name"),
    },
    async ({ budget_id, id, amount, date_next, frequency, memo, category_name, payee_name }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        const { data: current } = await ynabAPI.scheduledTransactions.getScheduledTransactionById(bid, id);
        const st = current.scheduled_transaction;

        const categoryId = category_name
          ? await resolveCategoryId(bid, category_name)
          : (st.category_id ?? undefined);

        const { data } = await ynabAPI.scheduledTransactions.updateScheduledTransaction(bid, id, {
          scheduled_transaction: {
            account_id: st.account_id,
            date: date_next ?? st.date_next,
            frequency: frequency ?? st.frequency,
            amount: amount !== undefined ? toMilliunits(amount) : st.amount,
            payee_name: payee_name ?? st.payee_name ?? undefined,
            category_id: categoryId,
            memo: memo ?? st.memo ?? undefined,
          },
        });

        const updated = data.scheduled_transaction;
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  id: updated.id,
                  date_next: updated.date_next,
                  frequency: FREQUENCY_LABELS[updated.frequency] ?? updated.frequency,
                  amount: fromMilliunits(updated.amount),
                  payee_name: updated.payee_name,
                  category_name: updated.category_name,
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
    "delete_scheduled_transaction",
    "Cancel/delete a scheduled transaction by ID. Use dry_run: true to preview what would be deleted without committing.",
    {
      budget_id: z.string().optional().describe("Budget ID (default: last-used)"),
      id: z.string().describe("Scheduled transaction ID to delete"),
      dry_run: z.boolean().optional().describe("Preview the deletion without actually deleting (default: false)"),
    },
    async ({ budget_id, id, dry_run }) => {
      try {
        const bid = budget_id ?? DEFAULT_BUDGET_ID;
        if (dry_run) {
          const { data } = await ynabAPI.scheduledTransactions.getScheduledTransactionById(bid, id);
          const st = data.scheduled_transaction;
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                dry_run: true,
                id: st.id,
                date_next: st.date_next,
                frequency: FREQUENCY_LABELS[st.frequency] ?? st.frequency,
                amount: fromMilliunits(st.amount),
                payee_name: st.payee_name,
                account_name: st.account_name,
                category_name: st.category_name,
              }, null, 2),
            }],
          };
        }
        await ynabAPI.scheduledTransactions.deleteScheduledTransaction(bid, id);
        return { content: [{ type: "text" as const, text: `Scheduled transaction ${id} deleted.` }] };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
      }
    }
  );
}
