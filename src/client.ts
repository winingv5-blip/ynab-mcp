import * as ynab from "ynab";
import "dotenv/config";

const token = process.env.YNAB_API_TOKEN;
if (!token) {
  console.error("Error: YNAB_API_TOKEN environment variable is not set.");
  process.exit(1);
}

export const ynabAPI = new ynab.API(token);
export const DEFAULT_BUDGET_ID = "last-used";

export const toMilliunits = (dollars: number): number => Math.round(dollars * 1000);
export const fromMilliunits = (milliunits: number): number => milliunits / 1000;

export async function resolveAccountId(budgetId: string, accountName: string): Promise<string> {
  const { data } = await ynabAPI.accounts.getAccounts(budgetId);
  const account = data.accounts.find(
    (a) => !a.deleted && a.name.toLowerCase() === accountName.toLowerCase()
  );
  if (!account) {
    const names = data.accounts
      .filter((a) => !a.deleted)
      .map((a) => a.name)
      .join(", ");
    throw new Error(`Account "${accountName}" not found. Available: ${names}`);
  }
  return account.id;
}

export async function resolveCategoryId(budgetId: string, categoryName: string): Promise<string> {
  const { data } = await ynabAPI.categories.getCategories(budgetId);
  const all = data.category_groups
    .flatMap((g) => g.categories)
    .filter((c) => !c.deleted && !c.hidden);
  const category = all.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (!category) {
    const names = all.map((c) => c.name).join(", ");
    throw new Error(`Category "${categoryName}" not found. Available: ${names}`);
  }
  return category.id;
}
